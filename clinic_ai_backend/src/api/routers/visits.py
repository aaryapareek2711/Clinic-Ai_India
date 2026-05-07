"""Visit routes module."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.api.schemas.patient import ScheduleVisitIntakeRequest, ScheduleVisitIntakeResponse
from src.application.services.intake_chat_service import IntakeChatService
from src.application.use_cases.store_vitals import StoreVitalsUseCase
from src.application.utils.patient_id_crypto import encode_patient_id, resolve_internal_patient_id
from src.core.config import get_settings
from src.core.ttl_cache import TTLCache
router = APIRouter(prefix="/api/visits", tags=["Visits"])

LOCKED_VISIT_STATUSES = {"completed", "closed", "ended", "cancelled"}
QUEUEABLE_VISIT_STATUSES = {"open", "scheduled", "queued", "in_queue"}
STARTABLE_VISIT_STATUSES = {"open", "scheduled", "queued", "in_queue"}
_INDEXES_READY = False
_visit_summary_cache = TTLCache(max_items=512)
_provider_upcoming_cache = TTLCache(max_items=256)
_provider_visits_cache = TTLCache(max_items=256)


def _ensure_visit_indexes(db) -> None:
    global _INDEXES_READY
    if _INDEXES_READY:
        return
    try:
        db.visits.create_index([("visit_id", 1)], unique=True)
        db.visits.create_index([("id", 1)])
        db.visits.create_index([("appointment_id", 1)])
        db.visits.create_index([("provider_id", 1), ("updated_at", -1), ("created_at", -1)])
        db.visits.create_index([("provider_id", 1), ("scheduled_start", 1), ("status", 1)])
        db.visits.create_index([("patient_id", 1), ("created_at", -1)])
        db.patients.create_index([("patient_id", 1)], unique=True)
    except Exception:
        return
    _INDEXES_READY = True


class VisitStatusUpdateRequest(BaseModel):
    status: str = Field(min_length=1, max_length=50)


def _find_visit(db, visit_id: str) -> dict | None:
    return db.visits.find_one({"visit_id": visit_id}) or db.visits.find_one({"id": visit_id})


def _visit_update_query(visit: dict, visit_id: str) -> dict:
    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    return {"visit_id": resolved_visit_id} if visit.get("visit_id") else {"id": resolved_visit_id}


def _normalize_visit_status(visit: dict) -> str:
    return str(visit.get("status") or "open").strip().lower()


def _serialize_datetime(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _parse_iso_datetime(value: object):
    """Parse ISO datetime-like strings stored in Mongo (best-effort)."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:  # noqa: BLE001
        return None


def _workflow_stage_triplet_for_status(status: str) -> dict:
    s = str(status or "").strip().lower()
    if s in {"patient_registered"}:
        return {
            "previous_workflow_stage": None,
            "current_workflow_stage": "patient_registered",
            "next_workflow_stage": "intake",
        }
    if s in {"open", "scheduled", "queued"}:
        return {
            "previous_workflow_stage": "patient_registered",
            "current_workflow_stage": "intake",
            "next_workflow_stage": "pre_visit",
        }
    if s == "in_queue":
        return {
            "previous_workflow_stage": "intake",
            "current_workflow_stage": "pre_visit",
            "next_workflow_stage": "vitals",
        }
    if s == "in_progress":
        return {
            "previous_workflow_stage": "pre_visit",
            "current_workflow_stage": "vitals",
            "next_workflow_stage": "transcription",
        }
    if s in {"completed", "closed", "ended"}:
        return {
            "previous_workflow_stage": "post_visit",
            "current_workflow_stage": "completed",
            "next_workflow_stage": None,
        }
    if s == "no_show":
        return {
            "previous_workflow_stage": "intake",
            "current_workflow_stage": "no_show",
            "next_workflow_stage": None,
        }
    if s == "cancelled":
        return {
            "previous_workflow_stage": "intake",
            "current_workflow_stage": "cancelled",
            "next_workflow_stage": None,
        }
    return {
        "previous_workflow_stage": None,
        "current_workflow_stage": "intake",
        "next_workflow_stage": "pre_visit",
    }


def _public_visit_payload(visit: dict) -> dict:
    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "")
    patient_id = str(visit.get("patient_id") or "")
    default_stage = _workflow_stage_triplet_for_status(visit.get("status") or "open")
    prev_stage = visit.get("previous_workflow_stage")
    curr_stage = visit.get("current_workflow_stage")
    next_stage = visit.get("next_workflow_stage")
    return {
        "visit_id": resolved_visit_id,
        "id": resolved_visit_id,
        "patient_id": encode_patient_id(patient_id) if patient_id else "",
        "status": str(visit.get("status") or "open"),
        "previous_workflow_stage": prev_stage if prev_stage is not None else default_stage["previous_workflow_stage"],
        "current_workflow_stage": curr_stage if curr_stage is not None else default_stage["current_workflow_stage"],
        "next_workflow_stage": next_stage if next_stage is not None else default_stage["next_workflow_stage"],
        "scheduled_start": visit.get("scheduled_start"),
        "actual_start": _serialize_datetime(visit.get("actual_start")),
        "actual_end": _serialize_datetime(visit.get("actual_end")),
        "updated_at": _serialize_datetime(visit.get("updated_at")),
    }


