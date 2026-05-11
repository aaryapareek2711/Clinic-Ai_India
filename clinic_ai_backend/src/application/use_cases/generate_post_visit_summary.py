"""Generate post-visit summary use case."""
from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.adapters.services.post_visit_summary_service import PostVisitSummaryService
from src.application.use_cases.schedule_follow_up_reminders import schedule_follow_up_after_post_visit
from src.application.utils.follow_up_dates import parse_next_visit_at


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


LANGUAGE_NAMES = {
    "en": "English",
    "en_us": "English",
    "hi": "Hindi",
    "hi-eng": "Hindi and English (short, patient-friendly mixed wording for WhatsApp)",
}


class GeneratePostVisitSummaryUseCase:
    """Generate and persist patient-friendly post-visit summary note."""

    def __init__(self) -> None:
        self.db = get_database()
        self.audio_repo = AudioRepository()
        self.note_repo = ClinicalNoteRepository()
        self.summary_service = PostVisitSummaryService()

    def execute(
        self,
        *,
        patient_id: str,
        visit_id: str | None = None,
        transcription_job_id: str | None = None,
        preferred_language: str | None = None,
        follow_up_in: str | None = None,
        follow_up_date: date | None = None,
    ) -> dict:
        """Generate summary with India-note-first strategy and transcript fallback."""
        patient = self.db.patients.find_one({"patient_id": patient_id}) or {}
        resolved_language = self._resolve_language(
            patient_preferred_language=patient.get("preferred_language"),
            request_language=preferred_language,
        )
        if not resolved_language:
            raise ValueError("preferred_language missing in both patient profile and request")

        india_note = self.note_repo.find_latest(
            patient_id=patient_id,
            visit_id=visit_id,
            note_type="india_clinical",
        )
        job: dict | None = None
        transcript: dict = {}
        if transcription_job_id or not india_note:
            job = self._resolve_transcription_job(
                patient_id=patient_id,
                visit_id=visit_id,
                transcription_job_id=transcription_job_id,
            )
            transcript = self.audio_repo.get_result(str(job.get("job_id"))) or {}
            if not transcript and str(job.get("_session_transcript") or "").strip():
                transcript = {"full_transcript_text": str(job.get("_session_transcript") or "")}

        if not india_note and not transcript:
            raise ValueError("No India clinical note or completed transcription available")

        context = self._build_context(india_note=india_note, transcript=transcript)
        payload_by_language = self._build_payloads_by_language(
            context=context,
            preferred_language=resolved_language,
            follow_up_in=follow_up_in,
            follow_up_date=follow_up_date,
        )
        # Keep backward compatibility for callers that still read only payload/whatsapp_payload.
        payload = dict(payload_by_language.get("en") or {})
        whatsapp_payload_by_language = {
            lang: self._build_whatsapp_payload(payload=lang_payload)
            for lang, lang_payload in payload_by_language.items()
        }
        whatsapp_payload = str(whatsapp_payload_by_language.get("en") or "")

        version = self._next_version(patient_id=patient_id, visit_id=visit_id, note_type="post_visit_summary")
        note_doc = {
            "note_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id or (india_note or {}).get("visit_id") or (job or {}).get("visit_id"),
            "note_type": "post_visit_summary",
            "source_job_id": str((india_note or {}).get("source_job_id") or (job or {}).get("job_id") or ""),
            "status": "generated",
            "version": version,
            "created_at": _utc_now(),
            "payload": payload,
            "payload_by_language": payload_by_language,
            "default_language": "en",
            "preferred_language": resolved_language,
            "whatsapp_payload": whatsapp_payload,
            "whatsapp_payload_by_language": whatsapp_payload_by_language,
        }
        created = self.note_repo.create_note(note_doc)
        created.pop("_id", None)
        schedule_follow_up_after_post_visit(
            db=self.db,
            patient_id=patient_id,
            visit_id=str(created.get("visit_id") or ""),
            note_id=str(created.get("note_id") or ""),
            payload=payload,
            patient=patient,
            preferred_language=resolved_language,
        )
        return created

    def _build_payloads_by_language(
        self,
        *,
        context: dict,
        preferred_language: str,
        follow_up_in: str | None,
        follow_up_date: date | None,
    ) -> dict[str, dict]:
        """Generate English-first payload plus preferred-language variant when needed."""
        payloads: dict[str, dict] = {}

        english_payload = self._generate_payload(context=context, language_name=LANGUAGE_NAMES["en"])
        payloads["en"] = self._apply_follow_up_overrides(
            payload=english_payload,
            follow_up_in=follow_up_in,
            follow_up_date=follow_up_date,
        )

        preferred = str(preferred_language or "").strip().lower()
        if preferred and preferred != "en":
            preferred_language_name = LANGUAGE_NAMES.get(preferred, preferred)
            preferred_payload = self._generate_payload(context=context, language_name=preferred_language_name)
            payloads[preferred] = self._apply_follow_up_overrides(
                payload=preferred_payload,
                follow_up_in=follow_up_in,
                follow_up_date=follow_up_date,
            )

        return payloads

    @staticmethod
    def _apply_follow_up_overrides(
        *,
        payload: dict,
        follow_up_in: str | None,
        follow_up_date: date | None,
    ) -> dict:
        updated = dict(payload or {})
        follow_up_in_text = str(follow_up_in or "").strip()
        if follow_up_in_text:
            updated["follow_up"] = follow_up_in_text
        if follow_up_date is not None:
            parsed_staff = parse_next_visit_at(follow_up_date)
            if parsed_staff:
                updated["next_visit_date"] = parsed_staff.date().isoformat()
        return updated

    def _resolve_transcription_job(
        self,
        *,
        patient_id: str,
        visit_id: str | None,
        transcription_job_id: str | None,
    ) -> dict:
        if transcription_job_id:
            job = self.audio_repo.get_job(transcription_job_id)
            if not job:
                visit = self.db.visits.find_one(
                    {"$or": [{"visit_id": visit_id}, {"id": visit_id}], "patient_id": patient_id},
                    {"_id": 0, "transcription_session": 1},
                ) or {}
                session = dict(visit.get("transcription_session") or {})
                if session and str(session.get("transcription_status") or "").lower() == "completed":
                    session_job_id = str(session.get("job_id") or "").strip() or str(session.get("transcription_id") or "").strip()
                    transcript_text = str(session.get("transcript") or "").strip()
                    if session_job_id or transcript_text:
                        job = {
                            "job_id": session_job_id or f"visit-session:{visit_id}",
                            "patient_id": patient_id,
                            "visit_id": visit_id,
                            "status": "completed",
                            "_session_transcript": transcript_text,
                        }
        else:
            query: dict[str, object] = {"patient_id": patient_id, "status": "completed"}
            if visit_id:
                query["visit_id"] = visit_id
            job = self.db.transcription_jobs.find_one(
                query,
                sort=[("completed_at", -1), ("updated_at", -1)],
            )
            if not job:
                visit = self.db.visits.find_one(
                    {"$or": [{"visit_id": visit_id}, {"id": visit_id}], "patient_id": patient_id},
                    {"_id": 0, "transcription_session": 1},
                ) or {}
                session = dict(visit.get("transcription_session") or {})
                if session and str(session.get("transcription_status") or "").lower() == "completed":
                    session_job_id = str(session.get("job_id") or "").strip() or str(session.get("transcription_id") or "").strip()
                    transcript_text = str(session.get("transcript") or "").strip()
                    # Allow visit-session transcript even when job_id is missing (session-only completion path).
                    if session_job_id or transcript_text:
                        job = {
                            "job_id": session_job_id or f"visit-session:{visit_id}",
                            "patient_id": patient_id,
                            "visit_id": visit_id,
                            "status": "completed",
                            "_session_transcript": transcript_text,
                        }
        if not job:
            raise ValueError("No completed transcription job found")
        if str(job.get("patient_id")) != patient_id:
            raise ValueError("Transcription job does not belong to patient")
        if visit_id and str(job.get("visit_id") or "") != str(visit_id):
            raise ValueError("Transcription job does not belong to this visit")
        return job

    def _build_context(self, *, india_note: dict | None, transcript: dict) -> dict:
        india_payload = (india_note or {}).get("payload") or {}
        return {
            "india_clinical_note": india_payload,
            "transcript_text": str(transcript.get("full_transcript_text", "") or ""),
            "input_priority": "india_clinical_note_first_transcript_fallback",
        }

    def _generate_payload(self, *, context: dict, language_name: str) -> dict:
        try:
            generated = self.summary_service.generate(context=context, language_name=language_name)
            return self._normalize_payload(generated)
        except Exception:
            return self._fallback_payload(context=context)

    @staticmethod
    def _normalize_payload(generated: dict) -> dict:
        payload = dict(generated or {})
        payload.setdefault("visit_reason", "Visit reason was discussed during consultation.")
        payload.setdefault("what_doctor_found", "Doctor findings were explained during consultation.")
        payload["medicines_to_take"] = [str(item).strip() for item in (payload.get("medicines_to_take") or []) if str(item).strip()]
        payload["tests_recommended"] = [str(item).strip() for item in (payload.get("tests_recommended") or []) if str(item).strip()]
        payload["self_care"] = [str(item).strip() for item in (payload.get("self_care") or []) if str(item).strip()]
        payload["warning_signs"] = [str(item).strip() for item in (payload.get("warning_signs") or []) if str(item).strip()]
        payload.setdefault("follow_up", "Follow your doctor's advice for the next review.")
        nd = payload.get("next_visit_date")
        parsed = parse_next_visit_at(nd)
        if parsed:
            payload["next_visit_date"] = parsed.date().isoformat()
        else:
            payload.pop("next_visit_date", None)
        return payload

    @staticmethod
    def _fallback_payload(*, context: dict) -> dict:
        india_payload = context.get("india_clinical_note") or {}
        meds = []
        for item in india_payload.get("rx", []) or []:
            if isinstance(item, dict):
                line = " ".join(
                    str(v).strip()
                    for v in [
                        item.get("medicine_name"),
                        item.get("dose"),
                        item.get("frequency"),
                        item.get("duration"),
                        item.get("food_instruction"),
                    ]
                    if str(v or "").strip()
                )
                if line:
                    meds.append(line)
        tests = []
        for item in india_payload.get("investigations", []) or []:
            if isinstance(item, dict) and str(item.get("test_name") or "").strip():
                tests.append(str(item.get("test_name")).strip())
        fu_raw = india_payload.get("follow_up_date")
        next_visit_iso: str | None = None
        if fu_raw not in (None, ""):
            p = parse_next_visit_at(fu_raw)
            if p:
                next_visit_iso = p.date().isoformat()
        out = {
            "visit_reason": str(india_payload.get("chief_complaint") or "Your concern discussed during this visit."),
            "what_doctor_found": str(india_payload.get("assessment") or "Findings based on doctor consultation."),
            "medicines_to_take": meds,
            "tests_recommended": tests,
            "self_care": ["Drink enough fluids", "Take adequate rest"],
            "warning_signs": [str(x).strip() for x in (india_payload.get("red_flags") or []) if str(x).strip()],
            "follow_up": str(
                india_payload.get("follow_up_in")
                or india_payload.get("follow_up_date")
                or "Follow up as advised by your doctor."
            ),
        }
        if next_visit_iso:
            out["next_visit_date"] = next_visit_iso
        return out

    @staticmethod
    def _build_whatsapp_payload(*, payload: dict) -> str:
        medicines = payload.get("medicines_to_take") or []
        tests = payload.get("tests_recommended") or []
        self_care = payload.get("self_care") or []
        warnings = payload.get("warning_signs") or []
        follow_up_text = str(payload.get("follow_up") or "").strip()
        next_visit_date = str(payload.get("next_visit_date") or "").strip()
        follow_up_line = follow_up_text
        if next_visit_date:
            follow_up_line = f"{follow_up_text} (Next visit date: {next_visit_date})".strip()
        lines = [
            "Post-visit summary",
            f"🩺 Finding: {payload.get('what_doctor_found', '')}",
            f"💊 Medicines: {', '.join(medicines) if medicines else 'As advised by doctor'}",
            f"🔬 Tests: {', '.join(tests) if tests else 'No additional tests'}",
            f"📅 Follow-up: {follow_up_line}",
            f"🛟 Self-care: {', '.join(self_care) if self_care else 'Rest, hydration, and follow medicine instructions'}",
            f"⚠️ Warning signs: {', '.join(warnings) if warnings else 'If symptoms worsen, contact your doctor'}",
        ]
        return "\n".join(line.strip() for line in lines if line.strip())

    @staticmethod
    def _resolve_language(*, patient_preferred_language: object, request_language: str | None) -> str | None:
        candidate = str(request_language or patient_preferred_language or "").strip().lower()
        if not candidate:
            return None
        if candidate == "en_us":
            return "en"
        return candidate

    def _next_version(self, *, patient_id: str, visit_id: str | None, note_type: str) -> int:
        latest = self.note_repo.find_latest(patient_id=patient_id, visit_id=visit_id, note_type=note_type)
        if not latest:
            return 1
        return int(latest.get("version", 1)) + 1
