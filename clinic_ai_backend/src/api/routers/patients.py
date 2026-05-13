"""Patient routes module."""
import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from src.adapters.db.mongo.client import get_database
from src.api.deps import get_current_user
from src.api.tenant_scope import ensure_patient_owned_by_doctor, normalize_doctor_id
from src.application.services.intake_chat_service import ACTIVE_SESSION_STATUSES, IntakeChatService
from src.application.utils.india_phone import normalize_india_mobile_storage
from src.application.utils.patient_id_crypto import encode_patient_id, resolve_internal_patient_id
from src.domain.value_objects.patient_id import PatientId
from src.domain.value_objects.visit_id import VisitId
from src.api.schemas.patient import (
    CreateVisitFromPatientRequest,
    CreateVisitFromPatientResponse,
    PatientRegisterRequest,
    PatientRegisterResponse,
    PatientSummaryResponse,
    PatientUpdateRequest,
)

router = APIRouter(prefix="/api/patients", tags=["Patients"])
logger = logging.getLogger(__name__)
TERMINAL_VISIT_STATUSES = {"completed", "complete", "closed", "ended", "cancelled", "no_show"}
_INDEXES_READY = False

# Collections that store internal `patient_id` (deterministic key) and must move with identity edits.
_PATIENT_ID_COLLECTIONS = (
    "visits",
    "intake_sessions",
    "intake_logs",
    "pre_visit_summaries",
    "transcription_jobs",
    "clinical_notes",
    "follow_up_reminders",
    "audio_files",
    "ai_jobs",
    "follow_through_lab_records",
    "transcription_results",
)


def _resolve_internal_patient_key_for_doctor(db, *, name: str, phone_norm: str, doctor_id: str) -> str:
    """
    Canonical Mongo ``patient_id`` for this clinician + demographics.

    Prefer scoped ``PatientId.generate(..., doctor_id=...)``; reuse an existing **legacy**
    ``name_phone`` row only when it belongs to the same ``doctor_id`` (backward compatibility).
    """
    scoped = PatientId.generate(name, phone_norm, doctor_id=doctor_id)
    if db.patients.find_one({"patient_id": scoped}):
        return scoped
    legacy = PatientId.generate(name, phone_norm)
    legacy_doc = db.patients.find_one({"patient_id": legacy, "doctor_id": doctor_id})
    if legacy_doc:
        return legacy
    return scoped


def _sync_intake_sessions_to_number_excluding_active(db, patient_id: str, to_number: str, now: datetime) -> None:
    """Update stored WhatsApp destination for non-active intake rows (history / analytics)."""
    coll = getattr(db, "intake_sessions", None)
    if coll is None or not patient_id or not to_number:
        return
    coll.update_many(
        {"patient_id": patient_id, "status": {"$nin": list(ACTIVE_SESSION_STATUSES)}},
        {"$set": {"to_number": to_number, "updated_at": now}},
    )


def _resend_active_intake_after_phone_correction(db, patient_id: str, to_number: str) -> None:
    """Re-open WhatsApp intake on the corrected number while intake is still active.

    Must not pre-update ``to_number`` on active sessions: :meth:`IntakeChatService.start_intake`
    detects staff corrections by comparing the session's previous destination with the new number.
    """
    patient = db.patients.find_one({"patient_id": patient_id}) or {}
    language = str(patient.get("preferred_language") or "en")
    coll = getattr(db, "intake_sessions", None)
    if coll is None or not patient_id or not to_number:
        return
    seen_visits: set[str] = set()
    for sess in coll.find({"patient_id": patient_id, "status": {"$in": list(ACTIVE_SESSION_STATUSES)}}):
        visit_id = str(sess.get("visit_id") or "").strip()
        if not visit_id or visit_id in seen_visits:
            continue
        seen_visits.add(visit_id)
        try:
            IntakeChatService().start_intake(patient_id, visit_id, to_number, language)
        except Exception:
            logger.exception(
                "intake_resend_after_phone_edit_failed patient_id=%s visit_id=%s",
                patient_id,
                visit_id,
            )