def _extract_chief_complaint(db, patient_id: str, visit_id: str) -> str | None:
    visit_doc = _find_visit(db, visit_id) or {}
    embedded_previsit = ((visit_doc.get("pre_visit_summary") or {}).get("sections") or {}).get("chief_complaint") or {}
    embedded_reason = embedded_previsit.get("reason_for_visit")
    if embedded_reason:
        return str(embedded_reason)
    embedded_intake = visit_doc.get("intake_session") or {}
    embedded_illness = embedded_intake.get("illness")
    if embedded_illness:
        return str(embedded_illness)
    for answer in embedded_intake.get("answers", []):
        if str(answer.get("question", "")).lower() == "illness" and answer.get("answer"):
            return str(answer.get("answer"))

    previsit = db.pre_visit_summaries.find_one(
        {"patient_id": patient_id, "visit_id": visit_id},
        sort=[("updated_at", -1)],
    ) or {}
    sections = previsit.get("sections") or {}
    chief = (sections.get("chief_complaint") or {}).get("reason_for_visit")
    if chief:
        return str(chief)

    intake = db.intake_sessions.find_one(
        {"patient_id": patient_id, "visit_id": visit_id},
        sort=[("updated_at", -1)],
    ) or {}
    illness = intake.get("illness")
    if illness:
        return str(illness)
    for answer in intake.get("answers", []):
        if str(answer.get("question", "")).lower() == "illness" and answer.get("answer"):
            return str(answer.get("answer"))
    return None


def _appointment_time_valid(value: str) -> bool:
    parts = (value or "").strip().split(":")
    if len(parts) != 2:
        return False
    hour, minute = parts[0], parts[1]
    if len(hour) != 2 or len(minute) != 2 or not hour.isdigit() or not minute.isdigit():
        return False
    return 0 <= int(hour) <= 23 and 0 <= int(minute) <= 59


def _intake_send_allowed(db, visit_id: str) -> tuple[bool, bool]:
    """Return (allow_whatsapp_intake, skipped_due_to_existing_session)."""
    visit = _find_visit(db, visit_id) or {}
    session = visit.get("intake_session") or {}
    if not session:
        return True, False
    status = str(session.get("status") or "")
    if status == "stopped":
        return True, False
    return False, True


def _set_visit_status(db, visit_id: str, status: str) -> dict:
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    normalized_status = status.strip().lower()
    current_status = _normalize_visit_status(visit)
    if current_status == "cancelled":
        raise HTTPException(status_code=409, detail="Cancelled visits cannot be updated")
    if current_status in LOCKED_VISIT_STATUSES - {"cancelled"} and normalized_status != current_status:
        raise HTTPException(status_code=409, detail="Completed visits cannot be updated")

    updates: dict = {"status": normalized_status, "updated_at": datetime.now(timezone.utc)}
    now = datetime.now(timezone.utc)
    if normalized_status in {"queued", "in_queue"}:
        if current_status in LOCKED_VISIT_STATUSES:
            raise HTTPException(status_code=409, detail="Completed/cancelled visits cannot enter queue")
        updates["status"] = "in_queue"
    elif normalized_status == "in_progress":
        if current_status not in STARTABLE_VISIT_STATUSES:
            raise HTTPException(status_code=409, detail="Visit cannot be started from its current status")
        updates["actual_start"] = visit.get("actual_start") or now
        updates["actual_end"] = None
    elif normalized_status == "completed":
        if current_status == "cancelled":
            raise HTTPException(status_code=409, detail="Cancelled visits cannot be completed")
        updates["actual_start"] = visit.get("actual_start") or now
        updates["actual_end"] = now
    elif normalized_status == "open":
        updates["actual_end"] = None
    elif normalized_status == "cancelled":
        raise HTTPException(status_code=400, detail="Use the cancel endpoint to cancel a visit")

    updates.update(_workflow_stage_triplet_for_status(updates.get("status", normalized_status)))

    update_query = _visit_update_query(visit, visit_id)
    db.visits.update_one(update_query, {"$set": updates})
    refreshed = _find_visit(db, str(visit.get("visit_id") or visit.get("id") or visit_id)) or {}
    return _public_visit_payload(refreshed)


