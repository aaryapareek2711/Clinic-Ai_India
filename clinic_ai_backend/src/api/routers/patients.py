"""Patient routes module."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter

from src.adapters.db.mongo.client import get_database
from src.application.services.intake_chat_service import IntakeChatService
from src.api.schemas.patient import PatientRegisterRequest, PatientRegisterResponse

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post("/register", response_model=PatientRegisterResponse)
def register_patient(payload: PatientRegisterRequest) -> PatientRegisterResponse:
    """Register patient by hospital staff and trigger intake WhatsApp."""
    patient_id = str(uuid4())
    db = get_database()
    db.patients.insert_one(
        {
            "patient_id": patient_id,
            "name": payload.name,
            "phone_number": payload.phone_number,
            "age": payload.age,
            "gender": payload.gender,
            "preferred_language": payload.preferred_language,
            "travelled_recently": payload.travelled_recently,
            "constant": payload.constant,
            "created_at": datetime.now(timezone.utc),
        }
    )

    IntakeChatService().start_intake(
        patient_id=patient_id,
        to_number=payload.phone_number,
        language=payload.preferred_language,
    )
    return PatientRegisterResponse(patient_id=patient_id, whatsapp_triggered=True)
