"""Vitals API schemas module."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


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


class VitalsValueEntry(BaseModel):
    """Single vital measurement; `key` must match `fields[].key` from the generated form."""

    key: str = Field(
        min_length=1,
        max_length=64,
        description="Machine key from POST /vitals/generate-form/{patient_id}/{visit_id} → fields[].key",
        examples=["temperature_c", "blood_pressure"],
    )
    value: str | int | float | bool | None = Field(
        description="Staff-entered value (number, text such as 120/80, boolean, etc.)",
    )


class VitalsSubmitRequest(BaseModel):
    """Vitals submission payload."""

    patient_id: str
    visit_id: str
    form_id: str | None = Field(
        default=None,
        description="Latest form_id from generate-form; required to validate keys against that form.",
    )
    staff_name: str = Field(min_length=1, max_length=120, description="Staff member capturing vitals")
    values: list[VitalsValueEntry] = Field(
        description="One object per vital; only use keys returned on the vitals form for this visit.",
    )

    @model_validator(mode="before")
    @classmethod
    def _coerce_legacy_flat_dict(cls, data: Any) -> Any:
        """Allow legacy clients that POST values as a JSON object map."""
        if not isinstance(data, dict):
            return data
        raw_values = data.get("values")
        if isinstance(raw_values, dict):
            coerced = [{"key": str(k), "value": v} for k, v in raw_values.items()]
            return {**data, "values": coerced}
        return data

    def values_as_dict(self) -> dict[str, str | int | float | bool | None]:
        """Flatten to the shape stored in Mongo."""
        return {entry.key: entry.value for entry in self.values}


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
    values: dict[str, str | int | float | bool | None] = Field(
        description="Map of vital key → submitted value (same keys as the form at submit time).",
    )