@router.post("/{visit_id}/schedule-intake", response_model=ScheduleVisitIntakeResponse)
def schedule_visit_and_send_intake(visit_id: str, payload: ScheduleVisitIntakeRequest) -> ScheduleVisitIntakeResponse:
    """Attach appointment time to a visit and start WhatsApp intake when appropriate."""
    if not _appointment_time_valid(payload.appointment_time):
        raise HTTPException(status_code=422, detail="appointment_time must be HH:MM in 24-hour format")

    try:
        chosen = datetime.strptime(payload.appointment_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="appointment_date must be YYYY-MM-DD") from exc

    today = datetime.now(timezone.utc).date()
    if chosen < today or chosen > today + timedelta(days=7):
        raise HTTPException(
            status_code=422,
            detail="appointment_date must be between today and the next 7 days",
        )

    scheduled_start = f"{payload.appointment_date}T{payload.appointment_time}:00"
    db = get_database()
    # Avoid Mongo $or here so in-memory test doubles can match visits.
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    internal_patient_id = str(visit.get("patient_id") or "")
    if not internal_patient_id:
        raise HTTPException(status_code=422, detail="Visit has no patient_id")
    visit_status = _normalize_visit_status(visit)
    if visit_status in LOCKED_VISIT_STATUSES:
        raise HTTPException(status_code=409, detail="Completed/cancelled visits cannot be rescheduled")

    now = datetime.now(timezone.utc)
    update_query = _visit_update_query(visit, resolved_visit_id)
    db.visits.update_one(
        update_query,
        {
            "$set": {
                "scheduled_start": scheduled_start,
                "status": "scheduled",
                "updated_at": now,
                **_workflow_stage_triplet_for_status("scheduled"),
            }
        },
    )

    patient = db.patients.find_one({"patient_id": internal_patient_id}) or {}
    phone_number = str(patient.get("phone_number") or "").strip()
    allow_intake, skipped = _intake_send_allowed(db, resolved_visit_id)
    whatsapp_triggered = False
    if allow_intake and phone_number:
        try:
            IntakeChatService().start_intake(
                patient_id=internal_patient_id,
                visit_id=resolved_visit_id,
                to_number=phone_number,
                language=str(patient.get("preferred_language") or "en"),
            )
            whatsapp_triggered = True
        except Exception:
            whatsapp_triggered = False

    return ScheduleVisitIntakeResponse(
        visit_id=resolved_visit_id,
        patient_id=encode_patient_id(internal_patient_id),
        scheduled_start=scheduled_start,
        whatsapp_triggered=whatsapp_triggered,
        intake_skipped_existing_session=skipped,
    )


@router.get("/provider/{provider_id}/upcoming")
def list_provider_upcoming_visits(
    provider_id: str,
    from_date: str | None = Query(default=None, description="Optional lower bound ISO (inclusive) for scheduled_start"),
    to_date: str | None = Query(default=None, description="Optional upper bound ISO (inclusive) for scheduled_start"),
) -> dict:
    """Return provider visits from Mongo for dashboard/calendar."""
    cache_key = f"provider:upcoming:{provider_id}:{from_date or ''}:{to_date or ''}"
    cached = _provider_upcoming_cache.get(cache_key)
    if cached is not None:
        return cached
    db = get_database()
    _ensure_visit_indexes(db)
    # Keep this endpoint fast: don't return the full visit history.
    # Without a limit/projection, the backend can hang on Render and the frontend shows "Failed to load visits".
    UPCOMING_LIMIT = 120
    scheduled_bounds: dict = {"$exists": True, "$ne": None, "$ne": ""}
    if from_date and str(from_date).strip():
        scheduled_bounds["$gte"] = str(from_date).strip()
    if to_date and str(to_date).strip():
        scheduled_bounds["$lte"] = str(to_date).strip()
    records = list(
        db.visits.find(
            {
                "status": {"$nin": list(LOCKED_VISIT_STATUSES)},
                "$or": [
                    {"provider_id": provider_id},
                    {"provider_id": ""},
                    {"provider_id": None},
                    {"provider_id": {"$exists": False}},
                ],
                # Queue/board UI only cares about items with an appointment time fixed.
                "scheduled_start": scheduled_bounds,
            },
            {
                "_id": 0,
                "patient_id": 1,
                "visit_id": 1,
                "id": 1,
                "scheduled_start": 1,
                "visit_type": 1,
                "status": 1,
                "chief_complaint": 1,
            },
        )
        .sort("scheduled_start", 1)
        .limit(UPCOMING_LIMIT)
    )

    patient_ids = sorted({str(visit.get("patient_id") or "").strip() for visit in records if str(visit.get("patient_id") or "").strip()})
    patient_map: dict[str, dict] = {}
    if patient_ids:
        for patient in db.patients.find(
            {"patient_id": {"$in": patient_ids}},
            {"_id": 0, "patient_id": 1, "name": 1},
        ):
            pid = str(patient.get("patient_id") or "").strip()
            if pid:
                patient_map[pid] = patient
    appointments: list[dict] = []
    for visit in records:
        patient_id = str(visit.get("patient_id") or "")
        resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "")
        if not resolved_visit_id:
            continue
        patient = patient_map.get(patient_id, {})
        patient_name = (patient.get("name") or "").strip() or "Unknown Patient"
        scheduled_start = visit.get("scheduled_start")
        chief_complaint = (
            visit.get("chief_complaint")
            or "Visit"
        )
        appointments.append(
            {
                "appointment_id": resolved_visit_id,
                "patient_id": encode_patient_id(patient_id) if patient_id else "",
                "patient_name": patient_name,
                "scheduled_start": scheduled_start,
                "chief_complaint": chief_complaint or "Visit",
                "appointment_type": visit.get("visit_type") or "visit",
                "previsit_completed": False,
                "visit_id": resolved_visit_id,
                "status": str(visit.get("status") or "open"),
            }
        )

    out = {"appointments": appointments}
    _provider_upcoming_cache.set(cache_key, out, ttl_sec=8.0)
    return out


