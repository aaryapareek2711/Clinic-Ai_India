"""Patient API schemas module."""
from pydantic import BaseModel, Field
from pydantic import field_validator


class PatientRegisterRequest(BaseModel):
    """Request body for staff-driven patient registration."""

    name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=8, max_length=20)
    age: int = Field(ge=0, le=130)
    gender: str = Field(min_length=1, max_length=20)
    preferred_language: str = Field(default="en")
    travelled_recently: bool = Field(default=False)
    constant: bool = Field(default=True)

    @field_validator("preferred_language")
    @classmethod
    def validate_preferred_language(cls, value: str) -> str:
        """Accept language aliases and normalize to supported app values."""
        normalized = (value or "").strip()
        if normalized == "en_US":
            return "en"
        if normalized in {"en", "hi"}:
            return normalized
        raise ValueError("preferred_language must be one of: en, hi, en_US")


class PatientRegisterResponse(BaseModel):
    """Response body for registration endpoint."""

    patient_id: str
    visit_id: str
    whatsapp_triggered: bool
