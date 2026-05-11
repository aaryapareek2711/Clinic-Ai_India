from __future__ import annotations

from src.workers.transcription_worker import TranscriptionWorker


def test_explicit_kannada_maps_to_kn_in_only() -> None:
    plan = TranscriptionWorker._build_locale_plan("kannada")
    assert plan["mode"] == "explicit"
    assert plan["primary_locale"] == "kn-IN"
    assert plan["candidates"] == ["kn-IN"]


def test_hinglish_uses_hi_en_candidates() -> None:
    plan = TranscriptionWorker._build_locale_plan("hinglish")
    assert plan["mode"] == "hinglish_auto"
    assert plan["primary_locale"] == "hi-IN"
    assert plan["candidates"] == ["hi-IN", "en-IN"]


def test_empty_language_uses_multilingual_auto_detect_candidates() -> None:
    plan = TranscriptionWorker._build_locale_plan("")
    assert plan["mode"] == "auto_detect"
    assert "kn-IN" in plan["candidates"]
    assert "bn-IN" in plan["candidates"]
    assert "ta-IN" in plan["candidates"]
    assert "te-IN" in plan["candidates"]


def test_generic_speakers_are_preserved() -> None:
    assert TranscriptionWorker._canonical_speaker("speaker_1") == "Speaker 1"
    assert TranscriptionWorker._canonical_speaker("speaker_2") == "Speaker 2"
    assert TranscriptionWorker._canonical_speaker("doctor") == "Doctor"
    assert TranscriptionWorker._canonical_speaker("patient") == "Patient"