@router.get("/provider/{provider_id}")
def list_provider_visits(
    provider_id: str,
    status_filter: str | None = Query(default=None, description="Filter by visit status (scheduled, in_progress, completed, etc)"),
) -> list[dict]:
    """Return provider visits for Visits workspace list."""
    cache_key = f"provider:visits:{provider_id}:{status_filter or ''}"
    cached = _provider_visits_cache.get(cache_key)
    if cached is not None:
        return cached
    db = get_database()
    _ensure_visit_indexes(db)
    VISITS_LIMIT = 200
    query: dict = {
        "$or": [
            {"provider_id": provider_id},
            {"provider_id": ""},
            {"provider_id": None},
            {"provider_id": {"$exists": False}},
        ],
    }
    if status_filter:
        status_value = str(status_filter).strip().lower()
        if status_value == "scheduled":
            query["status"] = {"$in": ["scheduled", "queued", "in_queue"]}
        elif status_value == "completed":
            query["status"] = {"$in": ["completed", "complete", "closed", "ended"]}
        else:
            query["status"] = status_value

    records = list(
        db.visits.find(
            query,
            {
                "_id": 0,
                "visit_id": 1,
                "id": 1,
                "patient_id": 1,
                "visit_type": 1,
                "status": 1,
                "previous_workflow_stage": 1,
                "current_workflow_stage": 1,
                "next_workflow_stage": 1,
                "scheduled_start": 1,
                "actual_start": 1,
                "actual_end": 1,
                "chief_complaint": 1,
                "intake_session.status": 1,
                "intake_session.question_answers": 1,
                "intake_session.updated_at": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        )
        .sort([("updated_at", -1), ("created_at", -1)])
        .limit(VISITS_LIMIT)
    )
    patient_ids = sorted({str(visit.get("patient_id") or "").strip() for visit in records if str(visit.get("patient_id") or "").strip()})
    patient_map: dict[str, dict] = {}
    if patient_ids:
        for patient in db.patients.find(
            {"patient_id": {"$in": patient_ids}},
            {"_id": 0, "patient_id": 1, "name": 1, "phone_number": 1, "created_at": 1},
        ):
            pid = str(patient.get("patient_id") or "").strip()
            if pid:
                patient_map[pid] = patient

    out: list[dict] = []
    for visit in records:
        resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "")
        if not resolved_visit_id:
            continue
        internal_patient_id = str(visit.get("patient_id") or "")
        patient = patient_map.get(internal_patient_id, {})
        patient_name = str(patient.get("name") or "").strip() or "Unknown patient"
        patient_phone_number = str(patient.get("phone_number") or "").strip()
        scheduled_start = visit.get("scheduled_start")
        actual_start = visit.get("actual_start")
        actual_end = visit.get("actual_end")
        duration_minutes = None
        try:
            if isinstance(actual_start, datetime) and isinstance(actual_end, datetime):
                duration_minutes = int((actual_end - actual_start).total_seconds() / 60)
            elif isinstance(actual_start, str) and isinstance(actual_end, str):
                start_dt = datetime.fromisoformat(actual_start.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(actual_end.replace("Z", "+00:00"))
                duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
        except Exception:
            duration_minutes = None

        out.append(
            {
                **{
                    "id": resolved_visit_id,
                    "visit_id": resolved_visit_id,
                    "patient_id": encode_patient_id(internal_patient_id) if internal_patient_id else "",
                    "patient_name": patient_name,
                    "mobile_number": patient_phone_number or None,
                    # Pass-through from patients collection — used by dashboard “new registrations today”.
                    "patient_created_at": _serialize_datetime(patient.get("created_at")) or "",
                    "visit_type": (
                        "Visit"
                        if str(visit.get("visit_type") or "").strip().lower() in {"", "string"}
                        else str(visit.get("visit_type"))
                    ),
                    "status": str(visit.get("status") or "open"),
                    "scheduled_start": scheduled_start,
                    "actual_start": actual_start,
                    "actual_end": actual_end,
                    "duration_minutes": duration_minutes,
                    "chief_complaint": visit.get("chief_complaint") or None,
                    "intake_status": str((visit.get("intake_session") or {}).get("status") or ""),
                    "intake_question_count": len(((visit.get("intake_session") or {}).get("question_answers") or [])),
                    "intake_last_updated_at": (visit.get("intake_session") or {}).get("updated_at") or None,
                    "created_at": visit.get("created_at") or "",
                    "updated_at": visit.get("updated_at") or "",
                },
                **{
                    "previous_workflow_stage": visit.get(
                        "previous_workflow_stage",
                        _workflow_stage_triplet_for_status(visit.get("status") or "open")["previous_workflow_stage"],
                    ),
                    "current_workflow_stage": visit.get(
                        "current_workflow_stage",
                        _workflow_stage_triplet_for_status(visit.get("status") or "open")["current_workflow_stage"],
                    ),
                    "next_workflow_stage": visit.get(
                        "next_workflow_stage",
                        _workflow_stage_triplet_for_status(visit.get("status") or "open")["next_workflow_stage"],
                    ),
                },
            }
        )

    _provider_visits_cache.set(cache_key, out, ttl_sec=8.0)
    return out


@router.get("/provider/{provider_id}/paged")
def list_provider_visits_paged(
    provider_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    status_filter: str | None = Query(default=None, description="Filter by visit status"),
    search: str | None = Query(default=None, description="Search by patient name/mobile/id/visit id"),
    sort: str = Query(default="patient_newest", description="patient_newest|patient_oldest|time_newest|time_oldest|name_az|name_za|visit_id"),
) -> dict:
    """Return paginated provider visits with server-side filtering."""
    db = get_database()
    _ensure_visit_indexes(db)
    query: dict = {
        "$or": [
            {"provider_id": provider_id},
            {"provider_id": ""},
            {"provider_id": None},
            {"provider_id": {"$exists": False}},
        ],
    }
    if status_filter:
        status_value = str(status_filter).strip().lower()
        if status_value == "scheduled":
            query["status"] = {"$in": ["scheduled", "queued", "in_queue"]}
        elif status_value == "completed":
            query["status"] = {"$in": ["completed", "complete", "closed", "ended"]}
        else:
            query["status"] = status_value
    search_value = str(search or "").strip()
    if search_value:
        import re

        escaped = re.escape(search_value)
        search_regex = {"$regex": escaped, "$options": "i"}
        patient_matches = list(
            db.patients.find(
                {"$or": [{"name": search_regex}, {"phone_number": search_regex}, {"patient_id": search_regex}]},
                {"_id": 0, "patient_id": 1},
            )
        )
        patient_ids = [str(p.get("patient_id") or "").strip() for p in patient_matches if str(p.get("patient_id") or "").strip()]
        query["$and"] = [
            {
                "$or": [
                    {"visit_id": search_regex},
                    {"id": search_regex},
                    {"patient_id": {"$in": patient_ids}} if patient_ids else {"visit_id": search_regex},
                ]
            }
        ]
    total = int(db.visits.count_documents(query))
    skip = (page - 1) * page_size
    sort_spec: list[tuple[str, int]]
    if sort == "time_oldest":
        sort_spec = [("updated_at", 1), ("created_at", 1)]
    elif sort == "visit_id":
        sort_spec = [("visit_id", 1), ("id", 1)]
    else:
        sort_spec = [("updated_at", -1), ("created_at", -1)]
    records = list(
        db.visits.find(
            query,
            {
                "_id": 0,
                "visit_id": 1,
                "id": 1,
                "patient_id": 1,
                "visit_type": 1,
                "status": 1,
                "previous_workflow_stage": 1,
                "current_workflow_stage": 1,
                "next_workflow_stage": 1,
                "scheduled_start": 1,
                "actual_start": 1,
                "actual_end": 1,
                "chief_complaint": 1,
                "intake_session.status": 1,
                "intake_session.question_answers": 1,
                "intake_session.updated_at": 1,
                "created_at": 1,
                "updated_at": 1,
            },
        )
        .sort(sort_spec)
        .skip(skip)
        .limit(page_size)
    )
    patient_ids = sorted({str(visit.get("patient_id") or "").strip() for visit in records if str(visit.get("patient_id") or "").strip()})
    patient_map: dict[str, dict] = {}
    if patient_ids:
        for patient in db.patients.find(
            {"patient_id": {"$in": patient_ids}},
            {"_id": 0, "patient_id": 1, "name": 1, "phone_number": 1, "created_at": 1},
        ):
            pid = str(patient.get("patient_id") or "").strip()
            if pid:
                patient_map[pid] = patient
    items: list[dict] = []
    for visit in records:
        resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "")
        if not resolved_visit_id:
            continue
        internal_patient_id = str(visit.get("patient_id") or "")
        patient = patient_map.get(internal_patient_id, {})
        patient_name = str(patient.get("name") or "").strip() or "Unknown patient"
        patient_phone_number = str(patient.get("phone_number") or "").strip()
        actual_start = visit.get("actual_start")
        actual_end = visit.get("actual_end")
        duration_minutes = None
        try:
            if isinstance(actual_start, datetime) and isinstance(actual_end, datetime):
                duration_minutes = int((actual_end - actual_start).total_seconds() / 60)
            elif isinstance(actual_start, str) and isinstance(actual_end, str):
                start_dt = datetime.fromisoformat(actual_start.replace("Z", "+00:00"))
                end_dt = datetime.fromisoformat(actual_end.replace("Z", "+00:00"))
                duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
        except Exception:
            duration_minutes = None
        items.append(
            {
                "id": resolved_visit_id,
                "visit_id": resolved_visit_id,
                "patient_id": encode_patient_id(internal_patient_id) if internal_patient_id else "",
                "patient_name": patient_name,
                "mobile_number": patient_phone_number or None,
                "patient_created_at": _serialize_datetime(patient.get("created_at")) or "",
                "visit_type": (
                    "Visit"
                    if str(visit.get("visit_type") or "").strip().lower() in {"", "string"}
                    else str(visit.get("visit_type"))
                ),
                "status": str(visit.get("status") or "open"),
                "scheduled_start": visit.get("scheduled_start"),
                "actual_start": actual_start,
                "actual_end": actual_end,
                "duration_minutes": duration_minutes,
                "chief_complaint": visit.get("chief_complaint") or None,
                "intake_status": str((visit.get("intake_session") or {}).get("status") or ""),
                "intake_question_count": len(((visit.get("intake_session") or {}).get("question_answers") or [])),
                "intake_last_updated_at": (visit.get("intake_session") or {}).get("updated_at") or None,
                "created_at": visit.get("created_at") or "",
                "updated_at": visit.get("updated_at") or "",
                "previous_workflow_stage": visit.get(
                    "previous_workflow_stage",
                    _workflow_stage_triplet_for_status(visit.get("status") or "open")["previous_workflow_stage"],
                ),
                "current_workflow_stage": visit.get(
                    "current_workflow_stage",
                    _workflow_stage_triplet_for_status(visit.get("status") or "open")["current_workflow_stage"],
                ),
                "next_workflow_stage": visit.get(
                    "next_workflow_stage",
                    _workflow_stage_triplet_for_status(visit.get("status") or "open")["next_workflow_stage"],
                ),
            }
        )
    if sort == "patient_newest":
        items.sort(key=lambda row: str(row.get("patient_created_at") or ""), reverse=True)
    elif sort == "patient_oldest":
        items.sort(key=lambda row: str(row.get("patient_created_at") or ""))
    elif sort == "name_az":
        items.sort(key=lambda row: str(row.get("patient_name") or "").lower())
    elif sort == "name_za":
        items.sort(key=lambda row: str(row.get("patient_name") or "").lower(), reverse=True)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/provider/{provider_id}/careprep")
