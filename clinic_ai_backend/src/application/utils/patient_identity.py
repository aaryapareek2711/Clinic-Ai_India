"""Stable patient identity derived from demographics (name + phone)."""
from __future__ import annotations

import uuid

# Fixed namespace so UUID5 patient ids are stable for this product only.
_PATIENT_ID_NAMESPACE = uuid.UUID("a3f7c2d1-4b8e-5c9d-a1e2-3f4b5c6d7e8f")


def normalize_patient_identity(name: str, phone_number: str) -> tuple[str, str]:
    """Return normalized (name, digits-only phone) used for id derivation."""
    normalized_name = " ".join((name or "").strip().lower().split())
    normalized_phone = "".join(ch for ch in str(phone_number or "") if ch.isdigit())
    return normalized_name, normalized_phone


def stable_patient_id(name: str, phone_number: str) -> str:
    """Deterministic patient primary key from name + phone (UUID5)."""
    normalized_name, normalized_phone = normalize_patient_identity(name, phone_number)
    if not normalized_name or not normalized_phone:
        raise ValueError("name and phone_number are required to derive patient_id")
    return str(uuid.uuid5(_PATIENT_ID_NAMESPACE, f"{normalized_name}|{normalized_phone}"))
