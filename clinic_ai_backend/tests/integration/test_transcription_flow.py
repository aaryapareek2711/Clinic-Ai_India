"""Integration tests for transcription V2 endpoints and worker."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from src.workers.transcription_worker import TranscriptionWorker


def _no_auto_openai_structure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Worker builds dialogue locally; OpenAI structure is optional/manual endpoint only."""


def _patch_upload_writes_temp_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Avoid GridFS in unit tests; persist upload bytes under tmp_path as file:// refs."""

    def _fake_upload(_self, *, blob_path: str, audio_bytes: bytes, mime_type: str) -> str:
        safe = blob_path.replace("/", "_")[-120:]
        path = tmp_path / f"up_{safe}"
        path.write_bytes(audio_bytes)
        return f"file://{path.as_posix()}"

    monkeypatch.setattr(
        "src.api.routers.transcription.TranscriptionAudioStore.upload_audio",
        _fake_upload,
    )


def _insert_previsit(fake_db, patient_id: str, visit_id: str = "v1") -> None:
    fake_db.patients.replace_one(
        {"patient_id": patient_id},
        {
            "patient_id": patient_id,
            "name": "Transcription Test",
            "phone_number": "9999999999",
            "doctor_id": "DOC001",
            "updated_at": datetime.now(timezone.utc),
        },
        upsert=True,
    )
    fake_db.pre_visit_summaries.insert_one(
        {
            "patient_id": patient_id,
            "visit_id": visit_id,
            "status": "generated",
            "updated_at": datetime.now(timezone.utc),
        }
    )
    fake_db.visits.replace_one(
        {"visit_id": visit_id},
        {
            "visit_id": visit_id,
            "patient_id": patient_id,
            "pre_visit_summary": {
                "sections": {"chief_complaint": {"reason_for_visit": "Test intake"}},
            },
            "updated_at": datetime.now(timezone.utc),
        },
        upsert=True,
    )


