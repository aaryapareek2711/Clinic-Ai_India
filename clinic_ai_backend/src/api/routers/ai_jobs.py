"""Async AI job endpoints (enqueue + status + result)."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.adapters.db.mongo.client import get_database
from src.api.schemas.notes import NoteGenerateRequest
from src.application.utils.patient_id_crypto import resolve_internal_patient_id

router = APIRouter(prefix="/api/ai-jobs", tags=["AI Jobs"])


class EnqueueResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    patient_id: str | None = None
    visit_id: str | None = None
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    error_message: str | None = None


class PreVisitSummaryJobRequest(BaseModel):
    patient_id: str = Field(min_length=1)
    visit_id: str = Field(min_length=1)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _enqueue_job(*, job_type: str, patient_id: str | None, visit_id: str | None, payload: dict) -> str:
    db = get_database()
    now = _utc_now()
    job_id = f"AIJOB-{uuid4()}"
    db.ai_jobs.insert_one(
        {
            "job_id": job_id,
            "job_type": job_type,
            "status": "queued",
            "patient_id": patient_id,
            "visit_id": visit_id,
            "payload": payload,
            "result": None,
            "error_message": None,
            "created_at": now,
            "updated_at": now,
            "started_at": None,
            "completed_at": None,
        }
    )
    return job_id


@router.post("/clinical-note", response_model=EnqueueResponse)
def enqueue_clinical_note(body: NoteGenerateRequest) -> EnqueueResponse:
    """Enqueue clinical note generation (async)."""
    internal_patient_id = resolve_internal_patient_id(body.patient_id, allow_raw_fallback=True)
    job_id = _enqueue_job(
        job_type="clinical_note",
        patient_id=internal_patient_id,
        visit_id=body.visit_id,
        payload=body.model_dump(),
    )
    return EnqueueResponse(job_id=job_id, status="queued")


@router.post("/post-visit-summary", response_model=EnqueueResponse)
def enqueue_post_visit_summary(body: NoteGenerateRequest) -> EnqueueResponse:
    """Enqueue post-visit summary generation (async)."""
    internal_patient_id = resolve_internal_patient_id(body.patient_id, allow_raw_fallback=True)
    job_id = _enqueue_job(
        job_type="post_visit_summary",
        patient_id=internal_patient_id,
        visit_id=body.visit_id,
        payload=body.model_dump(),
    )
    return EnqueueResponse(job_id=job_id, status="queued")


@router.post("/pre-visit-summary", response_model=EnqueueResponse)
def enqueue_pre_visit_summary(body: PreVisitSummaryJobRequest) -> EnqueueResponse:
    """Enqueue pre-visit summary generation (async)."""
    internal_patient_id = resolve_internal_patient_id(body.patient_id, allow_raw_fallback=True)
    job_id = _enqueue_job(
        job_type="pre_visit_summary",
        patient_id=internal_patient_id,
        visit_id=body.visit_id,
        payload=body.model_dump(),
    )
    return EnqueueResponse(job_id=job_id, status="queued")


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str) -> JobStatusResponse:
    db = get_database()
    doc = db.ai_jobs.find_one({"job_id": job_id}, {"_id": 0, "payload": 0, "result": 0}) or None
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    for k in ("created_at", "started_at", "completed_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return JobStatusResponse(**doc)


@router.get("/{job_id}/result")
def get_job_result(job_id: str) -> dict:
    db = get_database()
    doc = db.ai_jobs.find_one({"job_id": job_id}, {"_id": 0, "payload": 0}) or None
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    status = str(doc.get("status") or "")
    if status not in {"completed", "failed"}:
        raise HTTPException(status_code=202, detail="Job not completed")
    # Convert datetimes for JSON
    for k in ("created_at", "started_at", "completed_at", "updated_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return doc