def list_provider_careprep(
    provider_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    filter: str = Query(default="all", description="all|ready|in_progress"),
    search: str | None = Query(default=None),
) -> dict:
    """
    CarePrep read-model: return only fields needed by CarePrep UI.
    Avoids overfetching full visit list and reduces client-side computation.
    """
    db = get_database()
    _ensure_visit_indexes(db)
    query: dict = {
        "$or": [
            {"provider_id": provider_id},
            {"provider_id": ""},
            {"provider_id": None},
            {"provider_id": {"$exists": False}},
        ],
    }
    s = str(search or "").strip()
    if s:
        import re

        esc = re.escape(s)
        rx = {"$regex": esc, "$options": "i"}
        patient_matches = list(
            db.patients.find({"$or": [{"name": rx}, {"phone_number": rx}, {"patient_id": rx}]}, {"_id": 0, "patient_id": 1})
        )
        patient_ids = [str(p.get("patient_id") or "").strip() for p in patient_matches if str(p.get("patient_id") or "").strip()]
        query["$and"] = [
            {
                "$or": [
                    {"visit_id": rx},
                    {"id": rx},
                    {"patient_id": {"$in": patient_ids}} if patient_ids else {"visit_id": rx},
                ]
            }
        ]
    skip = (page - 1) * page_size
    records = list(
        db.visits.find(
            query,
            {
                "_id": 0,
                "visit_id": 1,
                "id": 1,
                "patient_id": 1,
                "status": 1,
                "scheduled_start": 1,
                "created_at": 1,
                "updated_at": 1,
                "intake_session.status": 1,
                "intake_session.question_answers": 1,
                "intake_session.updated_at": 1,
            },
        )
        .sort([("updated_at", -1), ("created_at", -1)])
        .skip(skip)
        .limit(page_size)
    )
    patient_ids = sorted({str(v.get("patient_id") or "").strip() for v in records if str(v.get("patient_id") or "").strip()})
    patient_map: dict[str, dict] = {}
    if patient_ids:
        for patient in db.patients.find(
            {"patient_id": {"$in": patient_ids}},
            {"_id": 0, "patient_id": 1, "name": 1, "phone_number": 1, "created_at": 1},
        ):
            pid = str(patient.get("patient_id") or "").strip()
            if pid:
                patient_map[pid] = patient
    items: list[dict] = []
    for v in records:
        vid = str(v.get("visit_id") or v.get("id") or "").strip()
        if not vid:
            continue
        pid = str(v.get("patient_id") or "").strip()
        patient = patient_map.get(pid, {})
        intake = v.get("intake_session") or {}
        qa_len = len((intake.get("question_answers") or []))
        intake_status = str(intake.get("status") or "not_started").lower()
        touched_at = intake.get("updated_at") or v.get("updated_at") or v.get("created_at")
        status_kind = "progress"
        if intake_status == "stopped" and qa_len > 0:
            status_kind = "ready"
        elif qa_len >= 6:
            status_kind = "ready"
        if filter == "ready" and status_kind != "ready":
            continue
        if filter == "in_progress" and status_kind != "progress":
            continue
        items.append(
            {
                "visit_id": vid,
                "patient_id": encode_patient_id(pid) if pid else "",
                "patient_name": str(patient.get("name") or "Patient").strip(),
                "mobile_number": str(patient.get("phone_number") or "").strip(),
                "patient_created_at": _serialize_datetime(patient.get("created_at")) or "",
                "intake_status": intake_status,
                "intake_question_count": qa_len,
                "touched_at": touched_at,
                "status_kind": status_kind,
            }
        )
    total = len(items) if s or filter != "all" else int(db.visits.count_documents(query))
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/patient/{patient_id}")
def list_patient_visits(
    patient_id: str,
    status_filter: str | None = Query(default=None, description="Filter by visit status"),
) -> list[dict]:
    """Return visits for a single patient, resolving encrypted patient ids."""
    db = get_database()
    _ensure_visit_indexes(db)
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    query: dict = {"patient_id": internal_patient_id}
    if status_filter:
        query["status"] = status_filter

    records = list(db.visits.find(query, {"_id": 0}).sort("created_at", -1))
    out: list[dict] = []
    for visit in records:
        resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "").strip()
        if not resolved_visit_id:
            continue
        out.append(
            {
                "id": resolved_visit_id,
                "visit_id": resolved_visit_id,
                "patient_id": encode_patient_id(internal_patient_id) if internal_patient_id else "",
                "status": str(visit.get("status") or "open"),
                "previous_workflow_stage": visit.get("previous_workflow_stage"),
                "current_workflow_stage": visit.get("current_workflow_stage"),
                "next_workflow_stage": visit.get("next_workflow_stage"),
                "scheduled_start": visit.get("scheduled_start"),
                "created_at": visit.get("created_at") or "",
                "updated_at": visit.get("updated_at") or "",
            }
        )

    return out