def _align_intake_after_patient_phone_edit(db, patient_id: str, to_number: str, now: datetime) -> None:
    """Keep inactive intake rows in sync, then re-trigger Meta opening for active intakes."""
    _sync_intake_sessions_to_number_excluding_active(db, patient_id, to_number, now)
    _resend_active_intake_after_phone_correction(db, patient_id, to_number)


def _rewire_internal_patient_id(db, old_id: str, new_id: str) -> None:
    """Point all known dependent documents from old internal id to new."""
    if old_id == new_id:
        return
    for coll_name in _PATIENT_ID_COLLECTIONS:
        coll = getattr(db, coll_name, None)
        if coll is None:
            continue
        coll.update_many({"patient_id": old_id}, {"$set": {"patient_id": new_id}})


def _summarize_patient_record(db, record: dict) -> PatientSummaryResponse:
    """Build API summary from a Mongo patient document (internal `patient_id`)."""
    full_name = (record.get("name") or "").strip()
    name_parts = [part for part in full_name.split(" ") if part]
    first_name = name_parts[0] if name_parts else "Unknown"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    internal_patient_id = str(record.get("patient_id") or "")
    age = record.get("age")
    year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970
    estimated_dob = f"{year:04d}-01-01"
    opaque_patient_id = encode_patient_id(internal_patient_id) if internal_patient_id else ""
    visit = (
        db.visits.find_one({"patient_id": internal_patient_id}, sort=[("created_at", -1)])
        if internal_patient_id
        else None
    )
    latest_visit_id = (
        str((visit or {}).get("visit_id") or (visit or {}).get("id") or "").strip() or None
    )
    latest_visit_scheduled_start = (visit or {}).get("scheduled_start")
    return PatientSummaryResponse(
        id=opaque_patient_id,
        patient_id=opaque_patient_id,
        first_name=first_name,
        last_name=last_name,
        full_name=full_name or first_name,
        date_of_birth=str(record.get("date_of_birth") or estimated_dob),
        mrn=str(record.get("mrn") or internal_patient_id),
        age=record.get("age"),
        gender=str(record.get("gender") or "").strip() or None,
        phone_number=str(record.get("phone_number") or "").strip() or None,
        created_at=str(record.get("created_at") or "") or None,
        updated_at=str(record.get("updated_at") or "") or None,
        latest_visit_id=latest_visit_id,
        latest_visit_scheduled_start=latest_visit_scheduled_start,
    )


def _ensure_patient_indexes(db) -> None:
    global _INDEXES_READY
    if _INDEXES_READY:
        return
    try:
        db.patients.create_index([("patient_id", 1)], unique=True)
        db.patients.create_index([("doctor_id", 1)])
        db.patients.create_index([("updated_at", -1)])
        db.patients.create_index([("name", 1)])
        db.visits.create_index([("patient_id", 1), ("created_at", -1)])
    except Exception:
        return
    _INDEXES_READY = True


def _is_walk_in_visit_type(value: object) -> bool:
    s = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return s in {"walk_in", "walkin"} or "walk_in" in s or "walkin" in s


def _require_appointment_not_in_past(scheduled_start: str | None) -> None:
    """Reject stored appointment instants that are already in the past (naive ISO treated as UTC)."""
    if scheduled_start is None:
        return
    s = str(scheduled_start).strip()
    if not s:
        return
    try:
        if s.endswith("Z"):
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        else:
            dt = datetime.fromisoformat(s)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid appointment datetime") from exc
    earliest = datetime.now(timezone.utc) - timedelta(seconds=90)
    if dt < earliest:
        raise HTTPException(
            status_code=422,
            detail="Appointment cannot be in the past. Pick today or a future date and time.",
        )


def _find_reusable_active_visit(db, *, patient_id: str) -> dict | None:
    """Return most recent non-terminal visit for this patient, if any."""
    return db.visits.find_one(
        {
            "patient_id": patient_id,
            "status": {"$nin": list(TERMINAL_VISIT_STATUSES)},
        },
        sort=[("updated_at", -1), ("created_at", -1)],
    )


