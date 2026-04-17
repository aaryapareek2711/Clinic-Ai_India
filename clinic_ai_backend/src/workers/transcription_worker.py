"""Transcription worker for Azure Speech pipeline."""
from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.request import Request, urlopen

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.external.queue.consumer import TranscriptionQueueConsumer
from src.adapters.external.queue.producer import TranscriptionQueueProducer
from src.core.config import get_settings


class TranscriptionWorker:
    """Worker that processes transcription queue jobs."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.repo = AudioRepository()
        self.consumer = TranscriptionQueueConsumer()
        self.producer = TranscriptionQueueProducer()
        self.db = get_database()

    def process_next(self) -> bool:
        """Sync wrapper used by tests/CLI."""
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(self.process_next_async())
        # If we're already inside an event loop, the sync wrapper isn't safe.
        raise RuntimeError("Use process_next_async() when an event loop is already running")

    async def process_next_async(self) -> bool:
        """Process one queued message (async-friendly for local demo mode)."""
        job_id = self.consumer.pop_next_job_id()
        if not job_id:
            return False

        job = self.repo.get_job(job_id)
        if not job:
            self.consumer.ack_last()
            return True

        if not self._has_previsit(job["patient_id"]):
            self.repo.mark_failed(
                job_id,
                error_code="PREVISIT_MISSING",
                error_message="Pre-visit summary not found at processing time",
            )
            self.consumer.ack_last()
            return True

        audio_doc = self.repo.get_audio_by_id(job["audio_id"])
        if not audio_doc:
            self.repo.mark_failed(
                job_id,
                error_code="AUDIO_MISSING",
                error_message="Audio metadata not found for transcription job",
            )
            self.consumer.ack_last()
            return True

        self.repo.mark_processing(job_id)
        try:
            if self.settings.use_local_adapters:
                speech_response = await asyncio.to_thread(self._call_whisper_local, audio_doc=audio_doc)
            else:
                speech_response = await asyncio.to_thread(self._call_azure_speech, job=job, audio_doc=audio_doc)

            normalized = self._normalize_segments(speech_response.get("segments", []))
            if not normalized:
                raise RuntimeError("No transcript segments returned by speech provider")

            review_count = sum(1 for segment in normalized if segment["needs_manual_review"])
            review_ratio = review_count / len(normalized)
            full_text = " ".join(segment["text"] for segment in normalized if segment["text"]).strip()
            avg_confidence = sum(segment["confidence"] for segment in normalized) / len(normalized)
            if self.settings.use_local_adapters:
                requires_manual_review = False
            else:
                requires_manual_review = (
                    review_ratio >= self.settings.transcription_manual_review_ratio_threshold
                )

            self.repo.save_result(
                {
                    "job_id": job["job_id"],
                    "patient_id": job["patient_id"],
                    "visit_id": job.get("visit_id"),
                    "language_detected": speech_response.get("language_detected", "unknown"),
                    "overall_confidence": round(avg_confidence, 4),
                    "requires_manual_review": requires_manual_review,
                    "full_transcript_text": full_text,
                    "segments": normalized,
                }
            )
            self.repo.mark_completed(job_id)
        except Exception as exc:  # noqa: BLE001
            refreshed = self.repo.increment_retry(
                job_id,
                error_code="TRANSCRIPTION_FAILED_RETRY",
                error_message=str(exc),
            )
            retry_count = refreshed["retry_count"] if refreshed else job.get("retry_count", 0) + 1
            max_retries = refreshed["max_retries"] if refreshed else job.get("max_retries", 0)
            if retry_count >= max_retries:
                self.repo.mark_failed(
                    job_id,
                    error_code="TRANSCRIPTION_FAILED",
                    error_message=str(exc),
                )
            else:
                self.producer.enqueue(job_id)
        finally:
            self.consumer.ack_last()
        return True

    def _has_previsit(self, patient_id: str) -> bool:
        return (
            self.db.pre_visit_summaries.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)])
            is not None
        )

    def _call_azure_speech(self, *, job: dict, audio_doc: dict) -> dict:
        if not self.settings.azure_speech_key:
            raise RuntimeError("AZURE_SPEECH_KEY is not configured")
        endpoint = self.settings.azure_speech_endpoint or (
            "https://"
            f"{self.settings.azure_speech_region}.stt.speech.microsoft.com/speech/recognition/"
            "conversation/cognitiveservices/v1?format=detailed"
        )
        payload = {
            "contentUrls": [audio_doc["blob_url"]],
            "properties": {
                "languageHints": job["language_mix"].split("-"),
                "noiseEnvironment": job["noise_environment"],
                "expectedSpeakers": 2 if job["speaker_mode"] == "two_speakers" else 3,
            },
        }
        body = json.dumps(payload).encode("utf-8")
        req = Request(endpoint, data=body, method="POST")
        req.add_header("Ocp-Apim-Subscription-Key", self.settings.azure_speech_key)
        req.add_header("Content-Type", "application/json")
        with urlopen(req, timeout=self.settings.transcription_timeout_sec) as response:
            return json.loads(response.read().decode("utf-8"))

    def _call_whisper_local(self, *, audio_doc: dict) -> dict:
        try:
            import whisper  # type: ignore
        except ImportError as exc:
            raise RuntimeError("openai-whisper is not installed") from exc
        model = whisper.load_model(self.settings.whisper_model_size)
        result = model.transcribe(audio_doc["blob_path"])
        segments = []
        for raw in result.get("segments", []):
            segments.append(
                {
                    "start_ms": int(float(raw.get("start", 0.0)) * 1000),
                    "end_ms": int(float(raw.get("end", 0.0)) * 1000),
                    "speaker_label": "unknown",
                    "text": str(raw.get("text", "")).strip(),
                    "confidence": 0.90,
                    "needs_manual_review": False,
                }
            )
        return {"language_detected": result.get("language", "unknown"), "segments": segments}

    def _normalize_segments(self, segments: list[dict[str, Any]]) -> list[dict]:
        normalized: list[dict] = []
        for index, raw in enumerate(segments):
            confidence = float(raw.get("confidence", 0.0))
            speaker = self._canonical_speaker(raw.get("speaker_label") or raw.get("speaker"))
            needs_manual_review = bool(raw.get("needs_manual_review", False))
            if not self.settings.use_local_adapters:
                needs_manual_review = confidence < self.settings.transcription_confidence_threshold
            normalized.append(
                {
                    "segment_id": f"seg_{index + 1}",
                    "start_ms": int(raw.get("start_ms", 0)),
                    "end_ms": int(raw.get("end_ms", 0)),
                    "speaker_label": speaker,
                    "text": str(raw.get("text", "")).strip(),
                    "confidence": round(confidence, 4),
                    "needs_manual_review": needs_manual_review,
                }
            )
        return normalized

    @staticmethod
    def _canonical_speaker(value: str | None) -> str:
        if not value:
            return "unknown"
        speaker = value.lower().strip()
        if speaker in {"doctor", "physician", "clinician"}:
            return "doctor"
        if speaker in {"patient", "speaker_1"}:
            return "patient"
        if speaker in {"attendant", "caregiver", "speaker_2"}:
            return "attendant"
        return "unknown"
