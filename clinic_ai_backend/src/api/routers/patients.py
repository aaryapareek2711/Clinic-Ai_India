"""Patient routes module."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException

from src.adapters.db.mongo.client import get_database
from src.application.services.intake_chat_service import IntakeChatService
from src.application.utils.patient_id_crypto import encode_patient_id, resolve_internal_patient_id
from src.domain.value_objects.patient_id import PatientId
from src.domain.value_objects.visit_id import VisitId
from src.api.schemas.patient import (
    CreateVisitFromPatientRequest,
    CreateVisitFromPatientResponse,
    PatientRegisterRequest,
    PatientRegisterResponse,
    PatientSummaryResponse,
)

router = APIRouter(prefix="/api/patients", tags=["Patients"])
TERMINAL_VISIT_STATUSES = {"completed", "complete", "closed", "ended", "cancelled", "no_show"}


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
def list_patients() -> list[PatientSummaryResponse]:
    """Return normalized patient records for frontend patient picker."""
    db = get_database()
    records = list(
        db.patients.find(
            {},
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


@router.get("/{patient_id}/latest-visit")
def get_latest_visit_for_patient(patient_id: str) -> dict:
    """Return latest existing visit for a patient (no new visit creation)."""
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
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
def register_patient(payload: PatientRegisterRequest) -> PatientRegisterResponse:
    """Register patient by hospital staff (visit workflow starts on New Visit creation)."""
    try:
        # Reuse patient only when both name and phone map to same deterministic id.
        internal_patient_id = PatientId.generate(payload.name, payload.phone_number)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    visit_id = VisitId.validate(VisitId.generate())
    now = datetime.now(timezone.utc)
    scheduled_start = None
    if payload.appointment_date and payload.appointment_time:
        scheduled_start = f"{payload.appointment_date}T{payload.appointment_time}:00"
        _require_appointment_not_in_past(scheduled_start)
    db = get_database()
    existing_patient = db.patients.find_one({"patient_id": internal_patient_id}) is not None
    db.patients.update_one(
        {"patient_id": internal_patient_id},
        {
            "$set": {
                "patient_id": internal_patient_id,
                "name": payload.name,
                "phone_number": payload.phone_number.strip(),
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
    phone_number = str(payload.phone_number or "").strip()
    if scheduled_start and phone_number and not is_walk_in:
        try:
            IntakeChatService().start_intake(
                patient_id=internal_patient_id,
                visit_id=visit_id,
                to_number=phone_number,
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
) -> CreateVisitFromPatientResponse:
    """Create a new open visit for an existing patient and trigger intake on this visit_id."""
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    db = get_database()
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
