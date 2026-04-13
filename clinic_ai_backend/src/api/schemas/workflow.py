"""Workflow API schemas module."""
from pydantic import BaseModel


class ChiefComplaintSection(BaseModel):
    """Chief complaint section."""

    reason_for_visit: str
    symptom_duration_or_onset: str


class HPISection(BaseModel):
    """HPI section."""

    associated_symptoms: list[str]
    symptom_severity_or_progression: str
    impact_on_daily_life: str


class CurrentMedicationSection(BaseModel):
    """Current medication and home remedies section."""

    medications_or_home_remedies: str


class PastHistoryAllergiesSection(BaseModel):
    """Past medical history and allergies section."""

    past_medical_history: str
    allergies: str


class PreVisitSections(BaseModel):
    """All five pre-visit summary sections."""

    chief_complaint: ChiefComplaintSection
    hpi: HPISection
    current_medication: CurrentMedicationSection
    past_medical_history_allergies: PastHistoryAllergiesSection
    red_flag_indicators: list[str]


class PreVisitSummaryResponse(BaseModel):
    """Pre-visit summary response payload."""

    patient_id: str
    intake_session_id: str
    language: str
    status: str
    sections: PreVisitSections
