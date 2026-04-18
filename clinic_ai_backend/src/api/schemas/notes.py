"""Notes API schemas module."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


NoteType = Literal["india_clinical", "soap", "post_visit_summary"]
NoteStatus = Literal["generated", "fallback_generated", "failed"]
InvestigationUrgency = Literal["routine", "urgent", "stat"]


class MedicationItem(BaseModel):
    """Medication line item in India clinical note."""

    medicine_name: str
    dose: str
    frequency: str
    duration: str
    route: str
    food_instruction: str
    generic_available: bool | None = None


class InvestigationItem(BaseModel):
    """Investigation line item in India clinical note."""

    test_name: str
    urgency: InvestigationUrgency
    preparation_instructions: str | None = None
    routing_note: str | None = None


class IndiaClinicalNotePayload(BaseModel):
    """Strict India OPD note output contract."""

    assessment: str = Field(..., description="1-3 sentence clinical assessment in English")
    plan: str = Field(..., description="Brief actionable next steps")
    rx: list[MedicationItem]
    investigations: list[InvestigationItem]
    red_flags: list[str]
    follow_up_in: str | None = Field(default=None, description='Use this OR follow_up_date (e.g. "7 days")')
    follow_up_date: date | None = Field(default=None, description="Use this OR follow_up_in")
    doctor_notes: str | None = None
    chief_complaint: str | None = Field(
        default=None,
        description="Optional input context captured from transcript, not a generated section",
    )
    data_gaps: list[str]

    @model_validator(mode="after")
    def validate_follow_up_exclusivity(self) -> "IndiaClinicalNotePayload":
        """Require exactly one follow-up selector."""
        has_follow_up_in = bool((self.follow_up_in or "").strip())
        has_follow_up_date = self.follow_up_date is not None
        if has_follow_up_in == has_follow_up_date:
            raise ValueError("Use exactly one of follow_up_in or follow_up_date")
        return self


class PostVisitSummaryPayload(BaseModel):
    """Patient-friendly post-visit summary output contract."""

    visit_reason: str
    what_doctor_found: str
    medicines_to_take: list[str]
    tests_recommended: list[str]
    self_care: list[str]
    warning_signs: list[str]
    follow_up: str


class NoteGenerateRequest(BaseModel):
    """Generate/re-generate note request."""

    patient_id: str
    visit_id: str
    transcription_job_id: str | None = None
    note_type: NoteType | None = None
    preferred_language: str | None = None


class NoteGenerateResponse(BaseModel):
    """Persisted note response payload."""

    note_id: str
    patient_id: str
    visit_id: str | None
    note_type: NoteType
    source_job_id: str | None
    status: NoteStatus
    version: int
    created_at: datetime
    payload: IndiaClinicalNotePayload | PostVisitSummaryPayload
    whatsapp_payload: str | None = None
    legacy: bool = False