@router.get("/{visit_id}")
def get_visit(visit_id: str) -> dict:
    """Return visit details for visit workflow page."""
    db = get_database()
    _ensure_visit_indexes(db)
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    patient_id = str(visit.get("patient_id") or "")
    patient = db.patients.find_one({"patient_id": patient_id}, {"_id": 0}) or {}
    full_name = (patient.get("name") or "").strip()
    name_parts = [part for part in full_name.split(" ") if part]
    first_name = name_parts[0] if name_parts else "Patient"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    age = patient.get("age")
    year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970

    default_stage = _workflow_stage_triplet_for_status(visit.get("status") or "open")
    resolved_chief_complaint = visit.get("chief_complaint") or _extract_chief_complaint(db, patient_id, resolved_visit_id)
    return {
        "id": resolved_visit_id,
        "patient_id": encode_patient_id(patient_id) if patient_id else "",
        "provider_id": str(visit.get("provider_id") or ""),
        "appointment_id": visit.get("appointment_id"),
        "visit_type": str(visit.get("visit_type") or "Visit"),
        "status": str(visit.get("status") or "open"),
        "previous_workflow_stage": visit.get("previous_workflow_stage", default_stage.get("previous_workflow_stage")),
        "current_workflow_stage": visit.get("current_workflow_stage", default_stage.get("current_workflow_stage")),
        "next_workflow_stage": visit.get("next_workflow_stage", default_stage.get("next_workflow_stage")),
        "chief_complaint": resolved_chief_complaint,
        "reason_for_visit": visit.get("reason_for_visit"),
        "scheduled_start": visit.get("scheduled_start"),
        "actual_start": _serialize_datetime(visit.get("actual_start")),
        "actual_end": _serialize_datetime(visit.get("actual_end")),
        "subjective": visit.get("subjective"),
        "objective": visit.get("objective"),
        "assessment": visit.get("assessment"),
        "plan": visit.get("plan"),
        "patient": {
            "id": encode_patient_id(patient_id) if patient_id else "",
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": str(patient.get("date_of_birth") or f"{year:04d}-01-01"),
            "gender": str(patient.get("gender") or "unknown"),
            "phone_number": patient.get("phone_number"),
        },
    }


