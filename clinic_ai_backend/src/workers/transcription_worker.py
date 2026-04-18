"""Transcription worker for Azure Speech pipeline."""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import tempfile
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlparse
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
        declared_mime = self._normalize_audio_content_type(str(audio_doc.get("mime_type", "") or "audio/wav"))
        last_404: HTTPError | None = None
        last_raw: dict | None = None

        wav_bytes, transcode_error = self._try_transcode_to_wav_pcm16k_mono(audio_bytes, declared_mime)
        for audio_payload, content_type in self._audio_payload_candidates(
            audio_bytes, declared_mime, wav_bytes
        ):
            for locale in self._candidate_locales(primary_locale):
                for endpoint in self._candidate_azure_speech_endpoints(locale):
                    try:
                        req = Request(endpoint, data=audio_payload, method="POST")
                        req.add_header("Ocp-Apim-Subscription-Key", self.settings.azure_speech_key)
                        req.add_header("Accept", "application/json;text/xml")
                        req.add_header("Content-Type", content_type)
                        with urlopen(req, timeout=self.settings.transcription_timeout_sec) as response:
                            raw = json.loads(response.read().decode("utf-8"))
                        if isinstance(raw, list):
                            raw = next((item for item in raw if isinstance(item, dict)), {})
                        if not isinstance(raw, dict):
                            continue
                        normalized = self._normalize_azure_response(raw, locale)
                        if normalized.get("segments"):
                            return normalized
                        last_raw = raw if isinstance(raw, dict) else last_raw
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
            if not shutil.which("ffmpeg"):
                ffmpeg_hint = (
                    "Install ffmpeg on the server (see deployments/docker/Dockerfile.api) so audio can be "
                    "converted to 16 kHz mono PCM WAV before Azure recognition."
                )
            elif transcode_error:
                ffmpeg_hint = (
                    f"FFmpeg failed while normalizing audio ({transcode_error}). "
                    "Fix the source file or install codecs; Azure then received the original bytes only."
                )
            else:
                ffmpeg_hint = (
                    "FFmpeg normalized WAV was tried first; if this persists, the source may be silent, "
                    "not speech, or the language hint may not match the spoken language."
                )
            raise RuntimeError(
                "NON_RETRIABLE_NO_TEXT: "
                "Azure Speech returned no transcript text. "
                f"RecognitionStatus={status}. "
                f"Input MIME={mime_type}. "
                "Azure treated the request as successful but found no words. "
                "Common causes: silent/corrupt audio, wrong language vs speech, or compressed audio Azure could not decode. "
                f"{ffmpeg_hint}"
            )
        raise RuntimeError("Azure Speech transcription failed without response")

    def _audio_payload_candidates(
        self, audio_bytes: bytes, declared_mime: str, wav_bytes: bytes | None
    ) -> list[tuple[bytes, str]]:
        """Prefer FFmpeg-normalized WAV for Azure REST compatibility, then original bytes."""
        candidates: list[tuple[bytes, str]] = []
        if wav_bytes:
            candidates.append((wav_bytes, "audio/wav"))
        candidates.append((audio_bytes, declared_mime))
        deduped: list[tuple[bytes, str]] = []
        seen: set[int] = set()
        for payload, mime in candidates:
            key = id(payload)
            if key in seen:
                continue
            seen.add(key)
            deduped.append((payload, mime))
        return deduped

    def _try_transcode_to_wav_pcm16k_mono(self, audio_bytes: bytes, declared_mime: str) -> tuple[bytes | None, str | None]:
        if not shutil.which("ffmpeg"):
            return None, None
        suffix = self._suffix_for_mime(declared_mime)
        in_path: str | None = None
        out_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
                tmp_in.write(audio_bytes)
                in_path = tmp_in.name
            out_path = f"{in_path}.wav"
            cmd = [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                in_path,
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                "-f",
                "wav",
                out_path,
            ]
            proc = subprocess.run(cmd, check=False, capture_output=True, timeout=120)
            if proc.returncode != 0:
                err = (proc.stderr or proc.stdout or b"").decode("utf-8", errors="replace").strip()
                return None, err[:500] if err else f"exit code {proc.returncode}"
            with open(out_path, "rb") as wav_file:
                data = wav_file.read()
            if not data:
                return None, "empty WAV output"
            return data, None
        except subprocess.TimeoutExpired:
            return None, "ffmpeg timed out"
        except OSError as exc:
            return None, str(exc)
        finally:
            for path in (in_path, out_path):
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except OSError:
                        pass

    @staticmethod
    def _suffix_for_mime(mime_type: str) -> str:
        mime = str(mime_type or "").strip().lower()
        if "wav" in mime:
            return ".wav"
        if "mpeg" in mime or "mp3" in mime:
            return ".mp3"
        if "mp4" in mime or "m4a" in mime:
            return ".m4a"
        if "webm" in mime:
            return ".webm"
        return ".bin"

    def _speech_host_candidates(self) -> list[str]:
        hosts: list[str] = []
        configured = str(self.settings.azure_speech_endpoint or "").strip().rstrip("/")
        if configured:
            url = configured if "://" in configured else f"https://{configured}"
            parsed = urlparse(url)
            host = (parsed.hostname or "").strip()
            if host:
                if ".api.cognitive.microsoft.com" in host:
                    host = host.replace(".api.cognitive.microsoft.com", ".stt.speech.microsoft.com")
                hosts.append(host)
        if self.settings.azure_speech_region:
            region_host = f"{self.settings.azure_speech_region}.stt.speech.microsoft.com"
            if region_host not in hosts:
                hosts.append(region_host)
        return hosts

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

    def _candidate_azure_speech_endpoints(self, locale: str) -> list[str]:
        """Short-audio REST: try interactive then conversation on each Speech host."""
        urls: list[str] = []
        for host in self._speech_host_candidates():
            for mode in ("interactive", "conversation"):
                url = (
                    f"https://{host}/speech/recognition/{mode}/cognitiveservices/v1"
                    f"?language={locale}&format=detailed"
                )
                if url not in urls:
                    urls.append(url)
        if not urls:
            raise RuntimeError("Set AZURE_SPEECH_REGION or AZURE_SPEECH_ENDPOINT")
        return urls

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

        if not segments:
            deep_texts = TranscriptionWorker._collect_recognition_strings(raw)
            if deep_texts:
                combined = " ".join(dict.fromkeys(deep_texts)).strip()
                if combined:
                    segments.append(
                        {
                            "start_ms": 0,
                            "end_ms": 0,
                            "speaker_label": "unknown",
                            "text": combined,
                            "confidence": 0.85,
                            "needs_manual_review": False,
                        }
                    )
        return {"language_detected": locale, "segments": segments}

    @staticmethod
    def _collect_recognition_strings(node: Any, depth: int = 0) -> list[str]:
        """Best-effort walk of Azure JSON for any human-readable recognition strings."""
        if depth > 12:
            return []
        found: list[str] = []
        if isinstance(node, dict):
            for key, value in node.items():
                lk = str(key).lower()
                if lk in {"displaytext", "display", "lexical"} and isinstance(value, str):
                    text = value.strip()
                    if text:
                        found.append(text)
                else:
                    found.extend(TranscriptionWorker._collect_recognition_strings(value, depth + 1))
        elif isinstance(node, list):
            for item in node:
                found.extend(TranscriptionWorker._collect_recognition_strings(item, depth + 1))
        return found

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
