"""Vitals catalog key normalization."""
from src.core.vitals_catalog import normalize_contextual_vital_key


def test_normalize_maps_temperature_aliases() -> None:
    assert normalize_contextual_vital_key("temperature_c") == "temperature_f"
    assert normalize_contextual_vital_key("TEMP_F") == "temperature_f"


def test_normalize_rejects_weight_and_bp() -> None:
    assert normalize_contextual_vital_key("body_weight_kg") is None
    assert normalize_contextual_vital_key("weight_kg") is None
    assert normalize_contextual_vital_key("blood_pressure_mmhg") is None


def test_normalize_unknown_returns_none() -> None:
    assert normalize_contextual_vital_key("pain_score_0_10") is None
