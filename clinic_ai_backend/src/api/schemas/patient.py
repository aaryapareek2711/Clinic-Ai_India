"""Patient API schemas module."""
from pydantic import BaseModel, Field


class PatientRegisterRequest(BaseModel):
    """Request body for staff-driven patient registration."""

    name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=8, max_length=20)
    age: int = Field(ge=0, le=130)
    preferred_language: str = Field(default="en", pattern="^(en|hi)$")


class PatientRegisterResponse(BaseModel):
    """Response body for registration endpoint."""

    patient_id: str
    whatsapp_triggered: bool
