"""Vitals field sanitization and submit validation."""
from __future__ import annotations

from src.application.use_cases.store_vitals import StoreVitalsUseCase


def test_sanitize_dedupes_and_caps_fields() -> None:
    raw = [
        {"key": "temperature_c", "label": "Temp", "field_type": "number", "unit": "C", "required": True, "reason": "fever"},
        {"key": "temperature_c", "label": "Dup", "field_type": "number", "unit": "C", "required": True, "reason": "x"},
        {"key": "BAD KEY!", "label": "x", "field_type": "number", "unit": None, "required": True, "reason": "y"},
    ]
    out = StoreVitalsUseCase._sanitize_vitals_fields(raw)
    assert len(out) == 1
    assert out[0]["key"] == "temperature_c"


def test_sanitize_invalid_field_type_becomes_text() -> None:
    raw = [
        {
            "key": "note",
            "label": "Note",
            "field_type": "weird",
            "unit": None,
            "required": False,
            "reason": "r",
        }
    ]
    out = StoreVitalsUseCase._sanitize_vitals_fields(raw)
    assert out[0]["field_type"] == "text"
