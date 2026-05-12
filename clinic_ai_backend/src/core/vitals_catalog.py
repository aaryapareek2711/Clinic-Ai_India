"""Canonical optional vitals (beyond fixed weight + BP) for LLM form generation."""
from __future__ import annotations

from typing import Any

# Fixed on every form via StoreVitalsUseCase._fixed_common_vitals_fields — not selectable here.
_FIXED_VITAL_KEYS = frozenset({"body_weight_kg", "blood_pressure_mmhg"})

# Chief-complaint extras: model may only return keys from this set (after alias normalization).
VITAL_CONTEXT_CATALOG: list[dict[str, Any]] = [
    {
        "key": "temperature_f",
        "label": "Temperature",
        "field_type": "number",
        "unit": "°F",
        "notes": "Body temperature in Fahrenheit.",
    },
    {
        "key": "heart_rate_bpm",
        "label": "Heart rate / pulse",
        "field_type": "number",
        "unit": "bpm",
        "notes": "Resting or current pulse rate.",
    },
    {
        "key": "respiratory_rate",
        "label": "Respiratory rate",
        "field_type": "number",
        "unit": "breaths/min",
        "notes": "Breaths per minute.",
    },
    {
        "key": "spo2_percent",
        "label": "SpO₂ / oxygen saturation",
        "field_type": "number",
        "unit": "%",
        "notes": "Pulse oximetry reading.",
    },
    {
        "key": "height_cm",
        "label": "Height",
        "field_type": "number",
        "unit": "cm",
        "notes": "Standing height in centimetres.",
    },
    {
        "key": "random_blood_sugar_mg_dl",
        "label": "Blood sugar (random / RBS)",
        "field_type": "number",
        "unit": "mg/dL",
        "notes": "Random capillary or plasma glucose when clinically relevant.",
    },
]

VITAL_CONTEXT_BY_KEY: dict[str, dict[str, Any]] = {row["key"]: row for row in VITAL_CONTEXT_CATALOG}

# Raw model keys / synonyms → canonical catalog key (lowercase snake).
_CONTEXTUAL_VITAL_ALIASES: dict[str, str] = {}
for row in VITAL_CONTEXT_CATALOG:
    k = row["key"]
    _CONTEXTUAL_VITAL_ALIASES[k] = k

_EXTRA_ALIASES: dict[str, str] = {
    "temp": "temperature_f",
    "temperature": "temperature_f",
    "body_temperature": "temperature_f",
    "body_temp": "temperature_f",
    "temperature_c": "temperature_f",
    "temp_c": "temperature_f",
    "temp_f": "temperature_f",
    "pulse": "heart_rate_bpm",
    "heart_rate": "heart_rate_bpm",
    "hr": "heart_rate_bpm",
    "rr": "respiratory_rate",
    "resp_rate": "respiratory_rate",
    "respiratory_rate_bpm": "respiratory_rate",
    "respiration_rate": "respiratory_rate",
    "spo2": "spo2_percent",
    "oxygen_saturation": "spo2_percent",
    "o2_sat": "spo2_percent",
    "height": "height_cm",
    "rbs": "random_blood_sugar_mg_dl",
    "blood_sugar": "random_blood_sugar_mg_dl",
    "blood_glucose": "random_blood_sugar_mg_dl",
    "random_blood_sugar": "random_blood_sugar_mg_dl",
    "random_glucose": "random_blood_sugar_mg_dl",
}
_CONTEXTUAL_VITAL_ALIASES.update(_EXTRA_ALIASES)

ALLOWED_CONTEXTUAL_VITAL_KEYS = frozenset(VITAL_CONTEXT_BY_KEY.keys())


def normalize_contextual_vital_key(raw_key: str) -> str | None:
    """Map LLM/user key variants to a single catalog key, or None if not allowed."""
    key = str(raw_key or "").strip().lower().replace(" ", "_").replace("-", "_")
    if not key:
        return None
    if key in _FIXED_VITAL_KEYS:
        return None
    if key in _CONTEXTUAL_VITAL_ALIASES:
        return _CONTEXTUAL_VITAL_ALIASES[key]
    return None


def vital_catalog_json_for_prompt() -> list[dict[str, Any]]:
    """Minimal rows injected into the vitals LLM prompt."""
    return [
        {"key": r["key"], "label": r["label"], "unit": r.get("unit"), "notes": r.get("notes", "")}
        for r in VITAL_CONTEXT_CATALOG
    ]
