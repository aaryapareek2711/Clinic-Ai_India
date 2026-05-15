"""Chunking and merge behavior for long-transcript dialogue structuring."""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import patch

import pytest

from src.application.services import structure_dialogue as sd


def test_chunk_transcript_for_structure_rejoins_lossless() -> None:
    base = "PARA one.\n\n" + ("word " * 2000) + "\n\nPARA two.\n\n" + ("other " * 2000)
    chunks = sd.chunk_transcript_for_structure(base, max_chars=1500)
    assert len(chunks) >= 2
    assert "".join(chunks) == base


def test_dedupe_adjacent_identical_speaker_turns() -> None:
    merged = sd._dedupe_adjacent_dialogue_turns(
        [
            {"Doctor": "Same line"},
            {"Doctor": "Same line"},
            {"Patient": "Ok"},
        ]
    )
    assert len(merged) == 2


@pytest.fixture
def fake_settings(monkeypatch: pytest.MonkeyPatch) -> Any:
    class _S:
        openai_api_key = "sk-test"
        openai_model = "gpt-4o-mini"
        structure_dialogue_max_chunk_chars = 400

    monkeypatch.setattr(sd, "get_settings", lambda: _S())
    return _S


def test_structure_dialogue_calls_openai_per_chunk_ordered_merge(
    monkeypatch: pytest.MonkeyPatch, fake_settings: Any
) -> None:
    """Long transcript triggers multiple OpenAI calls; outputs are concatenated in order."""
    calls: list[str] = []

    monkeypatch.setattr(
        sd,
        "chunk_transcript_for_structure",
        lambda text, max_chars: ["chunk_one_body", "chunk_two_body", "chunk_three_body"],
    )

    class _Resp:
        def __init__(self, dialogue: list[dict[str, str]]) -> None:
            self._body = json.dumps(
                {"choices": [{"message": {"content": json.dumps(dialogue)}}]}
            ).encode()

        def read(self) -> bytes:
            return self._body

        def __enter__(self) -> _Resp:
            return self

        def __exit__(self, *args: object) -> None:
            return None

    def _urlopen(req: Any, timeout: int = 120) -> _Resp:
        payload = json.loads(req.data.decode("utf-8"))
        user = str(payload["messages"][1]["content"])
        calls.append(user)
        if "chunk_one_body" in user:
            return _Resp([{"Doctor": "OPEN_CHUNK_1"}])
        if "chunk_two_body" in user:
            return _Resp([{"Patient": "OPEN_CHUNK_2"}])
        return _Resp([{"Doctor": "OPEN_CHUNK_3"}])

    raw = "ignored because chunking is stubbed"
    with patch.object(sd.request, "urlopen", side_effect=_urlopen):
        out = sd.structure_dialogue_from_transcript_sync(raw_transcript=raw, language="en")

    assert len(calls) == 3
    joined = " ".join(next(iter(t.values())) for t in out)
    assert "OPEN_CHUNK_1" in joined and "OPEN_CHUNK_2" in joined and "OPEN_CHUNK_3" in joined


def test_structure_dialogue_three_speaker_mode_includes_family_member_instruction(
    monkeypatch: pytest.MonkeyPatch, fake_settings: Any
) -> None:
    captured_system: list[str] = []

    monkeypatch.setattr(sd, "chunk_transcript_for_structure", lambda text, max_chars: ["sample chunk"])

    class _Resp:
        def __init__(self) -> None:
            self._body = json.dumps(
                {"choices": [{"message": {"content": json.dumps([{"Attendant": "I am his daughter"}])}}]}
            ).encode()

        def read(self) -> bytes:
            return self._body

        def __enter__(self) -> _Resp:
            return self

        def __exit__(self, *args: object) -> None:
            return None

    def _urlopen(req: Any, timeout: int = 120) -> _Resp:
        payload = json.loads(req.data.decode("utf-8"))
        captured_system.append(str(payload["messages"][0]["content"]))
        return _Resp()

    with patch.object(sd.request, "urlopen", side_effect=_urlopen):
        out = sd.structure_dialogue_from_transcript_sync(
            raw_transcript="dummy",
            language="en",
            speaker_mode="three_speakers",
        )

    assert out == [{"Attendant": "I am his daughter"}]
    assert captured_system
    assert "Attendant" in captured_system[0]
    assert "attendant" in captured_system[0].lower()
    assert "Do not collapse attendant or family speech into Patient." in captured_system[0]


def test_extract_dialogue_array_splits_multi_key_objects() -> None:
    raw = json.dumps([{"Doctor": "How are you?", "Patient": "Fine thanks"}])
    out = sd._extract_dialogue_array(raw)
    assert out == [{"Doctor": "How are you?"}, {"Patient": "Fine thanks"}]


def test_normalize_dialogue_turn_keys_maps_family_aliases_three_speakers() -> None:
    turns = [
        {"Attendant": "She has had fever for two days."},
        {"pt": "It started Monday"},
    ]
    out = sd._normalize_dialogue_turn_keys(turns, speaker_mode="three_speakers")
    assert out == [
        {"Attendant": "She has had fever for two days."},
        {"Patient": "It started Monday"},
    ]


def test_normalize_dialogue_turn_keys_maps_family_to_patient_two_speakers() -> None:
    out = sd._normalize_dialogue_turn_keys(
        [{"Attendant": "He cannot speak English well."}],
        speaker_mode="two_speakers",
    )
    assert out == [{"Patient": "He cannot speak English well."}]