@router.get("", response_model=list[PatientSummaryResponse])
def list_patients(current_user: dict = Depends(get_current_user)) -> list[PatientSummaryResponse]:
    """Return normalized patient records for frontend patient picker."""
    doctor_id = normalize_doctor_id(current_user)
    db = get_database()
    _ensure_patient_indexes(db)
    records = list(
        db.patients.find(
            {"doctor_id": doctor_id},
            {
                "_id": 0,
                "patient_id": 1,
                "name": 1,
                "date_of_birth": 1,
                "mrn": 1,
                "age": 1,
                "gender": 1,
                "phone_number": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        ).sort("updated_at", -1)
    )
    patient_ids = [str(record.get("patient_id") or "").strip() for record in records if str(record.get("patient_id") or "").strip()]
    latest_visit_by_patient: dict[str, dict] = {}
    if patient_ids:
        for visit in db.visits.aggregate(
            [
                {"$match": {"patient_id": {"$in": patient_ids}}},
                {"$sort": {"created_at": -1}},
                {
                    "$group": {
                        "_id": "$patient_id",
                        "patient_id": {"$first": "$patient_id"},
                        "visit_id": {"$first": "$visit_id"},
                        "id": {"$first": "$id"},
                        "scheduled_start": {"$first": "$scheduled_start"},
                    }
                },
            ]
        ):
            pid = str(visit.get("patient_id") or "").strip()
            if pid and pid not in latest_visit_by_patient:
                latest_visit_by_patient[pid] = visit
    patients: list[PatientSummaryResponse] = []

    for record in records:
        full_name = (record.get("name") or "").strip()
        name_parts = [part for part in full_name.split(" ") if part]
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        internal_patient_id = str(record.get("patient_id") or "")
        age = record.get("age")
        year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970
        estimated_dob = f"{year:04d}-01-01"
        opaque_patient_id = encode_patient_id(internal_patient_id) if internal_patient_id else ""
        latest_visit = latest_visit_by_patient.get(internal_patient_id) if internal_patient_id else None
        latest_visit_id = (
            str((latest_visit or {}).get("visit_id") or (latest_visit or {}).get("id") or "").strip() or None
        )
        latest_visit_scheduled_start = (latest_visit or {}).get("scheduled_start")

        patients.append(
            PatientSummaryResponse(
                id=opaque_patient_id,
                patient_id=opaque_patient_id,
                first_name=first_name,
                last_name=last_name,
                full_name=full_name or first_name,
                date_of_birth=str(record.get("date_of_birth") or estimated_dob),
                mrn=str(record.get("mrn") or internal_patient_id),
                age=record.get("age"),
                gender=str(record.get("gender") or "").strip() or None,
                phone_number=str(record.get("phone_number") or "").strip() or None,
                created_at=str(record.get("created_at") or "") or None,
                updated_at=str(record.get("updated_at") or "") or None,
                latest_visit_id=latest_visit_id,
                latest_visit_scheduled_start=latest_visit_scheduled_start,
            )
        )

    return patients


@router.get("/paged")
def list_patients_paged(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    search: str | None = Query(default=None),
    sort: str = Query(default="created_newest"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Return paginated patient records with server-side filtering/sorting."""
    doctor_id = normalize_doctor_id(current_user)
    db = get_database()
    _ensure_patient_indexes(db)
    query: dict = {"doctor_id": doctor_id}
    search_value = str(search or "").strip()
    if search_value:
        escaped = re.escape(search_value)
        query = {"$and": [query, {"name": {"$regex": escaped, "$options": "i"}}]}

    total = int(db.patients.count_documents(query))
    skip = (page - 1) * page_size

    allowed_sorts = frozenset(
        {
            "created_newest",
            "created_oldest",
            "visit_latest",
            "visit_oldest",
            "name_az",
            "name_za",
            "id_az",
        }
    )
    sort_key = str(sort or "").strip()
    if sort_key not in allowed_sorts:
        sort_key = "created_newest"

    projection = {
        "_id": 0,
        "patient_id": 1,
        "name": 1,
        "date_of_birth": 1,
        "mrn": 1,
        "age": 1,
        "gender": 1,
        "phone_number": 1,
        "created_at": 1,
        "updated_at": 1,
    }

    # Sort the full matching set in the database, then paginate — do not sort only the current page.
    if sort_key in ("visit_latest", "visit_oldest"):
        visit_dir = -1 if sort_key == "visit_latest" else 1
        pipeline = [
            {"$match": query},
            {
                "$lookup": {
                    "from": "visits",
                    "let": {"pid": "$patient_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$patient_id", "$$pid"]}}},
                        {"$sort": {"created_at": -1}},
                        {"$limit": 1},
                        {"$project": {"_id": 0, "scheduled_start": 1}},
                    ],
                    "as": "_lv_wrap",
                }
            },
            {
                "$addFields": {
                    "_visit_sort_key": {
                        "$let": {
                            "vars": {"first": {"$arrayElemAt": ["$_lv_wrap", 0]}},
                            "in": {
                                "$cond": {
                                    "if": {"$eq": ["$$first", None]},
                                    "then": "",
                                    "else": {
                                        "$toString": {"$ifNull": ["$$first.scheduled_start", ""]},
                                    },
                                }
                            },
                        }
                    }
                }
            },
            {"$sort": {"_visit_sort_key": visit_dir, "patient_id": 1}},
            {"$skip": skip},
            {"$limit": page_size},
        ]
        records = list(db.patients.aggregate(pipeline))
        for rec in records:
            rec.pop("_lv_wrap", None)
            rec.pop("_visit_sort_key", None)
    else:
        sort_spec: list[tuple[str, int]] = [("created_at", -1), ("patient_id", 1)]
        if sort_key == "created_oldest":
            sort_spec = [("created_at", 1), ("patient_id", 1)]
        elif sort_key == "name_az":
            sort_spec = [("name", 1), ("patient_id", 1)]
        elif sort_key == "name_za":
            sort_spec = [("name", -1), ("patient_id", 1)]
        elif sort_key == "id_az":
            sort_spec = [("patient_id", 1)]
        records = list(db.patients.find(query, projection).sort(sort_spec).skip(skip).limit(page_size))
    patient_ids = [str(record.get("patient_id") or "").strip() for record in records if str(record.get("patient_id") or "").strip()]
    latest_visit_by_patient: dict[str, dict] = {}
    if patient_ids:
        for visit in db.visits.aggregate(
            [
                {"$match": {"patient_id": {"$in": patient_ids}}},
                {"$sort": {"created_at": -1}},
                {
                    "$group": {
                        "_id": "$patient_id",
                        "patient_id": {"$first": "$patient_id"},
                        "visit_id": {"$first": "$visit_id"},
                        "id": {"$first": "$id"},
                        "scheduled_start": {"$first": "$scheduled_start"},
                    }
                },
            ]
        ):
            pid = str(visit.get("patient_id") or "").strip()
            if pid and pid not in latest_visit_by_patient:
                latest_visit_by_patient[pid] = visit

    items: list[dict] = []
    for record in records:
        full_name = (record.get("name") or "").strip()
        name_parts = [part for part in full_name.split(" ") if part]
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        internal_patient_id = str(record.get("patient_id") or "")
        age = record.get("age")
        year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970
        estimated_dob = f"{year:04d}-01-01"
        opaque_patient_id = encode_patient_id(internal_patient_id) if internal_patient_id else ""
        latest_visit = latest_visit_by_patient.get(internal_patient_id) if internal_patient_id else None
        latest_visit_id = (
            str((latest_visit or {}).get("visit_id") or (latest_visit or {}).get("id") or "").strip() or None
        )
        latest_visit_scheduled_start = (latest_visit or {}).get("scheduled_start")
        items.append(
            {
                "id": opaque_patient_id,
                "patient_id": opaque_patient_id,
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name or first_name,
                "date_of_birth": str(record.get("date_of_birth") or estimated_dob),
                "mrn": str(record.get("mrn") or internal_patient_id),
                "age": record.get("age"),
                "gender": str(record.get("gender") or "").strip() or None,
                "phone_number": str(record.get("phone_number") or "").strip() or None,
                "created_at": str(record.get("created_at") or "") or None,
                "updated_at": str(record.get("updated_at") or "") or None,
                "latest_visit_id": latest_visit_id,
                "latest_visit_scheduled_start": latest_visit_scheduled_start,
            }
        )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{patient_id}", response_model=PatientSummaryResponse)
def get_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
) -> PatientSummaryResponse:
    """Return one patient by opaque or raw internal id."""
    doctor_id = normalize_doctor_id(current_user)
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
    _ensure_patient_indexes(db)
    ensure_patient_owned_by_doctor(db, doctor_id, internal_patient_id)
    record = db.patients.find_one({"patient_id": internal_patient_id})
    if not record:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _summarize_patient_record(db, record)


@router.patch("/{patient_id}", response_model=PatientSummaryResponse)
def patch_patient(
    patient_id: str,
    payload: PatientUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> PatientSummaryResponse:
    """Update demographics and related fields; may migrate internal id if name/phone identity changes."""
    doctor_id = normalize_doctor_id(current_user)
    internal_old = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
    _ensure_patient_indexes(db)
    ensure_patient_owned_by_doctor(db, doctor_id, internal_old)
    existing = db.patients.find_one({"patient_id": internal_old})
    if not existing:
        raise HTTPException(status_code=404, detail="Patient not found")

    raw_updates = payload.model_dump(exclude_unset=True)
    if not raw_updates:
        return _summarize_patient_record(db, existing)

    merged_name = str(existing.get("name") or "").strip()
    merged_phone = str(existing.get("phone_number") or "").strip()
    if "name" in raw_updates:
        merged_name = str(raw_updates["name"]).strip()
    if "phone_number" in raw_updates:
        merged_phone = str(raw_updates["phone_number"]).strip()
        try:
            merged_phone = normalize_india_mobile_storage(merged_phone)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    internal_new = _resolve_internal_patient_key_for_doctor(
        db, name=merged_name, phone_norm=merged_phone, doctor_id=doctor_id
    )

    patch_keys = (
        "name",
        "phone_number",
        "age",
        "gender",
        "preferred_language",
        "travelled_recently",
        "consent",
        "country",
        "emergency_contact",
        "address",
    )
    set_doc: dict = {}
    for key in patch_keys:
        if key in raw_updates:
            set_doc[key] = raw_updates[key]
    if "name" in raw_updates or "phone_number" in raw_updates:
        set_doc["name"] = merged_name
        set_doc["phone_number"] = merged_phone

    now = datetime.now(timezone.utc)

    if internal_new == internal_old:
        set_doc["updated_at"] = now
        db.patients.update_one({"patient_id": internal_old}, {"$set": set_doc})
        if "phone_number" in raw_updates and merged_phone:
            _align_intake_after_patient_phone_edit(db, internal_new, merged_phone, now)
        updated = db.patients.find_one({"patient_id": internal_old})
        return _summarize_patient_record(db, updated or existing)

    existing_target = db.patients.find_one({"patient_id": internal_new})
    if existing_target and internal_new != internal_old:
        raise HTTPException(
            status_code=409,
            detail="Another patient already exists for this name and phone. Resolve duplicates before changing identity.",
        )

    new_doc = dict(existing)
    new_doc.pop("_id", None)
    new_doc.update(set_doc)
    new_doc["patient_id"] = internal_new
    new_doc["doctor_id"] = doctor_id
    new_doc["updated_at"] = now
    db.patients.insert_one(new_doc)
    _rewire_internal_patient_id(db, internal_old, internal_new)
    db.patients.delete_one({"patient_id": internal_old})
    if "phone_number" in raw_updates and merged_phone:
        _align_intake_after_patient_phone_edit(db, internal_new, merged_phone, now)
    fresh = db.patients.find_one({"patient_id": internal_new})
    return _summarize_patient_record(db, fresh or new_doc)


@router.get("/{patient_id}/latest-visit")
def get_latest_visit_for_patient(
    patient_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Return latest existing visit for a patient (no new visit creation)."""
    doctor_id = normalize_doctor_id(current_user)
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
    ensure_patient_owned_by_doctor(db, doctor_id, internal_patient_id)
    patient = db.patients.find_one({"patient_id": internal_patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visit = db.visits.find_one({"patient_id": internal_patient_id}, sort=[("created_at", -1)])
    if not visit:
        raise HTTPException(status_code=404, detail="No visit found for this patient")
    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "").strip()
    if not resolved_visit_id:
        raise HTTPException(status_code=404, detail="No valid visit found for this patient")

    return {
        "patient_id": encode_patient_id(internal_patient_id),
        "visit_id": resolved_visit_id,
        "status": str(visit.get("status") or "open"),
        "scheduled_start": visit.get("scheduled_start"),
    }


@router.post("/register", response_model=PatientRegisterResponse)
def register_patient(
    payload: PatientRegisterRequest,
    current_user: dict = Depends(get_current_user),
) -> PatientRegisterResponse:
    """Register patient by hospital staff (visit workflow starts on New Visit creation)."""
    doctor_id = normalize_doctor_id(current_user)
    try:
        phone_norm = normalize_india_mobile_storage(str(payload.phone_number or "").strip())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    visit_id = VisitId.validate(VisitId.generate())
    now = datetime.now(timezone.utc)
    scheduled_start = None
    if payload.appointment_date and payload.appointment_time:
        scheduled_start = f"{payload.appointment_date}T{payload.appointment_time}:00"
        _require_appointment_not_in_past(scheduled_start)
    db = get_database()
    try:
        internal_patient_id = _resolve_internal_patient_key_for_doctor(
            db, name=payload.name, phone_norm=phone_norm, doctor_id=doctor_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    prior = db.patients.find_one({"patient_id": internal_patient_id})
    existing_patient = prior is not None
    db.patients.update_one(
        {"patient_id": internal_patient_id},
        {
            "$set": {
                "patient_id": internal_patient_id,
                "doctor_id": doctor_id,
                "name": payload.name,
                "phone_number": phone_norm,
                "age": payload.age,
                "gender": payload.gender,
                "preferred_language": payload.preferred_language,
                "travelled_recently": payload.travelled_recently,
                "consent": payload.consent,
                "workflow_type": payload.workflow_type,
                "country": payload.country,
                "emergency_contact": payload.emergency_contact,
                "address": payload.address,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    is_walk_in = _is_walk_in_visit_type(payload.visit_type)
    visit_type_stored = "walk_in" if is_walk_in else (str(payload.visit_type or "").strip() or "scheduled_visit")
    pending_schedule_for_intake = scheduled_start is None

    # Registration-only flow: until appointment is booked, do not create a visit.
    if pending_schedule_for_intake:
        return PatientRegisterResponse(
            patient_id=encode_patient_id(internal_patient_id),
            visit_id=None,
            whatsapp_triggered=False,
            existing_patient=existing_patient,
            pending_schedule_for_intake=True,
            workflow_skip_previsit=is_walk_in,
        )

    reusable_visit = _find_reusable_active_visit(db, patient_id=internal_patient_id)
    if reusable_visit:
        visit_id = str(reusable_visit.get("visit_id") or reusable_visit.get("id") or "").strip() or visit_id
        db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "provider_id": reusable_visit.get("provider_id"),
                    "scheduled_start": scheduled_start if scheduled_start else reusable_visit.get("scheduled_start"),
                    "visit_type": visit_type_stored,
                    "updated_at": now,
                }
            },
        )
    else:
        db.visits.insert_one(
            {
                "visit_id": visit_id,
                "patient_id": internal_patient_id,
                "provider_id": None,
                "scheduled_start": scheduled_start,
                "visit_type": visit_type_stored,
                "status": "patient_registered",
                "previous_workflow_stage": None,
                "current_workflow_stage": "patient_registered",
                "next_workflow_stage": "vitals" if is_walk_in else "intake",
                "created_at": now,
                "updated_at": now,
            }
        )
    whatsapp_triggered = False
    if scheduled_start and phone_norm and not is_walk_in:
        try:
            IntakeChatService().start_intake(
                patient_id=internal_patient_id,
                visit_id=visit_id,
                to_number=phone_norm,
                language=str(payload.preferred_language or "en"),
            )
            whatsapp_triggered = True
        except Exception:
            whatsapp_triggered = False

    return PatientRegisterResponse(
        patient_id=encode_patient_id(internal_patient_id),
        visit_id=visit_id,
        whatsapp_triggered=whatsapp_triggered,
        existing_patient=existing_patient,
        pending_schedule_for_intake=pending_schedule_for_intake,
        workflow_skip_previsit=is_walk_in,
    )


@router.post("/{patient_id}/visits", response_model=CreateVisitFromPatientResponse)
def create_visit_from_existing_patient(
    patient_id: str,
    payload: CreateVisitFromPatientRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateVisitFromPatientResponse:
    """Create a new open visit for an existing patient and trigger intake on this visit_id."""
    doctor_id = normalize_doctor_id(current_user)
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
    ensure_patient_owned_by_doctor(db, doctor_id, internal_patient_id)
    patient = db.patients.find_one({"patient_id": internal_patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if payload.scheduled_start and str(payload.scheduled_start).strip():
        _require_appointment_not_in_past(str(payload.scheduled_start).strip())
    is_walk_in = _is_walk_in_visit_type(payload.visit_type)
    visit_type_stored = "walk_in" if is_walk_in else (str(payload.visit_type or "").strip() or "scheduled_visit")

    visit_id = VisitId.validate(VisitId.generate())
    now = datetime.now(timezone.utc)
    reusable_visit = _find_reusable_active_visit(db, patient_id=internal_patient_id)
    if reusable_visit:
        visit_id = str(reusable_visit.get("visit_id") or reusable_visit.get("id") or "").strip() or visit_id
        db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "provider_id": payload.provider_id if payload.provider_id else reusable_visit.get("provider_id"),
                    "scheduled_start": payload.scheduled_start
                    if payload.scheduled_start and str(payload.scheduled_start).strip()
                    else reusable_visit.get("scheduled_start"),
                    "visit_type": visit_type_stored,
                    "updated_at": now,
                }
            },
        )
    else:
        db.visits.insert_one(
            {
                "visit_id": visit_id,
                "patient_id": internal_patient_id,
                "provider_id": payload.provider_id,
                "scheduled_start": payload.scheduled_start,
                "visit_type": visit_type_stored,
                "status": "patient_registered",
                "previous_workflow_stage": None,
                "current_workflow_stage": "patient_registered",
                "next_workflow_stage": "vitals" if is_walk_in else "intake",
                "created_at": now,
                "updated_at": now,
            }
        )

    intake_triggered = False
    phone_number = str(patient.get("phone_number") or "").strip()
    pending_schedule_for_intake = not (payload.scheduled_start and str(payload.scheduled_start).strip())
    if not pending_schedule_for_intake and phone_number and not is_walk_in:
        try:
            IntakeChatService().start_intake(
                patient_id=internal_patient_id,
                visit_id=visit_id,
                to_number=phone_number,
                language=str(patient.get("preferred_language") or "en"),
            )
            intake_triggered = True
        except Exception:
            intake_triggered = False

    return CreateVisitFromPatientResponse(
        patient_id=encode_patient_id(internal_patient_id),
        visit_id=visit_id,
        status="patient_registered",
        scheduled_start=payload.scheduled_start,
        intake_triggered=intake_triggered,
        pending_schedule_for_intake=pending_schedule_for_intake,
    )
