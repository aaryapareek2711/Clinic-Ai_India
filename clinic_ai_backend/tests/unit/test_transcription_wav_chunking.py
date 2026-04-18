"""WAV duration parsing and ffmpeg chunking used for Azure short-audio REST limits."""
from __future__ import annotations

import io
import shutil
import wave

import pytest

from src.workers.transcription_worker import TranscriptionWorker


def _pcm_wav_bytes(duration_sec: float, sample_rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        n = int(duration_sec * sample_rate)
        wf.writeframes(b"\x00\x00" * n)
    return buf.getvalue()


def test_pcm_wav_duration_seconds_matches_written_length() -> None:
    wav = _pcm_wav_bytes(2.5)
    dur = TranscriptionWorker._pcm_wav_duration_seconds(wav)
    assert dur is not None
    assert abs(dur - 2.5) < 0.05


def test_pcm_wav_duration_returns_none_for_non_wav() -> None:
    assert TranscriptionWorker._pcm_wav_duration_seconds(b"not a wav file") is None


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")
def test_split_wav_into_time_chunks_multiple_segments() -> None:
    """Long PCM WAV is split into time windows under Azure short-audio REST limits."""
    worker = TranscriptionWorker()
    wav = _pcm_wav_bytes(42.0)
    chunks = worker._split_wav_into_time_chunks(wav, chunk_sec=15.0)
    assert len(chunks) >= 3
    for piece in chunks:
        d = TranscriptionWorker._pcm_wav_duration_seconds(piece)
        assert d is not None
        assert d <= 16.0, "each chunk should be ~chunk_sec seconds"


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")
def test_split_short_wav_returns_single_chunk() -> None:
    worker = TranscriptionWorker()
    wav = _pcm_wav_bytes(3.0)
    chunks = worker._split_wav_into_time_chunks(wav, chunk_sec=50.0)
    assert len(chunks) == 1
    assert chunks[0] == wav
