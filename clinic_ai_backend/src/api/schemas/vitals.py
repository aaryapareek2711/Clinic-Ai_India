"""Vitals API schemas module."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PatientLookupRequest(BaseModel):
    """Lookup request by name and phone."""

    name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=8, max_length=20)


class PatientLookupResponse(BaseModel):
    """Lookup response with resolved patient."""

    patient_id: str
    visit_id: str | None
    name: str
    phone_number: str


class VitalsField(BaseModel):
    """Dynamic vitals field metadata."""

    key: str
    label: str
    field_type: str
    unit: str | None = None
    required: bool
    reason: str


class VitalsFormResponse(BaseModel):
    """AI-generated vitals form response."""

    form_id: str
    patient_id: str
    visit_id: str | None = None
    needs_vitals: bool
    reason: str
    fields: list[VitalsField]
    generated_at: datetime


class VitalsSubmitRequest(BaseModel):
    """Vitals submission payload."""

    patient_id: str
    visit_id: str
    form_id: str | None = None
    staff_name: str = Field(min_length=1, max_length=120)
    values: dict[str, str | int | float | bool | None]


class VitalsSubmitResponse(BaseModel):
    """Vitals submission response payload."""

    vitals_id: str
    patient_id: str
    visit_id: str | None = None
    submitted_at: datetime


class LatestVitalsResponse(BaseModel):
    """Latest submitted vitals."""

    vitals_id: str
    patient_id: str
    visit_id: str | None = None
    form_id: str | None = None
    staff_name: str
    submitted_at: datetime
    values: dict[str, str | int | float | bool | None]
