"""India clinical note context helpers."""
from __future__ import annotations

from src.application.use_cases.generate_india_clinical_note import _sanitize_structured_dialogue_for_context


def test_sanitize_structured_dialogue_empty() -> None:
    assert _sanitize_structured_dialogue_for_context(None) is None
    assert _sanitize_structured_dialogue_for_context([]) is None
    assert _sanitize_structured_dialogue_for_context({}) is None  # type: ignore[arg-type]


def test_sanitize_structured_dialogue_keeps_turns() -> None:
    raw = [
        {"Doctor": " Start diabetes review. "},
        {"Patient": " A1c was 7.5. "},
        {"Family Member": " Asks about diet. "},
    ]
    out = _sanitize_structured_dialogue_for_context(raw)
    assert out == [
        {"Doctor": "Start diabetes review."},
        {"Patient": "A1c was 7.5."},
        {"Family Member": "Asks about diet."},
    ]


def test_sanitize_structured_dialogue_skips_empty_turns() -> None:
    raw = [{"Doctor": ""}, {"Patient": "Ok"}, {"Unknown": "   "}]
    out = _sanitize_structured_dialogue_for_context(raw)
    assert out == [{"Patient": "Ok"}]
