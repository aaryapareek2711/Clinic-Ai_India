"""Generate India clinical note use case."""
from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.core.config import get_settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class GenerateIndiaClinicalNoteUseCase:
    """Compose context, generate note payload, persist clinical note."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.db = get_database()
        self.audio_repo = AudioRepository()
        self.note_repo = ClinicalNoteRepository()
        self.openai = OpenAIQuestionClient()

    def execute(
        self,
        *,
        patient_id: str,
        visit_id: str | None = None,
        transcription_job_id: str | None = None,
        force_regenerate: bool = False,
    ) -> dict:
        """Generate India note and save as canonical default artifact."""
        job = self._resolve_transcription_job(patient_id=patient_id, transcription_job_id=transcription_job_id)
        source_job_id = str(job.get("job_id"))
        if not force_regenerate:
            existing = self.note_repo.find_by_source_job(
                source_job_id=source_job_id,
                note_type="india_clinical",
            )
            if existing:
                existing.pop("_id", None)
                return existing

        context = self._build_context(patient_id=patient_id, visit_id=visit_id, job=job)
        payload = self._generate_payload(context)
        version = self._next_version(patient_id=patient_id, visit_id=visit_id, note_type="india_clinical")
        note_doc = {
            "note_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id or job.get("visit_id"),
            "note_type": "india_clinical",
            "source_job_id": source_job_id,
            "status": "generated",
            "version": version,
            "created_at": _utc_now(),
            "payload": payload,
        }
        created = self.note_repo.create_note(note_doc)
        created.pop("_id", None)
        return created

    def _resolve_transcription_job(self, *, patient_id: str, transcription_job_id: str | None) -> dict:
        if transcription_job_id:
            job = self.audio_repo.get_job(transcription_job_id)
        else:
            job = self.db.transcription_jobs.find_one(
                {"patient_id": patient_id, "status": "completed"},
                sort=[("completed_at", -1), ("updated_at", -1)],
            )
        if not job:
            raise ValueError("No completed transcription job found")
        if str(job.get("patient_id")) != patient_id:
            raise ValueError("Transcription job does not belong to patient")
        if job.get("status") != "completed":
            raise ValueError("Transcription job must be completed before note generation")
        return job

    def _build_context(self, *, patient_id: str, visit_id: str | None, job: dict) -> dict:
        transcript = self.audio_repo.get_result(str(job.get("job_id"))) or {}
        previsit = self.db.pre_visit_summaries.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)]) or {}
        intake = self.db.intake_sessions.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)]) or {}
        patient = self.db.patients.find_one({"patient_id": patient_id}) or {}
        vitals = self.db.patient_vitals.find_one({"patient_id": patient_id}, sort=[("submitted_at", -1)]) or {}

        medication_images = self._extract_medication_images(intake)
        data_gaps: list[str] = []
        if not transcript:
            data_gaps.append("transcript_missing")
        if not previsit:
            data_gaps.append("intake_empty")
        if not vitals:
            data_gaps.append("vitals_missing")
        if not medication_images:
            data_gaps.append("medication_images_missing")

        return {
            "patient_id": patient_id,
            "visit_id": visit_id or job.get("visit_id"),
            "transcription_job_id": job.get("job_id"),
            "transcript_text": transcript.get("full_transcript_text", ""),
            "transcript_segments": transcript.get("segments", []),
            "previsit_sections": previsit.get("sections", {}),
            "intake_answers": intake.get("answers", []),
            "patient_demographics": {
                "name": patient.get("name"),
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "preferred_language": patient.get("preferred_language"),
            },
            "latest_vitals": vitals.get("values", {}),
            "medication_images": medication_images,
            "data_gaps": data_gaps,
        }

    @staticmethod
    def _extract_medication_images(intake_session: dict) -> list[dict]:
        images: list[dict] = []
        for answer in intake_session.get("answers", []):
            if not isinstance(answer, dict):
                continue
            url = answer.get("image_url") or answer.get("media_url") or answer.get("attachment_url")
            if not url:
                continue
            images.append(
                {
                    "url": str(url),
                    "caption": str(answer.get("answer", "") or ""),
                    "source_topic": str(answer.get("topic", "") or ""),
                }
            )
        return images

    def _generate_payload(self, context: dict) -> dict:
        try:
            generated = self.openai.generate_india_clinical_note(context=context)
            payload = self._normalize_payload(generated, context=context)
        except Exception:
            payload = self._fallback_payload(context=context)
        return payload

    def _normalize_payload(self, generated: dict, *, context: dict) -> dict:
        payload = deepcopy(generated) if isinstance(generated, dict) else {}
        payload.setdefault("assessment", "Clinical assessment pending detailed review.")
        payload.setdefault("plan", "Correlate with examination findings and proceed with OPD management.")
        payload.setdefault("rx", [])
        payload.setdefault("investigations", [])
        payload.setdefault("red_flags", [])
        payload.setdefault("doctor_notes", None)
        payload.setdefault("chief_complaint", self._chief_complaint(context=context))
        payload["data_gaps"] = sorted(
            set([*(payload.get("data_gaps") or []), *(context.get("data_gaps") or [])])
        )
        has_follow_up_in = bool((payload.get("follow_up_in") or "").strip())
        has_follow_up_date = bool(payload.get("follow_up_date"))
        if has_follow_up_in == has_follow_up_date:
            payload["follow_up_in"] = "7 days"
            payload["follow_up_date"] = None
        if payload.get("follow_up_date") and isinstance(payload["follow_up_date"], (datetime, date)):
            payload["follow_up_date"] = payload["follow_up_date"].isoformat()
        return payload

    def _fallback_payload(self, *, context: dict) -> dict:
        return {
            "assessment": "Assessment is based on available transcript and intake context; correlation with physical examination is advised.",
            "plan": "Proceed with symptom-focused OPD management, safety-net counseling, and reassessment on follow-up.",
            "rx": [],
            "investigations": [],
            "red_flags": [
                "Persistent high fever",
                "Breathlessness at rest",
                "Worsening chest pain",
            ],
            "follow_up_in": "7 days",
            "follow_up_date": None,
            "doctor_notes": None,
            "chief_complaint": self._chief_complaint(context=context),
            "data_gaps": context.get("data_gaps", []),
        }

    @staticmethod
    def _chief_complaint(*, context: dict) -> str | None:
        sections = context.get("previsit_sections") or {}
        chief = sections.get("chief_complaint") if isinstance(sections, dict) else None
        if isinstance(chief, dict):
            reason = str(chief.get("reason_for_visit", "") or "").strip()
            return reason or None
        return None

    def _next_version(self, *, patient_id: str, visit_id: str | None, note_type: str) -> int:
        latest = self.note_repo.find_latest(patient_id=patient_id, visit_id=visit_id, note_type=note_type)
        if not latest:
            return 1
        return int(latest.get("version", 1)) + 1
