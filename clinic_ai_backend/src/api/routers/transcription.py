"""Transcription routes module."""
from __future__ import annotations

import asyncio
import hashlib
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.external.queue.producer import TranscriptionQueueProducer
from src.adapters.external.storage.object_storage import AzureBlobStorage
from src.api.schemas.audio import (
    NoiseEnvironment,
    SpeakerMode,
    TranscriptionJobStatusResponse,
    TranscriptionResultResponse,
    TranscriptionUploadAcceptedResponse,
)
from src.core.config import get_settings

router = APIRouter(prefix="/notes", tags=["Transcription"])
AZURE_REST_SUPPORTED_MIME_TYPES = {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3"}


@router.post("/transcribe", response_model=TranscriptionUploadAcceptedResponse, status_code=202)
async def upload_transcription_audio(
    patient_id: str = Form(...),
    visit_id: str | None = Form(default=None),
    audio_file: UploadFile = File(...),
    noise_environment: NoiseEnvironment = Form(...),
    language_mix: str = Form(...),
    speaker_mode: SpeakerMode = Form(...),
) -> TranscriptionUploadAcceptedResponse:
    """Upload audio, create job and enqueue async processing."""
    db = get_database()
    previsit = db.pre_visit_summaries.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)])
    if not previsit:
        raise HTTPException(status_code=409, detail="PREVISIT_MISSING")

    settings = get_settings()
    if not settings.azure_speech_key:
        raise HTTPException(status_code=503, detail="AZURE_SPEECH_KEY is not configured")
    content_type = str(audio_file.content_type or "").strip().lower()
    if content_type not in settings.allowed_audio_mime_types:
        raise HTTPException(status_code=400, detail="Unsupported audio MIME type")
    if content_type not in AZURE_REST_SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "For Azure realtime transcription, upload WAV or MP3 audio. "
                f"Received MIME type: {content_type or 'unknown'}"
            ),
        )

    payload = await audio_file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Audio file is empty")
    if len(payload) > settings.max_audio_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file exceeds max size")

    digest = hashlib.sha256(payload).hexdigest()
    now = datetime.now(timezone.utc)
    audio_id = str(uuid4())
    job_id = str(uuid4())
    blob_path = f"{patient_id}/{visit_id or 'no-visit'}/{audio_id}_{audio_file.filename}"
    storage = AzureBlobStorage()
    storage_ref = storage.upload_audio(
        blob_path=blob_path,
        audio_bytes=payload,
        mime_type=content_type or "application/octet-stream",
    )
    stored_blob_path = storage_ref
    stored_blob_url = storage_ref

    normalized_language_mix = _normalize_language_mix(language_mix)

    repo = AudioRepository()
    repo.create_audio_file(
        audio_id=audio_id,
        patient_id=patient_id,
        visit_id=visit_id,
        blob_url=stored_blob_url,
        blob_path=stored_blob_path,
        container=settings.mongo_audio_bucket_name,
        mime_type=content_type or "application/octet-stream",
        size_bytes=len(payload),
        sha256=digest,
        noise_environment=noise_environment,
        language_mix=normalized_language_mix,
        speaker_mode=speaker_mode,
    )
    repo.create_job(
        job_id=job_id,
        audio_id=audio_id,
        patient_id=patient_id,
        visit_id=visit_id,
        provider="azure_speech",
        noise_environment=noise_environment,
        language_mix=normalized_language_mix,
        speaker_mode=speaker_mode,
        max_retries=settings.transcription_max_retries,
    )
    TranscriptionQueueProducer().enqueue(job_id)

    return TranscriptionUploadAcceptedResponse(
        job_id=job_id,
        patient_id=patient_id,
        visit_id=visit_id,
        status="queued",
        received_at=now,
    )


@router.get("/transcribe/jobs/{job_id}", response_model=TranscriptionJobStatusResponse)
def get_transcription_job_status(job_id: str) -> TranscriptionJobStatusResponse:
    """Get current status for a transcription job."""
    job = AudioRepository().get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Transcription job not found")
    job.pop("_id", None)
    return TranscriptionJobStatusResponse(**job)


@router.get("/transcribe/jobs/{job_id}/result", response_model=TranscriptionResultResponse)
def get_transcription_result(job_id: str) -> TranscriptionResultResponse:
    """Fetch final transcription result."""
    repo = AudioRepository()
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Transcription job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"Result unavailable while status={job['status']}")
    result = repo.get_result(job_id)
    if not result:
        raise HTTPException(status_code=404, detail="Transcription result not found")
    result.pop("_id", None)
    return TranscriptionResultResponse(**result)


def _normalize_language_mix(value: str) -> str:
    """Normalize input language hints; guard against Swagger default placeholder."""
    normalized = str(value or "").strip().lower()
    if normalized in {"", "string", "default"}:
        return "en"
    return normalized
