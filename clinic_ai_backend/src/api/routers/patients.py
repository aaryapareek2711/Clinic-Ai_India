"""Patient routes module."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from src.adapters.db.mongo.client import get_database
from src.application.services.intake_chat_service import IntakeChatService
from src.application.utils.patient_identity import stable_patient_id
from src.api.schemas.patient import (
    CreateVisitFromPatientRequest,
    CreateVisitFromPatientResponse,
    PatientRegisterRequest,
    PatientRegisterResponse,
    PatientSummaryResponse,
)

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=list[PatientSummaryResponse])
def list_patients() -> list[PatientSummaryResponse]:
    """Return normalized patient records for frontend patient picker."""
    db = get_database()
    records = db.patients.find({}, {"_id": 0}).sort("updated_at", -1)
    patients: list[PatientSummaryResponse] = []

    for record in records:
        full_name = (record.get("name") or "").strip()
        name_parts = [part for part in full_name.split(" ") if part]
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        patient_id = str(record.get("patient_id") or "")
        age = record.get("age")
        year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970
        estimated_dob = f"{year:04d}-01-01"

        patients.append(
            PatientSummaryResponse(
                id=patient_id,
                patient_id=patient_id,
                first_name=first_name,
                last_name=last_name,
                full_name=full_name or first_name,
                date_of_birth=str(record.get("date_of_birth") or estimated_dob),
                mrn=str(record.get("mrn") or patient_id),
            )
        )

    return patients


@router.post("/register", response_model=PatientRegisterResponse)
def register_patient(payload: PatientRegisterRequest) -> PatientRegisterResponse:
    """Register patient by hospital staff (visit workflow starts on New Visit creation)."""
    patient_id = stable_patient_id(payload.name, payload.phone_number)
    now = datetime.now(timezone.utc)
    db = get_database()
    db.patients.update_one(
        {"patient_id": patient_id},
        {
            "$set": {
                "patient_id": patient_id,
                "name": payload.name,
                "phone_number": payload.phone_number.strip(),
                "age": payload.age,
                "gender": payload.gender,
                "preferred_language": payload.preferred_language,
                "travelled_recently": payload.travelled_recently,
                "constant": payload.constant,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    return PatientRegisterResponse(patient_id=patient_id, whatsapp_triggered=True)


@router.post("/{patient_id}/visits", response_model=CreateVisitFromPatientResponse)
def create_visit_from_existing_patient(
    patient_id: str,
    payload: CreateVisitFromPatientRequest,
) -> CreateVisitFromPatientResponse:
    """Create a new open visit for an existing patient and trigger intake on this visit_id."""
    db = get_database()
    patient = db.patients.find_one(
        {"patient_id": patient_id},
        {"_id": 0, "patient_id": 1, "phone_number": 1, "preferred_language": 1},
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visit_id = str(uuid4())
    now = datetime.now(timezone.utc)
    db.visits.insert_one(
        {
            "visit_id": visit_id,
            "patient_id": patient_id,
            "provider_id": payload.provider_id,
            "scheduled_start": payload.scheduled_start,
            "status": "open",
            "created_at": now,
            "updated_at": now,
        }
    )

    intake_triggered = False
    phone_number = str(patient.get("phone_number") or "").strip()
    if phone_number:
        IntakeChatService().start_intake(
            patient_id=patient_id,
            visit_id=visit_id,
            to_number=phone_number,
            language=str(patient.get("preferred_language") or "en"),
        )
        intake_triggered = True

    return CreateVisitFromPatientResponse(
        patient_id=patient_id,
        visit_id=visit_id,
        status="open",
        scheduled_start=payload.scheduled_start,
        intake_triggered=intake_triggered,
    )
