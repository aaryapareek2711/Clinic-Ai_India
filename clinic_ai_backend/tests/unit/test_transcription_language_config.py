from __future__ import annotations

from src.workers.transcription_worker import TranscriptionWorker


def test_explicit_kannada_maps_to_kn_in_only() -> None:
    plan = TranscriptionWorker._build_locale_plan("kannada")
    assert plan["mode"] == "explicit"
    assert plan["primary_locale"] == "kn-IN"
    assert plan["candidates"] == ["kn-IN"]


def test_explicit_bengali_tamil_telugu_hindi_map_correctly() -> None:
    assert TranscriptionWorker._build_locale_plan("bengali")["primary_locale"] == "bn-IN"
    assert TranscriptionWorker._build_locale_plan("tamil")["primary_locale"] == "ta-IN"
    assert TranscriptionWorker._build_locale_plan("telugu")["primary_locale"] == "te-IN"
    assert TranscriptionWorker._build_locale_plan("hindi")["primary_locale"] == "hi-IN"


def test_explicit_urdu_and_punjabi_map_correctly() -> None:
    assert TranscriptionWorker._build_locale_plan("urdu")["primary_locale"] == "ur-IN"
    assert TranscriptionWorker._build_locale_plan("punjabi")["primary_locale"] == "pa-IN"


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
    assert "or-IN" in plan["candidates"]
    assert "pa-IN" in plan["candidates"]
    assert "ur-IN" in plan["candidates"]


def test_explicit_odia_punjabi_urdu_map_to_expected_locales() -> None:
    odia = TranscriptionWorker._build_locale_plan("odia")
    assert odia["mode"] == "explicit"
    assert odia["primary_locale"] == "or-IN"

    punjabi = TranscriptionWorker._build_locale_plan("punjabi")
    assert punjabi["mode"] == "explicit"
    assert punjabi["primary_locale"] == "pa-IN"

    urdu = TranscriptionWorker._build_locale_plan("urdu")
    assert urdu["mode"] == "explicit"
    assert urdu["primary_locale"] == "ur-IN"


def test_generic_speakers_are_preserved() -> None:
    assert TranscriptionWorker._canonical_speaker("speaker_1") == "Speaker 1"
    assert TranscriptionWorker._canonical_speaker("speaker_2") == "Speaker 2"
    assert TranscriptionWorker._canonical_speaker("doctor") == "Doctor"
    assert TranscriptionWorker._canonical_speaker("patient") == "Patient"