@router.get("/{visit_id}/summary")
def get_visit_summary(
    visit_id: str,
    include: str | None = Query(
        default=None,
        description="Comma-separated fields: visit,intake_session,pre_visit_summary,latest_vitals,latest_vitals_form,clinical_note. Default=all.",
    ),
) -> dict:
    """
    Return a visit workspace summary to reduce frontend waterfalls.

    Includes: visit detail, intake session snapshot, pre-visit summary (if any),
    latest vitals/form (if any), and latest clinical note (if any).
    """
    db = get_database()
    _ensure_visit_indexes(db)
    cache_key = f"visit:summary:{visit_id}:{include or ''}"
    cached = _visit_summary_cache.get(cache_key)
    if cached is not None:
        return cached
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    patient_id_raw = str(visit.get("patient_id") or "")
    patient = db.patients.find_one({"patient_id": patient_id_raw}, {"_id": 0}) or {}

    # Base visit payload (same shape as GET /api/visits/{visit_id})
    # Note: `get_visit` is read-only (no write-on-read backfills).
    visit_payload = get_visit(resolved_visit_id)

    # Intake session snapshot (read-only; do NOT auto-complete or write in this summary endpoint).
    intake = visit.get("intake_session")
    if not intake:
        intake_payload = {
            "visit_id": resolved_visit_id,
            "patient_id": encode_patient_id(patient_id_raw) if patient_id_raw else "",
            "status": "not_started",
            "question_answers": [],
            "illness": None,
            "language": None,
            "updated_at": None,
            "created_at": None,
        }
    else:
        normalized_answers: list[dict] = []
        for item in (intake.get("answers") or []):
            normalized_answers.append(
                {
                    "question": str(item.get("question") or "").strip(),
                    "answer": str(item.get("answer") or "").strip(),
                    "topic": str(item.get("topic") or "").strip() or None,
                    "asked_at": item.get("asked_at"),
                    "answered_at": item.get("answered_at"),
                }
            )
        intake_patient_id = str(intake.get("patient_id") or patient_id_raw or "")
        intake_payload = {
            "visit_id": resolved_visit_id,
            "patient_id": encode_patient_id(intake_patient_id) if intake_patient_id else "",
            "status": str(intake.get("status") or "in_progress"),
            "illness": intake.get("illness"),
            "question_answers": normalized_answers,
            "language": intake.get("language"),
            "updated_at": intake.get("updated_at"),
            "created_at": intake.get("created_at"),
        }

    # Pre-visit summary: prefer embedded on visit, fall back to legacy collection.
    pre_visit_summary = None
    embedded_pre = dict((visit.get("pre_visit_summary") or {}))
    if embedded_pre:
        embedded_pre["patient_id"] = encode_patient_id(str(embedded_pre.get("patient_id") or patient_id_raw))
        pre_visit_summary = embedded_pre
    else:
        doc = db.pre_visit_summaries.find_one(
            {"patient_id": patient_id_raw, "visit_id": resolved_visit_id},
            sort=[("updated_at", -1)],
        )
        if doc:
            doc.pop("_id", None)
            doc["patient_id"] = encode_patient_id(str(doc.get("patient_id") or patient_id_raw))
            pre_visit_summary = doc

    vitals_use_case = StoreVitalsUseCase()
    vitals_form = vitals_use_case.get_latest_vitals_form(patient_id_raw, resolved_visit_id)
    latest_vitals = vitals_use_case.get_latest_vitals(patient_id_raw, resolved_visit_id)

    # Latest clinical note (default note type).
    clinical_note = None
    try:
        default_note_type = get_settings().default_note_type
        note = ClinicalNoteRepository().find_latest(
            patient_id=patient_id_raw,
            visit_id=resolved_visit_id,
            note_type=default_note_type,
        )
        if note:
            note.pop("_id", None)
            note["patient_id"] = encode_patient_id(str(note.get("patient_id") or patient_id_raw))
            clinical_note = note
    except Exception:
        clinical_note = None

    # Attach patient phone (used for recap drafts) even if patient block is partial.
    patient_phone = patient.get("phone_number")
    if isinstance(visit_payload.get("patient"), dict) and patient_phone is not None:
        visit_payload["patient"]["phone_number"] = patient_phone

    include_set = None
    if include and str(include).strip():
        include_set = {part.strip() for part in str(include).split(",") if part.strip()}
    out = {
        "visit": visit_payload,
        "intake_session": intake_payload,
        "pre_visit_summary": pre_visit_summary,
        "latest_vitals_form": vitals_form,
        "latest_vitals": latest_vitals,
        "clinical_note": clinical_note,
    }
    if include_set is not None:
        out = {k: v for k, v in out.items() if k in include_set}
    _visit_summary_cache.set(cache_key, out, ttl_sec=8.0)
    return out


