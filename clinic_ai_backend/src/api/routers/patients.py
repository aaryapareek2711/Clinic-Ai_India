"""Patient routes module."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter

from src.adapters.db.mongo.client import get_database
from src.application.services.intake_chat_service import IntakeChatService
from src.application.utils.patient_identity import stable_patient_id
from src.api.schemas.patient import PatientRegisterRequest, PatientRegisterResponse

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post("/register", response_model=PatientRegisterResponse)
def register_patient(payload: PatientRegisterRequest) -> PatientRegisterResponse:
    """Register patient by hospital staff and trigger intake WhatsApp."""
    patient_id = stable_patient_id(payload.name, payload.phone_number)
    visit_id = str(uuid4())
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
    db.visits.insert_one(
        {
            "visit_id": visit_id,
            "patient_id": patient_id,
            "status": "open",
            "created_at": now,
        }
    )

    IntakeChatService().start_intake(
        patient_id=patient_id,
        visit_id=visit_id,
        to_number=payload.phone_number,
        language=payload.preferred_language,
    )
    return PatientRegisterResponse(patient_id=patient_id, visit_id=visit_id, whatsapp_triggered=True)
