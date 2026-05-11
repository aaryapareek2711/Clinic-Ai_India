"""Template API schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

TemplateType = Literal["personal", "practice", "community"]
TemplateSectionDetailLevel = Literal["brief", "detail"]

ALLOWED_TEMPLATE_SECTIONS = {
    "chief_complaint",
    "assessment",
    "plan",
    "investigations",
    "red_flags",
    "data_gaps",
    "follow_up_date",
    "rx",
    "doctor_notes",
}

# Sections where brief/detail meaningfully controls generated narrative verbosity.
NARRATIVE_TEMPLATE_SECTIONS = {
    "chief_complaint",
    "assessment",
    "plan",
    "doctor_notes",
    "red_flags",
    "data_gaps",
}


class TemplateMedication(BaseModel):
    """Medication row for clinical template."""

    medicine_name: str = ""
    dose: str = ""
    frequency: str = ""
    duration: str = ""
    route: str = ""
    food_instruction: str = ""


class TemplateInvestigation(BaseModel):
    """Investigation row for clinical template."""

    test_name: str = ""
    urgency: str = ""
    preparation_instructions: str = ""


class TemplateContent(BaseModel):
    """Reusable India clinical-note content block."""

    assessment: str = ""
    plan: str = ""
    rx: list[TemplateMedication] = []
    investigations: list[TemplateInvestigation] = []
    red_flags: list[str] = []
    follow_up_in: str = ""
    follow_up_date: str = ""
    doctor_notes: str = ""
    chief_complaint: str = ""
    data_gaps: list[str] = []
    # Template-driven generation controls (round-tripped to the frontend).
    included_sections: list[str] = []
    section_detail_level: dict[str, TemplateSectionDetailLevel] = {}
    section_order: list[str] = []

    @model_validator(mode="after")
    def validate_generation_controls(self) -> "TemplateContent":
        # Validate included sections are known keys (and normalized).
        normalized_included: list[str] = []
        seen: set[str] = set()
        for raw in self.included_sections or []:
            key = str(raw or "").strip()
            if not key:
                continue
            if key not in ALLOWED_TEMPLATE_SECTIONS:
                raise ValueError(f"invalid_included_section:{key}")
            if key not in seen:
                seen.add(key)
                normalized_included.append(key)
        self.included_sections = normalized_included

        # section_detail_level keys must be a subset of included_sections.
        included_set = set(self.included_sections)
        normalized_detail: dict[str, TemplateSectionDetailLevel] = {}
        for raw_key, raw_val in (self.section_detail_level or {}).items():
            key = str(raw_key or "").strip()
            if not key:
                continue
            if key not in included_set:
                raise ValueError(f"detail_level_key_not_included:{key}")
            if raw_val not in ("brief", "detail"):
                raise ValueError(f"invalid_detail_level:{key}")
            normalized_detail[key] = raw_val  # type: ignore[assignment]

        # Default brief/detail for included narrative sections when omitted.
        for key in included_set.intersection(NARRATIVE_TEMPLATE_SECTIONS):
            if key not in normalized_detail:
                normalized_detail[key] = "brief"

        self.section_detail_level = normalized_detail

        # Follow-up constraint: if either follow-up selector is provided, require exactly one.
        # Allow both empty so templates can omit follow-up hints entirely.
        has_in = bool(str(self.follow_up_in or "").strip())
        has_date = bool(str(self.follow_up_date or "").strip())
        if has_in and has_date:
            raise ValueError("use_exactly_one_of_follow_up_in_or_follow_up_date")

        return self


class CreateTemplateRequest(BaseModel):
    """Create template request payload."""

    name: str = Field(..., min_length=1)
    description: str = ""
    type: TemplateType = "personal"
    category: str = "General"
    specialty: str = ""
    content: TemplateContent
    tags: list[str] = []
    appointment_types: list[str] = []
    is_favorite: bool = False
    author_id: str | None = None
    author_name: str | None = None


class UpdateTemplateRequest(BaseModel):
    """Update template request payload."""

    name: str | None = None
    description: str | None = None
    type: TemplateType | None = None
    category: str | None = None
    specialty: str | None = None
    content: TemplateContent | None = None
    tags: list[str] | None = None
    appointment_types: list[str] | None = None
    is_favorite: bool | None = None
    is_active: bool | None = None


class TemplateResponse(BaseModel):
    """Template document response payload."""

    id: str
    name: str
    description: str
    type: TemplateType
    category: str
    specialty: str
    content: TemplateContent
    tags: list[str]
    appointment_types: list[str]
    is_favorite: bool
    author_id: str
    author_name: str
    usage_count: int
    last_used: datetime | None = None
    created_at: datetime
    updated_at: datetime
    is_active: bool


class ListTemplatesResponse(BaseModel):
    """Paginated template list response."""

    items: list[TemplateResponse]
    total: int
    page: int
    page_size: int


class RecordTemplateUsageRequest(BaseModel):
    """Template usage analytics payload."""

    visit_id: str | None = None
    patient_id: str | None = None


class ToggleTemplateFavoriteResponse(BaseModel):
    """Favorite toggle response."""

    id: str
    is_favorite: bool


class OkResponse(BaseModel):
    """Simple success payload."""

    ok: bool
