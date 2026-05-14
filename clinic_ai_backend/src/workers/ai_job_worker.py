"""Background worker for async AI jobs (clinical note, summaries)."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from src.adapters.db.mongo.client import get_database
from src.application.use_cases.generate_india_clinical_note import GenerateIndiaClinicalNoteUseCase
from src.application.use_cases.generate_post_visit_summary import GeneratePostVisitSummaryUseCase
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase

logger = logging.getLogger(__name__)

_BACKGROUND_TASKS: list[asyncio.Task] = []
_STOP_EVENT: asyncio.Event | None = None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AIJobWorker:
    def __init__(self) -> None:
        self.db = get_database()
        try:
            self.db.ai_jobs.create_index([("status", 1), ("created_at", 1)])
            self.db.ai_jobs.create_index([("job_id", 1)], unique=True)
            self.db.ai_jobs.create_index([("visit_id", 1), ("job_type", 1), ("created_at", -1)])
            # Cleanup old completed/failed jobs after 14 days.
            self.db.ai_jobs.create_index([("completed_at", 1)], expireAfterSeconds=14 * 24 * 3600)
        except Exception:
            pass

    def _claim_next(self) -> dict | None:
        now = _utc_now()
        doc = self.db.ai_jobs.find_one_and_update(
            {"status": "queued"},
            {"$set": {"status": "processing", "started_at": now, "updated_at": now}},
            sort=[("created_at", 1)],
        )
        return doc

    def _mark_failed(self, job_id: str, message: str) -> None:
        now = _utc_now()
        self.db.ai_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "failed", "error_message": message, "completed_at": now, "updated_at": now}},
        )

    def _mark_completed(self, job_id: str, result: dict) -> None:
        now = _utc_now()
        self.db.ai_jobs.update_one(
            {"job_id": job_id},
            {"$set": {"status": "completed", "result": result, "completed_at": now, "updated_at": now}},
        )

    def _sync_result_into_visit(self, *, job_type: str, result: dict) -> None:
        visit_id = str(result.get("visit_id") or "").strip()
        if not visit_id:
            return
        payload = result.get("payload")
        if isinstance(payload, dict):
            visit_note = payload
        elif payload is not None:
            visit_note = {"payload": payload}
        else:
            visit_note = {}
        if job_type == "clinical_note":
            field = "clinical_note"
        elif job_type == "post_visit_summary":
            field = "post_visit_summary"
        else:
            return
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"$set": {field: visit_note, "updated_at": result.get("updated_at") or result.get("created_at")}},
        )

    def process_next(self) -> bool:
        job = self._claim_next()
        if not job:
            return False
        job_id = str(job.get("job_id") or "")
        job_type = str(job.get("job_type") or "")
        payload = job.get("payload") or {}
        patient_id = str(job.get("patient_id") or "")
        visit_id = str(job.get("visit_id") or "")
        try:
            if job_type == "clinical_note":
                doc = GenerateIndiaClinicalNoteUseCase().execute(
                    patient_id=patient_id,
                    visit_id=visit_id,
                    transcription_job_id=str(payload.get("transcription_job_id") or ""),
                    force_regenerate=True,
                    follow_up_date=payload.get("follow_up_date"),
                    follow_up_time=payload.get("follow_up_time"),
                    template_id=payload.get("template_id"),
                )
                self._sync_result_into_visit(job_type=job_type, result=doc)
                self._mark_completed(job_id, doc)
                return True
            if job_type == "post_visit_summary":
                doc = GeneratePostVisitSummaryUseCase().execute(
                    patient_id=patient_id,
                    visit_id=visit_id,
                    transcription_job_id=str(payload.get("transcription_job_id") or ""),
                    preferred_language=payload.get("preferred_language"),
                    follow_up_in=payload.get("follow_up_in"),
                    follow_up_date=payload.get("follow_up_date"),
                    follow_up_time=payload.get("follow_up_time"),
                )
                self._sync_result_into_visit(job_type=job_type, result=doc)
                self._mark_completed(job_id, doc)
                return True
            if job_type == "pre_visit_summary":
                doc = GeneratePreVisitSummaryUseCase().execute(patient_id=patient_id, visit_id=visit_id)
                self._mark_completed(job_id, doc)
                return True
            self._mark_failed(job_id, f"Unknown job_type: {job_type}")
            return True
        except Exception as exc:  # noqa: BLE001
            self._mark_failed(job_id, str(exc))
            return True


async def _worker_loop(worker_id: int, stop_event: asyncio.Event, poll_interval_sec: float) -> None:
    worker = AIJobWorker()
    while not stop_event.is_set():
        processed = await asyncio.to_thread(worker.process_next)
        if not processed:
            await asyncio.sleep(poll_interval_sec)


def start_ai_job_workers(concurrency: int = 1, poll_interval_sec: float = 0.5) -> None:
    global _BACKGROUND_TASKS, _STOP_EVENT
    if _BACKGROUND_TASKS:
        return
    _STOP_EVENT = asyncio.Event()
    concurrency = max(1, int(concurrency))
    poll_interval_sec = max(0.2, float(poll_interval_sec))
    for i in range(concurrency):
        _BACKGROUND_TASKS.append(asyncio.create_task(_worker_loop(i + 1, _STOP_EVENT, poll_interval_sec)))
    logger.info("ai_job_workers_started concurrency=%s poll_interval_sec=%s", concurrency, poll_interval_sec)


async def stop_ai_job_workers() -> None:
    global _BACKGROUND_TASKS, _STOP_EVENT
    if not _BACKGROUND_TASKS:
        return
    if _STOP_EVENT is not None:
        _STOP_EVENT.set()
    await asyncio.gather(*_BACKGROUND_TASKS, return_exceptions=True)
    _BACKGROUND_TASKS = []
    _STOP_EVENT = None

