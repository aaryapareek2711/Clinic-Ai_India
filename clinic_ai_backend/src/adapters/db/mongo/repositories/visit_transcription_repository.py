"""Per-visit transcription session state for polling and dialogue APIs."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from src.adapters.db.mongo.client import get_database


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class VisitTranscriptionRepository:
    """Stores visit-scoped transcription lifecycle (aligned with transcript-bundle semantics)."""

    def __init__(self) -> None:
        self.db = get_database()
        # Single-source model: transcription session is embedded inside `visits`.

    def _sync_visit_transcription_projection(self, *, visit_id: str, payload: dict[str, Any], now: datetime) -> None:
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "transcription_session": 1},
        ) or {}
        existing = dict(visit.get("transcription_session") or {})
        merged = {**existing, **payload}
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"$set": {"transcription_session": merged, "updated_at": now}},
        )

    def upsert_queued(
        self,
        *,
        patient_id: str,
        visit_id: str,
        job_id: str,
        audio_id: str,
        audio_file_path: str | None,
        language_mix: str,
    ) -> None:
        now = _utc_now()
        self._sync_visit_transcription_projection(
            visit_id=visit_id,
            payload={
                "patient_id": patient_id,
                "visit_id": visit_id,
                "job_id": job_id,
                "audio_id": audio_id,
                "audio_file_path": audio_file_path,
                "language_mix": language_mix,
                "transcription_status": "queued",
                "transcript": None,
                "structured_dialogue": None,
                "error_message": None,
                "word_count": None,
                "audio_duration_seconds": None,
                "transcription_id": None,
                "enqueued_at": now,
                "dequeued_at": None,
                "started_at": None,
                "completed_at": None,
                "last_poll_at": None,
                "last_poll_status": None,
                "updated_at": now,
            },
            now=now,
        )

    def mark_processing(self, *, patient_id: str, visit_id: str) -> None:
        now = _utc_now()
        self._sync_visit_transcription_projection(
            visit_id=visit_id,
            payload={
                "transcription_status": "processing",
                "started_at": now,
                "dequeued_at": now,
                "updated_at": now,
            },
            now=now,
        )

    def mark_completed(
        self,
        *,
        patient_id: str,
        visit_id: str,
        transcript: str,
        structured_dialogue: list[dict[str, str]],
        word_count: int,
        audio_duration_seconds: float | None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _utc_now()
        self._sync_visit_transcription_projection(
            visit_id=visit_id,
            payload={
                "transcription_status": "completed",
                "transcript": transcript,
                "structured_dialogue": structured_dialogue,
                "word_count": word_count,
                "audio_duration_seconds": audio_duration_seconds,
                "metadata": metadata or {},
                "completed_at": now,
                "error_message": None,
            },
            now=now,
        )

    def mark_failed(self, *, patient_id: str, visit_id: str, error_message: str) -> None:
        now = _utc_now()
        self._sync_visit_transcription_projection(
            visit_id=visit_id,
            payload={
                "transcription_status": "failed",
                "error_message": error_message,
                "completed_at": now,
            },
            now=now,
        )

    def touch_poll(self, *, patient_id: str, visit_id: str, last_poll_status: str) -> None:
        now = _utc_now()
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "transcription_session.last_poll_at": now,
                    "transcription_session.last_poll_status": last_poll_status,
                    "transcription_session.updated_at": now,
                    "updated_at": now,
                }
            },
        )

    def get_session(self, *, patient_id: str, visit_id: str) -> dict[str, Any] | None:
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "patient_id": 1, "transcription_session": 1},
        ) or {}
        session = dict(visit.get("transcription_session") or {})
        if not session:
            return None
        # Prefer visit-scoped transcription state as source of truth.
        # Keep tolerant matching here because historical docs can carry mixed patient id formats.
        session_patient_id = str(session.get("patient_id") or "")
        if session_patient_id and session_patient_id != str(patient_id):
            visit_patient_id = str(visit.get("patient_id") or "")
            if visit_patient_id and visit_patient_id != str(patient_id):
                return None
        return session

    def save_structured_dialogue(self, *, patient_id: str, visit_id: str, dialogue: list[dict[str, str]]) -> bool:
        now = _utc_now()
        session = self.get_session(patient_id=patient_id, visit_id=visit_id)
        if not session:
            return False
        self._sync_visit_transcription_projection(
            visit_id=visit_id,
            payload={"structured_dialogue": dialogue, "updated_at": now},
            now=now,
        )
        return True

    def clear_structured_dialogue(self, *, patient_id: str, visit_id: str) -> bool:
        """Remove stored Doctor/Patient turns; raw transcript and transcription status are unchanged."""
        now = _utc_now()
        session = self.get_session(patient_id=patient_id, visit_id=visit_id)
        if not session:
            return False
        # Use dotted paths so we never replace the whole `transcription_session` object
        # (which could drop sibling fields if the read model were ever incomplete).
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$unset": {"transcription_session.structured_dialogue": ""},
                "$set": {
                    "transcription_session.updated_at": now,
                    "updated_at": now,
                },
            },
        )
        return True

    def purge_transcription_for_visit(self, *, patient_id: str, visit_id: str) -> bool:
        """
        Remove visit transcription entirely: embedded session, pipeline jobs/results, audio metadata,
        and stored audio bytes (best-effort via storage_ref on audio_files).

        Returns True if anything existed to remove or the visit document matched.
        """
        from src.adapters.external.storage.object_storage import TranscriptionAudioStore

        now = _utc_now()
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "patient_id": 1, "transcription_session": 1},
        )
        if not visit:
            return False
        visit_pid = str(visit.get("patient_id") or "").strip()
        if visit_pid and visit_pid != str(patient_id).strip():
            return False

        session = dict(visit.get("transcription_session") or {})
        had_session = bool(session)

        jobs = list(
            self.db.transcription_jobs.find(
                {"patient_id": patient_id, "visit_id": visit_id},
                {"job_id": 1},
            )
        )
        job_ids_set: set[str] = {str(j["job_id"]) for j in jobs if j.get("job_id")}
        sid_job = str(session.get("job_id") or "").strip()
        if sid_job:
            job_ids_set.add(sid_job)
        job_ids = list(job_ids_set)

        audio_docs = list(
            self.db.audio_files.find(
                {"patient_id": patient_id, "visit_id": visit_id},
                {"storage_ref": 1},
            )
        )
        store = TranscriptionAudioStore()
        for doc in audio_docs:
            store.delete_by_ref(doc.get("storage_ref"))

        deleted_jobs = 0
        if job_ids:
            self.db.transcription_results.delete_many({"job_id": {"$in": job_ids}})
            deleted_jobs = self.db.transcription_jobs.delete_many({"job_id": {"$in": job_ids}}).deleted_count

        self.db.audio_files.delete_many({"patient_id": patient_id, "visit_id": visit_id})

        res = self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}], "patient_id": patient_id},
            {"$unset": {"transcription_session": ""}, "$set": {"updated_at": now}},
        )

        removed_pipeline = deleted_jobs > 0 or len(audio_docs) > 0
        return had_session or removed_pipeline or res.modified_count > 0
