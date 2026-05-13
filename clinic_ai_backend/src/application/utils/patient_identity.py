"""Stable patient identity derived from demographics (name + phone)."""
from __future__ import annotations

from src.domain.value_objects.patient_id import PatientId


def normalize_patient_identity(
    name: str, phone_number: str, *, doctor_id: str | None = None
) -> tuple[str, str]:
    """Return normalized (clean_name, digits-only phone) used for id derivation."""
    generated = PatientId.generate(name, phone_number, doctor_id=doctor_id)
    parts = generated.split("_")
    if len(parts) == 2:
        return parts[0], parts[1]
    if len(parts) == 3:
        return parts[1], parts[2]
    raise ValueError("unexpected patient id shape")


def stable_patient_id(name: str, phone_number: str, *, doctor_id: str | None = None) -> str:
    """Deterministic patient id; pass ``doctor_id`` for tenant-scoped identity."""
    return PatientId.generate(name, phone_number, doctor_id=doctor_id)
