"""Authentication routes backed by MongoDB users collection."""
from __future__ import annotations

from datetime import datetime, timezone
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError

from src.adapters.db.mongo.client import get_database
from src.api.schemas.auth import (
    AuthResponse,
    OpdWeeklyDay,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserResponse,
    UserRoleUpdateRequest,
)
from src.core.auth import create_access_token, create_refresh_token, hash_password, verify_token, verify_password
from src.core.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

DOCTOR_ID_RE = re.compile(r"^DOC(\d{3})$")
_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_WEEKLY_DAY_KEYS = frozenset(
    {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
)


def _user_lookup_filter(user_doc: dict) -> dict:
    """Match the user row for Mongo updates — tolerate legacy docs missing `id` if `email` is present."""
    uid = str(user_doc.get("id") or "").strip()
    if uid:
        return {"id": uid}
    email = str(user_doc.get("email") or "").strip()
    if email:
        return {"email": email}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="User record is missing both id and email; cannot update this profile.",
    )


def _scalar_str_opt(value: object) -> str | None:
    """Coerce Mongo / Compass values into optional plain strings for API models."""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return None
    text = value.strip() if isinstance(value, str) else str(value).strip()
    return text or None


def _opd_time_str_opt(value: object) -> str | None:
    """Normalize OPD clock fields to HH:MM or None (avoids UserResponse validation 500 on odd BSON types)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    text = str(value).strip()
    return text if _HHMM_RE.match(text) else None


def _bounded_optional_str(value: object, max_len: int) -> str | None:
    s = _scalar_str_opt(value)
    if s is None:
        return None
    return s if len(s) <= max_len else s[:max_len]


def _bounded_required_str(value: object, max_len: int, *, default: str = "") -> str:
    s = _scalar_str_opt(value)
    if not s:
        return default
    return s if len(s) <= max_len else s[:max_len]


def _soften_opd_weekly_row(item: dict) -> dict:
    """Coerce Mongo/Compass drift so OpdWeeklyDay.model_validate rarely fails."""
    day_raw = item.get("day")
    day = str(day_raw or "").strip().lower()
    cleaned: dict[str, object] = {"day": day}
    for bool_key in ("closed", "evening_enabled"):
        raw = item.get(bool_key)
        if isinstance(raw, bool):
            cleaned[bool_key] = raw
        elif isinstance(raw, (int, float)):
            cleaned[bool_key] = bool(int(raw))
        elif isinstance(raw, str):
            cleaned[bool_key] = raw.strip().lower() in ("true", "1", "yes", "y")
        else:
            cleaned[bool_key] = False
    for str_key in ("morning_start", "morning_end", "evening_start", "evening_end"):
        raw = item.get(str_key)
        if raw is None:
            cleaned[str_key] = None
        elif isinstance(raw, datetime):
            cleaned[str_key] = raw.strftime("%H:%M")
        elif isinstance(raw, (dict, list, bytes)):
            cleaned[str_key] = None
        else:
            s = str(raw).strip()
            cleaned[str_key] = s or None
    return cleaned


def _next_doctor_id(db) -> str:
    max_num = 0
    for row in db.users.find({"doctor_id": {"$regex": r"^DOC\d{3}$"}}, {"_id": 0, "doctor_id": 1}):
        raw = str(row.get("doctor_id") or "").strip().upper()
        m = DOCTOR_ID_RE.match(raw)
        if not m:
            continue
        max_num = max(max_num, int(m.group(1)))
    next_num = max_num + 1
    if next_num > 999:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Doctor ID pool exhausted",
        )
    return f"DOC{next_num:03d}"


def _ensure_doctor_id(db, user_doc: dict) -> dict:
    """Ensure doctors have a persistent DOCXXX id generated once."""
    role = str(user_doc.get("role") or "").strip().lower()
    existing = str(user_doc.get("doctor_id") or "").strip().upper()
    if role != "doctor":
        return user_doc
    if DOCTOR_ID_RE.match(existing):
        return user_doc
    doctor_id = _next_doctor_id(db)
    flt = _user_lookup_filter(user_doc)
    db.users.update_one(
        flt,
        {"$set": {"doctor_id": doctor_id, "updated_at": datetime.now(timezone.utc)}},
    )
    refreshed = db.users.find_one(flt)
    return refreshed or user_doc


def _first_nonempty_str(doc: dict, *keys: str) -> str:
    for key in keys:
        raw = doc.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text:
            return text
    return ""


def _normalize_user_doc_for_api(user_doc: dict) -> dict:
    """
    Map common Compass / legacy field names onto the canonical keys the app expects.

    Providers often edit `users` documents with labels like "name" or "phone_number"
    that do not match `full_name` / `phone`, which makes the settings UI look empty.
    """
    merged = dict(user_doc)
    if not _first_nonempty_str(merged, "full_name"):
        for alt in ("display_name", "name", "fullName", "doctor_name", "provider_name"):
            if _first_nonempty_str(merged, alt):
                merged["full_name"] = _first_nonempty_str(merged, alt)
                break
    if not _first_nonempty_str(merged, "phone"):
        for alt in ("phone_number", "mobile", "whatsapp_number", "contact_phone"):
            if _first_nonempty_str(merged, alt):
                merged["phone"] = _first_nonempty_str(merged, alt)
                break
    if not _first_nonempty_str(merged, "job_title"):
        for alt in ("specialization", "title", "clinical_title", "designation", "speciality", "specialty"):
            if _first_nonempty_str(merged, alt):
                merged["job_title"] = _first_nonempty_str(merged, alt)
                break
    if not _first_nonempty_str(merged, "medical_license_number"):
        for alt in (
            "medical_registration",
            "license_number",
            "registration_number",
            "medical_license",
            "nmc_number",
            "registration_no",
            "license_no",
        ):
            if _first_nonempty_str(merged, alt):
                merged["medical_license_number"] = _first_nonempty_str(merged, alt)
                break
    if not _first_nonempty_str(merged, "avatar_url"):
        for alt in ("profile_image_url", "photo_url", "image_url", "picture", "profile_photo_url", "portrait_url"):
            if _first_nonempty_str(merged, alt):
                merged["avatar_url"] = _first_nonempty_str(merged, alt)
                break
    if not _first_nonempty_str(merged, "email"):
        for alt in ("email_address", "user_email"):
            if _first_nonempty_str(merged, alt):
                merged["email"] = _first_nonempty_str(merged, alt)
                break
    return merged


def _weekly_schedule_to_mongo(rows: list[OpdWeeklyDay]) -> list[dict]:
    if len(rows) != 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="opd_weekly_schedule must contain exactly 7 days",
        )
    seen = {r.day for r in rows}
    if seen != _WEEKLY_DAY_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="opd_weekly_schedule must include each weekday once",
        )
    out: list[dict] = []
    for r in rows:
        ms = str(r.morning_start or "").strip()
        me = str(r.morning_end or "").strip()
        if not r.closed:
            if not _HHMM_RE.match(ms) or not _HHMM_RE.match(me):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Morning shift requires valid HH:MM (24h) start and end when the day is open",
                )
        es = str(r.evening_start or "").strip() if r.evening_enabled else ""
        ee = str(r.evening_end or "").strip() if r.evening_enabled else ""
        if r.evening_enabled:
            if not _HHMM_RE.match(es) or not _HHMM_RE.match(ee):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Evening shift requires valid HH:MM (24h) start and end when enabled",
                )
        out.append(
            {
                "day": r.day,
                "closed": bool(r.closed),
                "morning_start": ms if ms else None,
                "morning_end": me if me else None,
                "evening_enabled": bool(r.evening_enabled),
                "evening_start": es if r.evening_enabled else None,
                "evening_end": ee if r.evening_enabled else None,
            }
        )
    return out


def _weekly_from_doc(doc: dict) -> list[OpdWeeklyDay] | None:
    raw = doc.get("opd_weekly_schedule")
    if not isinstance(raw, list) or len(raw) != 7:
        return None
    out: list[OpdWeeklyDay] = []
    for item in raw:
        if not isinstance(item, dict):
            return None
        soft = _soften_opd_weekly_row(item)
        try:
            out.append(OpdWeeklyDay.model_validate(soft))
        except ValidationError:
            return None
    if {r.day for r in out} != _WEEKLY_DAY_KEYS:
        return None
    return out


def _as_user_response(user_doc: dict) -> UserResponse:
    doc = _normalize_user_doc_for_api(user_doc)
    weekly = _weekly_from_doc(doc)
    payload: dict = {
        "id": _bounded_required_str(doc.get("id"), 80),
        "doctor_id": _bounded_optional_str(doc.get("doctor_id"), 24),
        "email": _bounded_required_str(doc.get("email"), 254),
        "username": _bounded_required_str(doc.get("username"), 64),
        "full_name": _bounded_required_str(doc.get("full_name"), 120),
        "phone": _bounded_optional_str(doc.get("phone"), 30),
        "role": _bounded_required_str(doc.get("role"), 40, default="doctor"),
        "job_title": _bounded_optional_str(doc.get("job_title"), 160),
        "medical_license_number": _bounded_optional_str(doc.get("medical_license_number"), 80),
        "avatar_url": _bounded_optional_str(doc.get("avatar_url"), 2048),
        "is_active": bool(doc.get("is_active", True)),
        "is_verified": bool(doc.get("is_verified", True)),
        "tenant_id": _bounded_optional_str(doc.get("tenant_id"), 120),
        "opd_morning_start": _opd_time_str_opt(doc.get("opd_morning_start")),
        "opd_morning_end": _opd_time_str_opt(doc.get("opd_morning_end")),
        "opd_evening_enabled": bool(doc.get("opd_evening_enabled", False)),
        "opd_evening_start": _opd_time_str_opt(doc.get("opd_evening_start")),
        "opd_evening_end": _opd_time_str_opt(doc.get("opd_evening_end")),
        "opd_weekly_schedule": weekly,
    }
    try:
        return UserResponse.model_validate(payload)
    except ValidationError:
        payload["opd_weekly_schedule"] = None
        try:
            return UserResponse.model_validate(payload)
        except ValidationError:
            payload["avatar_url"] = None
            payload["job_title"] = None
            payload["medical_license_number"] = None
            payload["phone"] = None
            return UserResponse.model_validate(payload)


def _build_auth_response(user_doc: dict) -> AuthResponse:
    settings = get_settings()
    token_data = {
        "sub": str(user_doc["id"]),
        "email": str(user_doc["email"]),
        "role": str(user_doc.get("role") or "doctor"),
    }
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user_doc["id"])})
    return AuthResponse(
        user=_as_user_response(user_doc),
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
    )


def _get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = verify_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user_id = str(payload.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    db = get_database()
    user_doc = db.users.find_one({"id": user_id})
    if not user_doc:
        # Compass edits sometimes drift `id`; JWT still carries email from login.
        email = str(payload.get("email") or "").strip()
        if email:
            user_doc = db.users.find_one({"email": email})
    if not user_doc or not bool(user_doc.get("is_active", True)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user_doc


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest) -> AuthResponse:
    db = get_database()
    if db.users.find_one({"username": payload.username}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    if db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    now = datetime.now(timezone.utc)
    user_doc = {
        "id": str(uuid4()),
        "doctor_id": _next_doctor_id(db) if str(payload.role or "").strip().lower() == "doctor" else None,
        "email": payload.email,
        "username": payload.username,
        "hashed_password": hash_password(payload.password),
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": payload.role,
        "job_title": str(payload.job_title).strip() if payload.job_title else None,
        "medical_license_number": str(payload.medical_license_number).strip() if payload.medical_license_number else None,
        "opd_morning_start": payload.opd_morning_start,
        "opd_morning_end": payload.opd_morning_end,
        "opd_evening_enabled": bool(payload.opd_evening_enabled),
        "opd_evening_start": payload.opd_evening_start,
        "opd_evening_end": payload.opd_evening_end,
        "is_active": True,
        "is_verified": True,
        "tenant_id": None,
        "created_at": now,
        "updated_at": now,
    }
    db.users.insert_one(user_doc)
    return _build_auth_response(user_doc)


def _digits_only(s: str) -> str:
    return "".join(c for c in s if c.isdigit())


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLoginRequest) -> AuthResponse:
    db = get_database()
    ident = payload.username.strip()
    user_doc = db.users.find_one({"username": ident}) or db.users.find_one({"email": ident})
    if not user_doc:
        d = _digits_only(ident)
        if len(d) >= 10:
            tail = d[-10:]
            user_doc = db.users.find_one({"username": tail}) or db.users.find_one(
                {"email": f"{tail}@phone.medgenie.local"}
            )
            if not user_doc:
                user_doc = db.users.find_one({"phone": tail}) or db.users.find_one({"phone": f"91{tail}"})
    if not user_doc or not verify_password(payload.password, str(user_doc.get("hashed_password") or "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not bool(user_doc.get("is_active", True)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")
    user_doc = _ensure_doctor_id(db, user_doc)
    return _build_auth_response(user_doc)


@router.get("/me", response_model=UserResponse)
def me(current_user: dict = Depends(_get_current_user)) -> UserResponse:
    db = get_database()
    ensured = _ensure_doctor_id(db, current_user)
    return _as_user_response(ensured)


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    payload: UserProfileUpdateRequest,
    current_user: dict = Depends(_get_current_user),
) -> UserResponse:
    """Update editable fields on the authenticated user."""
    updates: dict = {}
    for key in (
        "full_name",
        "phone",
        "job_title",
        "medical_license_number",
        "avatar_url",
        "opd_morning_start",
        "opd_morning_end",
        "opd_evening_start",
        "opd_evening_end",
    ):
        val = getattr(payload, key)
        if val is None:
            continue
        cleaned = val.strip() if isinstance(val, str) else val
        if key == "full_name" and cleaned == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="full_name cannot be empty",
            )
        if key != "full_name" and isinstance(cleaned, str) and cleaned == "":
            updates[key] = None  # clear optional strings in MongoDB
        else:
            updates[key] = cleaned
    if payload.opd_evening_enabled is not None:
        updates["opd_evening_enabled"] = bool(payload.opd_evening_enabled)
        if not payload.opd_evening_enabled:
            updates["opd_evening_start"] = None
            updates["opd_evening_end"] = None

    if payload.opd_weekly_schedule is not None:
        updates["opd_weekly_schedule"] = _weekly_schedule_to_mongo(payload.opd_weekly_schedule)

    if payload.opd_evening_enabled is not None:
        updates["opd_evening_enabled"] = bool(payload.opd_evening_enabled)

    if not updates:
        return _as_user_response(current_user)

    db = get_database()
    updates["updated_at"] = datetime.now(timezone.utc)
    user_filter = _user_lookup_filter(current_user)
    db.users.update_one(user_filter, {"$set": updates})
    refreshed = db.users.find_one(user_filter)
    if not refreshed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _as_user_response(refreshed)


@router.post("/logout")
def logout(_: dict = Depends(_get_current_user)) -> dict:
    return {"message": "Successfully logged out"}


@router.get("/users", response_model=list[UserResponse])
def list_users(_: dict = Depends(_get_current_user)) -> list[UserResponse]:
    db = get_database()
    users = list(db.users.find({}, {"_id": 0}))
    return [_as_user_response(u) for u in users]


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: str, payload: UserRoleUpdateRequest, _: dict = Depends(_get_current_user)) -> UserResponse:
    db = get_database()
    existing = db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "role": payload.role,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    updated = db.users.find_one({"id": user_id})
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _as_user_response(updated)

