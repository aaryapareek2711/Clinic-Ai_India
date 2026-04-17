"""Transcription worker for Azure Speech pipeline."""
from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.external.storage.object_storage import AzureBlobStorage
from src.adapters.external.queue.consumer import TranscriptionQueueConsumer
from src.adapters.external.queue.producer import TranscriptionQueueProducer
from src.application.use_cases.generate_india_clinical_note import GenerateIndiaClinicalNoteUseCase
from src.core.config import get_settings

_BACKGROUND_TASKS: list[asyncio.Task] = []
_STOP_EVENT: asyncio.Event | None = None


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
        stale_job_ids = self.repo.requeue_stale_processing_jobs(
            max_processing_sec=self.settings.transcription_timeout_sec
        )
        for stale_job_id in stale_job_ids:
            self.producer.enqueue(stale_job_id)

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
            speech_response = await asyncio.wait_for(
                asyncio.to_thread(self._call_azure_speech, job=job, audio_doc=audio_doc),
                timeout=self.settings.transcription_timeout_sec,
            )

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
            self._auto_generate_default_note(job=job)
        except Exception as exc:  # noqa: BLE001
            if "NON_RETRIABLE_NO_TEXT" in str(exc):
                self.repo.mark_failed(
                    job_id,
                    error_code="TRANSCRIPTION_FAILED",
                    error_message=str(exc).replace("NON_RETRIABLE_NO_TEXT: ", ""),
                )
                self.consumer.ack_last()
                return True
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

    def _auto_generate_default_note(self, *, job: dict) -> None:
        """Generate default India note after successful transcription completion."""
        if self.settings.default_note_type != "india_clinical":
            return
        try:
            GenerateIndiaClinicalNoteUseCase().execute(
                patient_id=str(job.get("patient_id")),
                visit_id=job.get("visit_id"),
                transcription_job_id=str(job.get("job_id")),
                force_regenerate=False,
            )
        except Exception:
            # Do not fail transcription completion if note generation errors.
            return

    def _has_previsit(self, patient_id: str) -> bool:
        return (
            self.db.pre_visit_summaries.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)])
            is not None
        )

    def _call_azure_speech(self, *, job: dict, audio_doc: dict) -> dict:
        if not self.settings.azure_speech_key:
            raise RuntimeError("AZURE_SPEECH_KEY is not configured")
        primary_locale = self._language_hint_to_locale(str(job.get("language_mix", "") or "en"))
        storage_ref = str(audio_doc.get("blob_url", "") or audio_doc.get("blob_path", "") or "")
        if not storage_ref:
            raise RuntimeError("Audio storage reference not found")
        audio_bytes = AzureBlobStorage().download_audio(storage_ref)
        content_type = self._normalize_audio_content_type(str(audio_doc.get("mime_type", "") or "audio/wav"))
        last_404: HTTPError | None = None
        last_raw: dict | None = None

        for locale in self._candidate_locales(primary_locale):
            for endpoint in self._candidate_azure_speech_endpoints(locale):
                try:
                    req = Request(endpoint, data=audio_bytes, method="POST")
                    req.add_header("Ocp-Apim-Subscription-Key", self.settings.azure_speech_key)
                    req.add_header("Accept", "application/json;text/xml")
                    req.add_header("Content-Type", content_type)
                    with urlopen(req, timeout=self.settings.transcription_timeout_sec) as response:
                        raw = json.loads(response.read().decode("utf-8"))
                    normalized = self._normalize_azure_response(raw, locale)
                    if normalized.get("segments"):
                        return normalized
                    last_raw = raw
                except HTTPError as exc:
                    if exc.code == 404:
                        last_404 = exc
                        continue
                    raise

        if last_404 is not None:
            raise RuntimeError(
                "Azure Speech endpoint not found (404). Check AZURE_SPEECH_REGION/ENDPOINT and resource region."
            ) from last_404
        if last_raw is not None:
            status = str(last_raw.get("RecognitionStatus", "unknown"))
            mime_type = str(audio_doc.get("mime_type", "unknown") or "unknown")
            raise RuntimeError(
                "NON_RETRIABLE_NO_TEXT: "
                "Azure Speech returned no transcript text. "
                f"RecognitionStatus={status}. "
                f"Input MIME={mime_type}. "
                "Possible reasons: unsupported audio codec/container, unclear/silent audio, or locale mismatch. "
                "Try WAV (PCM) or MP3 with clear speech."
            )
        raise RuntimeError("Azure Speech transcription failed without response")

    @staticmethod
    def _language_hint_to_locale(language_mix: str) -> str:
        mapping = {
            "en": "en-IN",
            "hi": "hi-IN",
            "ta": "ta-IN",
            "te": "te-IN",
            "bn": "bn-IN",
            "mr": "mr-IN",
            "kn": "kn-IN",
        }
        token = str(language_mix or "").strip().lower().split("-")[0]
        return mapping.get(token, "en-IN")

    def _resolve_azure_speech_endpoint(self, locale: str) -> str:
        configured = str(self.settings.azure_speech_endpoint or "").strip().rstrip("/")
        if configured:
            if ".api.cognitive.microsoft.com" in configured:
                configured = configured.replace(".api.cognitive.microsoft.com", ".stt.speech.microsoft.com")
            if "/speech/recognition/" in configured:
                if "language=" in configured:
                    return configured
                separator = "&" if "?" in configured else "?"
                return f"{configured}{separator}language={locale}&format=detailed"
            return (
                f"{configured}/speech/recognition/conversation/cognitiveservices/v1"
                f"?language={locale}&format=detailed"
            )
        if not self.settings.azure_speech_region:
            raise RuntimeError("Set AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT")
        return (
            f"https://{self.settings.azure_speech_region}.stt.speech.microsoft.com/"
            f"speech/recognition/conversation/cognitiveservices/v1?language={locale}&format=detailed"
        )

    def _candidate_azure_speech_endpoints(self, locale: str) -> list[str]:
        candidates: list[str] = []
        configured = str(self.settings.azure_speech_endpoint or "").strip().rstrip("/")
        if configured:
            candidates.append(self._resolve_azure_speech_endpoint(locale))
        if self.settings.azure_speech_region:
            region_endpoint = (
                f"https://{self.settings.azure_speech_region}.stt.speech.microsoft.com/"
                f"speech/recognition/conversation/cognitiveservices/v1?language={locale}&format=detailed"
            )
            if region_endpoint not in candidates:
                candidates.append(region_endpoint)
        if not candidates:
            raise RuntimeError("Set AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT")
        return candidates

    @staticmethod
    def _normalize_azure_response(raw: dict, locale: str) -> dict:
        segments = []
        nbest = raw.get("NBest") or []
        best = nbest[0] if isinstance(nbest, list) and nbest else {}
        display_text = str(raw.get("DisplayText") or best.get("Display") or best.get("Lexical") or "").strip()
        if display_text:
            confidence = float(best.get("Confidence", 0.85) or 0.85)
            offset_ticks = int(raw.get("Offset", 0) or 0)
            duration_ticks = int(raw.get("Duration", 0) or 0)
            start_ms = max(0, offset_ticks // 10000)
            end_ms = max(start_ms, start_ms + (duration_ticks // 10000))
            segments.append(
                {
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "speaker_label": "unknown",
                    "text": display_text,
                    "confidence": confidence,
                    "needs_manual_review": False,
                }
            )

        recognized_phrases = raw.get("RecognizedPhrases") or []
        for phrase in recognized_phrases:
            phrase_text = str(phrase.get("Display") or phrase.get("Lexical") or "").strip()
            if not phrase_text:
                continue
            offset_ticks = int(phrase.get("Offset", 0) or 0)
            duration_ticks = int(phrase.get("Duration", 0) or 0)
            start_ms = max(0, offset_ticks // 10000)
            end_ms = max(start_ms, start_ms + (duration_ticks // 10000))
            nbest_phrase = phrase.get("NBest") or []
            best_phrase = nbest_phrase[0] if isinstance(nbest_phrase, list) and nbest_phrase else {}
            confidence = float(best_phrase.get("Confidence", 0.85) or 0.85)
            segments.append(
                {
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                    "speaker_label": "unknown",
                    "text": phrase_text,
                    "confidence": confidence,
                    "needs_manual_review": False,
                }
            )

        if not segments:
            combined = raw.get("CombinedRecognizedPhrases") or []
            for phrase in combined:
                text = str(phrase.get("Display") or phrase.get("Lexical") or "").strip()
                if not text:
                    continue
                segments.append(
                    {
                        "start_ms": 0,
                        "end_ms": 0,
                        "speaker_label": "unknown",
                        "text": text,
                        "confidence": 0.85,
                        "needs_manual_review": False,
                    }
                )
        return {"language_detected": locale, "segments": segments}

    @staticmethod
    def _normalize_audio_content_type(mime_type: str) -> str:
        mime = str(mime_type or "").strip().lower()
        mapping = {
            "audio/x-m4a": "audio/mp4",
            "audio/m4a": "audio/mp4",
            "audio/mp3": "audio/mpeg",
            "audio/x-wav": "audio/wav",
        }
        return mapping.get(mime, mime or "audio/wav")

    @staticmethod
    def _candidate_locales(primary_locale: str) -> list[str]:
        candidates = [primary_locale]
        for locale in ("en-IN", "en-US", "hi-IN"):
            if locale not in candidates:
                candidates.append(locale)
        return candidates

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


async def _worker_loop(worker_id: int, stop_event: asyncio.Event, poll_interval_sec: float) -> None:
    worker = TranscriptionWorker()
    while not stop_event.is_set():
        processed = await worker.process_next_async()
        if not processed:
            await asyncio.sleep(poll_interval_sec)


def start_background_workers() -> None:
    """Start background transcription workers once per process."""
    global _BACKGROUND_TASKS, _STOP_EVENT
    if _BACKGROUND_TASKS:
        return
    settings = get_settings()
    _STOP_EVENT = asyncio.Event()
    concurrency = max(1, int(settings.transcription_worker_concurrency))
    poll_interval = max(0.2, float(settings.transcription_worker_poll_interval_sec))
    for i in range(concurrency):
        _BACKGROUND_TASKS.append(asyncio.create_task(_worker_loop(i + 1, _STOP_EVENT, poll_interval)))


async def stop_background_workers() -> None:
    """Stop background transcription workers gracefully."""
    global _BACKGROUND_TASKS, _STOP_EVENT
    if not _BACKGROUND_TASKS:
        return
    if _STOP_EVENT is not None:
        _STOP_EVENT.set()
    await asyncio.gather(*_BACKGROUND_TASKS, return_exceptions=True)
    _BACKGROUND_TASKS = []
    _STOP_EVENT = None