def test_upload_happy_path(app_client, fake_db, monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    _insert_previsit(fake_db, "p1")
    _patch_upload_writes_temp_file(monkeypatch, tmp_path)

    response = app_client.post(
        "/api/notes/transcribe",
        data={
            "patient_id": "p1",
            "visit_id": "v1",
            "noise_environment": "quiet_clinic",
            "language_mix": "hi-en",
            "speaker_mode": "two_speakers",
        },
        files={"audio_file": ("sample.wav", b"abc123", "audio/wav")},
    )

    assert response.status_code == 202
    payload = response.json()
    assert payload["patient_id"]
    assert payload["visit_id"] == "v1"
    assert payload["status"] == "queued"
    assert payload["job_id"] == payload["message_id"]
    assert "Poll" in (payload.get("message") or "")
    assert len(fake_db.audio_files.docs) == 1
    assert len(fake_db.transcription_jobs.docs) == 1
    assert len(fake_db.transcription_queue.docs) == 1
    assert len(fake_db.visits.docs) >= 1
    vdoc = next((d for d in fake_db.visits.docs if d.get("visit_id") == "v1"), None)
    assert vdoc is not None
    assert (vdoc.get("transcription_session") or {}).get("job_id")


def test_upload_rejects_when_previsit_missing(app_client, fake_db) -> None:
    fake_db.patients.insert_one(
        {
            "patient_id": "missing-previsit",
            "name": "No Previsit",
            "phone_number": "9888888888",
            "doctor_id": "DOC001",
        }
    )
    fake_db.visits.insert_one(
        {
            "visit_id": "v1",
            "patient_id": "missing-previsit",
            "visit_type": "scheduled_visit",
            "updated_at": datetime.now(timezone.utc),
        }
    )
    response = app_client.post(
        "/api/notes/transcribe",
        data={
            "patient_id": "missing-previsit",
            "visit_id": "v1",
            "noise_environment": "quiet_clinic",
            "language_mix": "hi-en",
            "speaker_mode": "two_speakers",
        },
        files={"audio_file": ("sample.wav", b"abc123", "audio/wav")},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "PREVISIT_MISSING"


def test_worker_defensive_gate_fails_cleanly(fake_db, patched_db, tmp_path: Path) -> None:
    audio_path = tmp_path / "a1.wav"
    audio_path.write_bytes(b"x")
    ref = f"file://{audio_path.as_posix()}"
    fake_db.audio_files.insert_one(
        {
            "audio_id": "a1",
            "patient_id": "p2",
            "visit_id": "v2",
            "storage_ref": ref,
            "blob_url": ref,
            "blob_path": ref,
        }
    )
    fake_db.transcription_jobs.insert_one(
        {
            "job_id": "j1",
            "audio_id": "a1",
            "patient_id": "p2",
            "visit_id": "v2",
            "status": "queued",
            "retry_count": 0,
            "max_retries": 2,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    fake_db.transcription_queue.insert_one({"job_id": "j1", "queued_at": datetime.now(timezone.utc)})

    worker = TranscriptionWorker()
    worked = worker.process_next()

    assert worked is True
    job = fake_db.transcription_jobs.find_one({"job_id": "j1"})
    assert job["status"] == "failed"
    assert job["error_code"] == "PREVISIT_MISSING"


def test_low_confidence_triggers_manual_review(
    fake_db, patched_db, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _no_auto_openai_structure(monkeypatch)
    _insert_previsit(fake_db, "p3", "v3")
    audio_path = tmp_path / "a3.wav"
    audio_path.write_bytes(b"x")
    ref = f"file://{audio_path.as_posix()}"
    fake_db.audio_files.insert_one(
        {
            "audio_id": "a3",
            "patient_id": "p3",
            "visit_id": "v3",
            "storage_ref": ref,
            "blob_url": ref,
            "blob_path": ref,
        }
    )
    fake_db.transcription_jobs.insert_one(
        {
            "job_id": "j3",
            "audio_id": "a3",
            "patient_id": "p3",
            "visit_id": "v3",
            "status": "queued",
            "noise_environment": "crowded_opd",
            "language_mix": "hi-en",
            "speaker_mode": "two_speakers",
            "retry_count": 0,
            "max_retries": 2,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    fake_db.transcription_queue.insert_one({"job_id": "j3", "queued_at": datetime.now(timezone.utc)})
    monkeypatch.setattr(
        "src.workers.transcription_worker.TranscriptionWorker._call_azure_speech",
        lambda self, **_kwargs: {
            "language_detected": "hi-en",
            "segments": [
                {
                    "start_ms": 0,
                    "end_ms": 500,
                    "speaker_label": "doctor",
                    "text": "namaste",
                    "confidence": 0.4,
                },
                {
                    "start_ms": 501,
                    "end_ms": 1000,
                    "speaker_label": "patient",
                    "text": "dard",
                    "confidence": 0.45,
                },
            ],
        },
    )
    worker = TranscriptionWorker()
    worker.process_next()

    result = fake_db.transcription_results.find_one({"job_id": "j3"})
    assert result is not None
    assert result["requires_manual_review"] is True
    assert all(segment["needs_manual_review"] for segment in result["segments"])


def test_visit_transcription_status_after_upload(
    app_client, fake_db, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _insert_previsit(fake_db, "p1")
    _patch_upload_writes_temp_file(monkeypatch, tmp_path)
    app_client.post(
        "/api/notes/transcribe",
        data={
            "patient_id": "p1",
            "visit_id": "v1",
            "noise_environment": "quiet_clinic",
            "language_mix": "hi-en",
            "speaker_mode": "two_speakers",
        },
        files={"audio_file": ("sample.wav", b"abc123", "audio/wav")},
    )
    response = app_client.get("/api/notes/transcribe/status/p1/v1")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert "enqueued_at" in body


def test_visit_transcription_status_processing_naive_mongo_datetimes(app_client, fake_db) -> None:
    """Processing age must tolerate naive UTC datetimes (common BSON decode); must not 500."""
    aware = datetime.now(timezone.utc)
    naive_started = aware.replace(tzinfo=None)
    naive_poll = (aware - timedelta(minutes=1)).replace(tzinfo=None)
    fake_db.patients.insert_one(
        {
            "patient_id": "p-naive",
            "name": "Naive DT",
            "phone_number": "9111111111",
            "doctor_id": "DOC001",
        }
    )
    fake_db.visits.insert_one(
        {
            "visit_id": "v-naive",
            "patient_id": "p-naive",
            "transcription_session": {
                "patient_id": "p-naive",
                "visit_id": "v-naive",
                "transcription_status": "processing",
                "started_at": naive_started,
                "last_poll_at": naive_poll,
                "transcript": None,
                "job_id": "j1",
            },
        }
    )
    response = app_client.get("/api/notes/transcribe/status/p-naive/v-naive")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "processing"
    assert "progress" in (body.get("message") or "").lower()


def test_visit_dialogue_returns_202_while_queued(
    app_client, fake_db, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _insert_previsit(fake_db, "p1")
    _patch_upload_writes_temp_file(monkeypatch, tmp_path)
    app_client.post(
        "/api/notes/transcribe",
        data={
            "patient_id": "p1",
            "visit_id": "v1",
            "noise_environment": "quiet_clinic",
            "language_mix": "en",
            "speaker_mode": "two_speakers",
        },
        files={"audio_file": ("sample.wav", b"x", "audio/wav")},
    )
    response = app_client.get("/api/notes/p1/visits/v1/dialogue")
    assert response.status_code == 202
    assert response.headers.get("Retry-After") == "60"


def test_visit_dialogue_returns_payload_when_completed(app_client, fake_db) -> None:
    now = datetime.now(timezone.utc)
    fake_db.patients.insert_one(
        {
            "patient_id": "p1",
            "name": "Dialogue Patient",
            "phone_number": "9999999999",
            "doctor_id": "DOC001",
        }
    )
    fake_db.visits.insert_one(
        {
            "visit_id": "v1",
            "patient_id": "p1",
            "transcription_session": {
                "patient_id": "p1",
                "visit_id": "v1",
                "transcription_status": "completed",
                "transcript": "hello world",
                "structured_dialogue": [{"Doctor": "hello"}],
                "audio_file_path": "p1/v1/a.wav",
                "started_at": now,
                "completed_at": now,
                "word_count": 2,
                "audio_duration_seconds": 1.0,
                "error_message": None,
            },
        }
    )
    response = app_client.get("/api/notes/p1/visits/v1/dialogue")
    assert response.status_code == 200
    body = response.json()
    assert body["transcript"] == "hello world"
    assert body["structured_dialogue"][0]["Doctor"] == "hello"


def test_delete_visit_transcription_removes_session_and_deletes_audio_file(
    app_client, fake_db, tmp_path: Path
) -> None:
    now = datetime.now(timezone.utc)
    audio_path = tmp_path / "clip.wav"
    audio_path.write_bytes(b"audio-bytes")
    ref = f"file://{audio_path.as_posix()}"
    fake_db.patients.insert_one(
        {
            "patient_id": "p1",
            "name": "Delete Transcript Patient",
            "phone_number": "9999999999",
            "doctor_id": "DOC001",
        }
    )
    fake_db.visits.insert_one(
        {
            "visit_id": "v1",
            "patient_id": "p1",
            "transcription_session": {
                "patient_id": "p1",
                "visit_id": "v1",
                "transcription_status": "completed",
                "transcript": "hello world",
                "structured_dialogue": [{"Doctor": "hello"}],
                "audio_file_path": ref,
                "started_at": now,
                "completed_at": now,
                "word_count": 2,
            },
        }
    )
    response = app_client.delete("/api/notes/p1/visits/v1/transcription")
    assert response.status_code == 200
    assert response.json().get("message")
    visit_doc = fake_db.visits.find_one({"visit_id": "v1"})
    assert visit_doc is not None
    assert not visit_doc.get("transcription_session")
    assert not audio_path.is_file()
    incomplete = app_client.get("/api/notes/p1/visits/v1/dialogue")
    assert incomplete.status_code == 202


def test_structure_dialogue_endpoint_persists(
    app_client, fake_db, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake_db.patients.insert_one(
        {
            "patient_id": "p1",
            "name": "Structure Patient",
            "phone_number": "9999999999",
            "doctor_id": "DOC001",
        }
    )
    fake_db.visits.insert_one(
        {
            "visit_id": "v1",
            "patient_id": "p1",
            "transcription_session": {
                "patient_id": "p1",
                "visit_id": "v1",
                "transcription_status": "completed",
                "transcript": "Doctor: How are you? Patient: Fine.",
                "language_mix": "en",
                "structured_dialogue": None,
            },
        }
    )

    def _fake_structure(
        *, raw_transcript: str, language: str = "en", speaker_mode: str = "two_speakers"
    ) -> list[dict[str, str]]:
        assert "How are you" in raw_transcript
        return [{"Doctor": "How are you?"}, {"Patient": "Fine."}]

    monkeypatch.setattr(
        "src.api.routers.transcription.structure_dialogue_from_transcript_sync",
        _fake_structure,
    )
    response = app_client.post("/api/notes/p1/visits/v1/dialogue/structure")
    assert response.status_code == 200
    assert response.json()["dialogue"][0]["Doctor"] == "How are you?"
    visit_doc = fake_db.visits.find_one({"visit_id": "v1"})
    assert visit_doc is not None
    stored = (visit_doc.get("transcription_session") or {})
    assert stored.get("structured_dialogue") is not None
    assert stored["structured_dialogue"][0]["Doctor"] == "How are you?"


def test_worker_marks_visit_session_completed(
    app_client, fake_db, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _no_auto_openai_structure(monkeypatch)
    _insert_previsit(fake_db, "p9", "v9")
    _patch_upload_writes_temp_file(monkeypatch, tmp_path)
    upload = app_client.post(
        "/api/notes/transcribe",
        data={
            "patient_id": "p9",
            "visit_id": "v9",
            "noise_environment": "quiet_clinic",
            "language_mix": "en",
            "speaker_mode": "two_speakers",
        },
        files={"audio_file": ("sample.wav", b"x", "audio/wav")},
    )
    assert upload.status_code == 202
    monkeypatch.setattr(
        "src.workers.transcription_worker.TranscriptionWorker._call_azure_speech",
        lambda self, **_kwargs: {
            "language_detected": "en",
            "segments": [
                {
                    "start_ms": 0,
                    "end_ms": 500,
                    "speaker_label": "doctor",
                    "text": "namaste",
                    "confidence": 0.95,
                },
            ],
        },
    )
    worker = TranscriptionWorker()
    worker.process_next()
    visit_doc = fake_db.visits.find_one({"visit_id": "v9"})
    assert visit_doc is not None
    session = visit_doc.get("transcription_session") or {}
    assert session.get("transcription_status") == "completed"
    assert "namaste" in (session.get("transcript") or "")
    # Visit-level speaker dialogue is OpenAI-only (POST /dialogue/structure); worker does not persist it.
    assert not session.get("structured_dialogue")


def test_worker_preserves_unknown_dialogue_when_single_segment_has_no_diarization(
    fake_db,
    patched_db,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """One unknown segment: job result keeps Unknown label; visit has no structured_dialogue until manual structure."""
    _insert_previsit(fake_db, "p10", "v10")
    audio_path = tmp_path / "a10.wav"
    audio_path.write_bytes(b"x")
    ref = f"file://{audio_path.as_posix()}"
    fake_db.audio_files.insert_one(
        {
            "audio_id": "a10",
            "patient_id": "p10",
            "visit_id": "v10",
            "storage_ref": ref,
            "blob_url": ref,
            "blob_path": ref,
            "mime_type": "audio/wav",
        }
    )
    fake_db.transcription_jobs.insert_one(
        {
            "job_id": "j10",
            "audio_id": "a10",
            "patient_id": "p10",
            "visit_id": "v10",
            "status": "queued",
            "language_mix": "en",
            "retry_count": 0,
            "max_retries": 2,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    fake_db.transcription_queue.insert_one({"job_id": "j10", "queued_at": datetime.now(timezone.utc)})
    now = datetime.now(timezone.utc)
    fake_db.visits.replace_one(
        {"visit_id": "v10"},
        {
            "visit_id": "v10",
            "patient_id": "p10",
            "pre_visit_summary": {
                "sections": {"chief_complaint": {"reason_for_visit": "Sore throat"}},
            },
            "transcription_session": {
                "patient_id": "p10",
                "visit_id": "v10",
                "job_id": "j10",
                "audio_id": "a10",
                "audio_file_path": ref,
                "language_mix": "en",
                "transcription_status": "queued",
                "transcript": None,
                "structured_dialogue": None,
                "enqueued_at": now,
                "updated_at": now,
            },
        },
        upsert=True,
    )

    monkeypatch.setattr(
        "src.workers.transcription_worker.TranscriptionWorker._call_azure_speech",
        lambda self, **_kwargs: {
            "language_detected": "en-IN",
            "segments": [
                {
                    "start_ms": 0,
                    "end_ms": 1200,
                    "speaker_label": "unknown",
                    "text": "Doctor, my throat hurts since yesterday.",
                    "confidence": 0.9,
                },
            ],
        },
    )

    worker = TranscriptionWorker()
    worker.process_next()

    visit_doc = fake_db.visits.find_one({"visit_id": "v10"})
    assert visit_doc is not None
    session = visit_doc.get("transcription_session") or {}
    assert not session.get("structured_dialogue")

    result = fake_db.transcription_results.find_one({"job_id": "j10"})
    assert result is not None
    assert len(result.get("segments") or []) == 1
    assert str(result["segments"][0].get("speaker_label") or "").lower() == "unknown"
