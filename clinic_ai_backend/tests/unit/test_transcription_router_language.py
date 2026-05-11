from __future__ import annotations

from src.api.routers.transcription import _normalize_language_mix


def test_normalize_language_mix_defaults_to_auto() -> None:
    assert _normalize_language_mix("") == "auto"
    assert _normalize_language_mix("default") == "auto"
    assert _normalize_language_mix("string") == "auto"
    assert _normalize_language_mix("auto") == "auto"


def test_normalize_language_mix_keeps_explicit_language() -> None:
    assert _normalize_language_mix("kannada") == "kannada"
    assert _normalize_language_mix("hi-IN") == "hi-in"