@router.get("/{visit_id}/intake-session")
def get_visit_intake_session(visit_id: str) -> dict:
    """Return latest intake session question/answer history for a visit."""
    db = get_database()
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    intake = visit.get("intake_session")
    if not intake:
        return {
            "visit_id": resolved_visit_id,
            "status": "not_started",
            "question_answers": [],
            "illness": None,
            "language": None,
            "updated_at": None,
        }

    # NOTE: Auto-completing intake after inactivity is handled by a background sweeper.
    # This endpoint is read-only.
    normalized_answers: list[dict] = []
    for item in intake.get("answers", []):
        normalized_answers.append(
            {
                "question": str(item.get("question") or "").strip(),
                "answer": str(item.get("answer") or "").strip(),
                "topic": str(item.get("topic") or "").strip() or None,
                "asked_at": item.get("asked_at"),
                "answered_at": item.get("answered_at"),
            }
        )

    patient_id = str(intake.get("patient_id") or visit.get("patient_id") or "")
    return {
        "visit_id": resolved_visit_id,
        "patient_id": encode_patient_id(patient_id) if patient_id else "",
        "status": str(intake.get("status") or "in_progress"),
        "illness": intake.get("illness"),
        "question_answers": normalized_answers,
        "language": intake.get("language"),
        "updated_at": intake.get("updated_at"),
        "created_at": intake.get("created_at"),
    }


@router.patch("/{visit_id}/status")
def update_visit_status(visit_id: str, payload: VisitStatusUpdateRequest) -> dict:
    db = get_database()
    return _set_visit_status(db, visit_id, payload.status)


@router.post("/{visit_id}/queue")
def queue_visit(visit_id: str) -> dict:
    db = get_database()
    return _set_visit_status(db, visit_id, "in_queue")


@router.post("/{visit_id}/start")
def start_visit_consultation(visit_id: str) -> dict:
    db = get_database()
    return _set_visit_status(db, visit_id, "in_progress")


@router.post("/{visit_id}/complete")
def complete_visit(visit_id: str) -> dict:
    db = get_database()
    return _set_visit_status(db, visit_id, "completed")


@router.post("/{visit_id}/no-show")
def mark_visit_no_show(visit_id: str) -> dict:
    db = get_database()
    return _set_visit_status(db, visit_id, "no_show")


@router.delete("/{visit_id}")
def cancel_visit(visit_id: str) -> dict:
    db = get_database()
    visit = _find_visit(db, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    current_status = _normalize_visit_status(visit)
    if current_status in {"completed", "closed", "ended"}:
        raise HTTPException(status_code=409, detail="Completed visits cannot be cancelled")
    if current_status == "cancelled":
        return _public_visit_payload(visit)

    db.visits.update_one(
        _visit_update_query(visit, visit_id),
        {
            "$set": {
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc),
                **_workflow_stage_triplet_for_status("cancelled"),
            }
        },
    )
    refreshed = _find_visit(db, str(visit.get("visit_id") or visit.get("id") or visit_id)) or {}
    return _public_visit_payload(refreshed)
