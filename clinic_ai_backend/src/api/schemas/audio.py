"""Audio and transcription API schemas module."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


NoiseEnvironment = Literal["quiet_clinic", "moderate_opd", "crowded_opd", "high_noise"]
SpeakerMode = Literal["two_speakers", "three_speakers"]


class TranscriptionUploadAcceptedResponse(BaseModel):
    """Async upload accepted response."""

    job_id: str
    message_id: str
    patient_id: str
    visit_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    received_at: datetime
    message: str | None = None


class TranscriptionJobStatusResponse(BaseModel):
    """Transcription job status response."""

    job_id: str
    patient_id: str
    visit_id: str | None
    status: Literal["queued", "processing", "completed", "failed"]
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime
    error_code: str | None = None
    error_message: str | None = None


class TranscriptSegmentResponse(BaseModel):
    """Single normalized transcript segment."""

    segment_id: str
    start_ms: int
    end_ms: int
    speaker_label: Literal["doctor", "patient", "attendant", "unknown"]
    text: str
    confidence: float
    needs_manual_review: bool


class TranscriptionResultResponse(BaseModel):
    """Completed transcription result response."""

    job_id: str
    patient_id: str
    visit_id: str | None
    language_detected: str
    overall_confidence: float
    requires_manual_review: bool
    full_transcript_text: str
    segments: list[TranscriptSegmentResponse]
