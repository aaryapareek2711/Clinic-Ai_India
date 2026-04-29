"""Visit routes module."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from src.adapters.db.mongo.client import get_database
from src.api.schemas.patient import ScheduleVisitIntakeRequest, ScheduleVisitIntakeResponse
from src.application.services.intake_chat_service import IntakeChatService
from src.application.utils.patient_id_crypto import encode_patient_id

router = APIRouter(prefix="/api/visits", tags=["Visits"])


def _extract_chief_complaint(db, patient_id: str, visit_id: str) -> str | None:
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
    session = db.intake_sessions.find_one({"visit_id": visit_id}, sort=[("updated_at", -1)])
    if not session:
        return True, False
    status = str(session.get("status") or "")
    if status == "stopped":
        return True, False
    return False, True


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
    visit = db.visits.find_one({"visit_id": visit_id}) or db.visits.find_one({"id": visit_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or visit_id)
    internal_patient_id = str(visit.get("patient_id") or "")
    if not internal_patient_id:
        raise HTTPException(status_code=422, detail="Visit has no patient_id")

    now = datetime.now(timezone.utc)
    update_query = {"visit_id": resolved_visit_id} if visit.get("visit_id") else {"id": resolved_visit_id}
    db.visits.update_one(
        update_query,
        {"$set": {"scheduled_start": scheduled_start, "updated_at": now}},
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
def list_provider_upcoming_visits(provider_id: str) -> dict:
    """Return provider visits from Mongo for dashboard/calendar."""
    db = get_database()
    now = datetime.now(timezone.utc)
    records = list(
        db.visits.find(
            {
                "status": {"$ne": "cancelled"},
                "$or": [
                    {"provider_id": provider_id},
                    {"provider_id": None},
                    {"provider_id": {"$exists": False}},
                ],
            },
            {"_id": 0},
        ).sort("scheduled_start", 1)
    )

    appointments: list[dict] = []
    for visit in records:
        patient_id = str(visit.get("patient_id") or "")
        resolved_visit_id = str(visit.get("visit_id") or visit.get("id") or "")
        if not resolved_visit_id:
            continue
        patient = db.patients.find_one({"patient_id": patient_id}, {"_id": 0}) or {}
        patient_name = (patient.get("name") or "").strip() or "Unknown Patient"
        scheduled_start = visit.get("scheduled_start")
        chief_complaint = visit.get("chief_complaint") or _extract_chief_complaint(db, patient_id, resolved_visit_id)
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
            }
        )

    return {"appointments": appointments}


@router.get("/{visit_id}")
def get_visit(visit_id: str) -> dict:
    """Return visit details for visit workflow page."""
    db = get_database()
    visit = db.visits.find_one(
        {
            "$or": [
                {"visit_id": visit_id},
                {"id": visit_id},
            ]
        },
        {"_id": 0},
    )
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

    resolved_chief_complaint = visit.get("chief_complaint") or _extract_chief_complaint(db, patient_id, resolved_visit_id)
    return {
        "id": resolved_visit_id,
        "patient_id": encode_patient_id(patient_id) if patient_id else "",
        "provider_id": str(visit.get("provider_id") or ""),
        "appointment_id": visit.get("appointment_id"),
        "visit_type": str(visit.get("visit_type") or "Visit"),
        "status": str(visit.get("status") or "open"),
        "chief_complaint": resolved_chief_complaint,
        "reason_for_visit": visit.get("reason_for_visit"),
        "scheduled_start": visit.get("scheduled_start"),
        "actual_start": visit.get("actual_start"),
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
