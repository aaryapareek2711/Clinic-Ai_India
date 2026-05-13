"""Patient ID value object."""
from __future__ import annotations

import re


class PatientId:
    """Deterministic patient ID: legacy ``{clean_name}_{clean_phone}`` or scoped ``{doctor_slug}_{clean_name}_{clean_phone}``."""

    _name_pattern = re.compile(r"[^a-zA-Z0-9]+")
    # Legacy: john_919876543210 — Scoped: doc001_john_919876543210
    _legacy_pattern = re.compile(r"^([a-z0-9]+)_([0-9]+)$")
    _scoped_pattern = re.compile(r"^([a-z0-9]+)_([a-z0-9]+)_([0-9]+)$")

    @staticmethod
    def _doctor_slug(doctor_id: str) -> str:
        raw = re.sub(r"[^a-z0-9]", "", str(doctor_id or "").strip().lower())
        return raw or "unknown"

    @staticmethod
    def generate(first_name: str, mobile: str, *, doctor_id: str | None = None) -> str:
        clean_name = PatientId._name_pattern.sub("", str(first_name or "")).lower()
        clean_phone = "".join(ch for ch in str(mobile or "") if ch.isdigit())
        if not clean_name:
            raise ValueError("first_name must contain at least one alphanumeric character")
        if not clean_phone:
            raise ValueError("mobile must contain at least one digit")
        if doctor_id is None:
            return f"{clean_name}_{clean_phone}"
        doc_slug = PatientId._doctor_slug(doctor_id)
        return f"{doc_slug}_{clean_name}_{clean_phone}"

    @staticmethod
    def validate(value: str) -> str:
        normalized = str(value or "").strip()
        if PatientId._legacy_pattern.fullmatch(normalized):
            return normalized
        if PatientId._scoped_pattern.fullmatch(normalized):
            return normalized
        raise ValueError(
            "patient_id must match <name>_<digits> or <doctor_slug>_<name>_<digits>",
        )
