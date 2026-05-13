"""Generate India clinical note use case."""
from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone
import re
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.adapters.db.mongo.repositories.audio_repository import AudioRepository
from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.core.config import get_settings


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


_STRUCTURED_DIALOGUE_KEYS = frozenset({"Doctor", "Patient", "Family Member", "Unknown"})


def _sanitize_structured_dialogue_for_context(raw: object) -> list[dict[str, str]] | None:
    """Normalize visit transcription_session.structured_dialogue for LLM context."""
    if not isinstance(raw, list) or not raw:
        return None
    out: list[dict[str, str]] = []
    for turn in raw:
        if not isinstance(turn, dict):
            continue
        for key in _STRUCTURED_DIALOGUE_KEYS:
            if key not in turn:
                continue
            text = str(turn.get(key) or "").strip()
            if text:
                out.append({key: text})
            break
    return out or None


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
        follow_up_date: date | None = None,
        follow_up_time: str | None = None,
        template_id: str | None = None,
    ) -> dict:
        """Generate India note and save as canonical default artifact."""
        job = self._resolve_transcription_job(
            patient_id=patient_id,
            visit_id=visit_id,
            transcription_job_id=transcription_job_id,
        )
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
        template_content = self._load_template_content(template_id)
        if template_content:
            context["selected_template"] = template_content
        if follow_up_date is not None:
            context["staff_confirmed_follow_up_date"] = follow_up_date.isoformat()
        if follow_up_time:
            context["staff_confirmed_follow_up_time"] = str(follow_up_time).strip()
        payload = self._generate_payload(context)
        if template_content:
            payload = self._apply_template(payload, template_content)
        payload = self._apply_previsit_intake_context(payload=payload, context=context)
        if follow_up_date is not None:
            payload["follow_up_date"] = follow_up_date.isoformat()
            payload["follow_up_in"] = None
        if follow_up_time:
            payload["follow_up_time"] = str(follow_up_time).strip()
            payload = self._normalize_payload(payload, context=context)
        version = self._next_version(patient_id=patient_id, visit_id=visit_id, note_type="india_clinical")
        template_key = str(template_id or "").strip() or None
        template_included_snapshot = (
            list(template_content.get("included_sections") or []) if isinstance(template_content, dict) else []
        )
        template_detail_snapshot = (
            dict(template_content.get("section_detail_level") or {}) if isinstance(template_content, dict) else {}
        )
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
            # Reproducibility metadata (template choices at generation time).
            "template_id_used": template_key,
            "included_sections_snapshot": template_included_snapshot,
            "section_detail_level_snapshot": template_detail_snapshot,
        }
        created = self.note_repo.create_note(note_doc)
        created.pop("_id", None)
        return created

    def _load_template_content(self, template_id: str | None) -> dict | None:
        template_key = str(template_id or "").strip()
        if not template_key:
            return None
        doc = self.db.templates.find_one({"id": template_key, "is_active": {"$ne": False}})
        if not doc:
            return None
        content = doc.get("content")
        if not isinstance(content, dict):
            return None
        # Legacy / blueprint payloads may store narrative under SOAP "subjective" only.
        merged = dict(content)
        dn = str(merged.get("doctor_notes") or "").strip()
        subj = str(merged.get("subjective") or "").strip()
        if not dn and subj:
            merged["doctor_notes"] = subj
        return merged

    @staticmethod
    def _apply_template(payload: dict, template: dict) -> dict:
        """
        Apply template behavior.

        - Backward compatible: if template doesn't specify included_sections, use legacy fallback merging.
        - Strict mode: when included_sections is provided, filter payload to exactly those sections and only
          fill missing selected sections from template starters.
        """
        tpl = template if isinstance(template, dict) else {}
        included_sections = tpl.get("included_sections")
        if isinstance(included_sections, list) and len(included_sections) > 0:
            return GenerateIndiaClinicalNoteUseCase._apply_template_strict(payload, tpl)
        return GenerateIndiaClinicalNoteUseCase._apply_template_defaults(payload, tpl)

    @staticmethod
    def _apply_template_strict(payload: dict, template: dict) -> dict:
        out = deepcopy(payload) if isinstance(payload, dict) else {}
        tpl = template if isinstance(template, dict) else {}
        selected = {str(s).strip() for s in (tpl.get("included_sections") or []) if str(s).strip()}

        def _first_text(*vals: object) -> str | None:
            for v in vals:
                s = str(v or "").strip()
                if s:
                    return s
            return None

        def _is_non_empty_list(value: object) -> bool:
            return isinstance(value, list) and len(value) > 0

        # Clear unselected sections first (strict).
        # NOTE: follow-up fields must remain valid for IndiaClinicalNotePayload: exactly one of follow_up_in/date.
        if "chief_complaint" not in selected:
            out["chief_complaint"] = None
        if "assessment" not in selected:
            # Schema requires string; use empty string to avoid response validation failures.
            out["assessment"] = ""
        if "plan" not in selected:
            out["plan"] = ""
        if "doctor_notes" not in selected:
            out["doctor_notes"] = None
        if "rx" not in selected:
            out["rx"] = []
        if "investigations" not in selected:
            out["investigations"] = []
        if "red_flags" not in selected:
            out["red_flags"] = []
        if "data_gaps" not in selected:
            out["data_gaps"] = []

        # Optional preferences (template UI hint textarea) are described as feeding doctor_notes.
        # When the doctor_notes section is removed from included_sections, strict mode would otherwise
        # clear LLM doctor_notes entirely while rx/plan still reflect the template — surface prefs here.
        if "doctor_notes" not in selected:
            prefs_only = _first_text(tpl.get("optional_preferences"))
            if prefs_only:
                out["doctor_notes"] = prefs_only

        # Fill missing selected sections from template starters (only for selected fields).
        if "chief_complaint" in selected and not str(out.get("chief_complaint") or "").strip():
            out["chief_complaint"] = _first_text(tpl.get("chief_complaint"))
        if "assessment" in selected and not str(out.get("assessment") or "").strip():
            if _first_text(tpl.get("assessment")):
                out["assessment"] = _first_text(tpl.get("assessment"))
        if "plan" in selected and not str(out.get("plan") or "").strip():
            if _first_text(tpl.get("plan")):
                out["plan"] = _first_text(tpl.get("plan"))
        if "doctor_notes" in selected:
            # If template includes doctor notes, treat it as authoritative starter text.
            # Fallback to generated note text only when template doctor_notes is empty.
            template_note = _first_text(tpl.get("doctor_notes"), tpl.get("subjective"))
            template_preferences = _first_text(tpl.get("optional_preferences"))
            if template_note:
                out["doctor_notes"] = template_note
            elif template_preferences:
                out["doctor_notes"] = template_preferences
            elif not str(out.get("doctor_notes") or "").strip():
                out["doctor_notes"] = None

        if "rx" in selected:
            # Prefer explicit template medications when provided.
            template_rx = list(tpl.get("rx") or [])
            if len(template_rx) > 0:
                out["rx"] = template_rx
            elif not isinstance(out.get("rx"), list):
                out["rx"] = []
        if "investigations" in selected and (not isinstance(out.get("investigations"), list) or len(out.get("investigations") or []) == 0):
            out["investigations"] = list(tpl.get("investigations") or [])
        if "red_flags" in selected and (not isinstance(out.get("red_flags"), list) or len(out.get("red_flags") or []) == 0):
            out["red_flags"] = list(tpl.get("red_flags") or [])
        if "data_gaps" in selected and (not isinstance(out.get("data_gaps"), list) or len(out.get("data_gaps") or []) == 0):
            out["data_gaps"] = list(tpl.get("data_gaps") or [])

        # Follow-up: keep payload valid even if not selected (API schema requires one selector).
        has_follow_up_in = bool(str(out.get("follow_up_in") or "").strip())
        has_follow_up_date = bool(str(out.get("follow_up_date") or "").strip())
        if not has_follow_up_in and not has_follow_up_date:
            tpl_follow_in = _first_text(tpl.get("follow_up_in"))
            tpl_follow_date = _first_text(tpl.get("follow_up_date"))
            if tpl_follow_date:
                out["follow_up_date"] = tpl_follow_date
                out["follow_up_in"] = None
            elif tpl_follow_in:
                out["follow_up_in"] = tpl_follow_in
                out["follow_up_date"] = None
            else:
                out["follow_up_in"] = "7 days"
                out["follow_up_date"] = None

        # Ensure unselected rx/doctor_notes never auto-filled later by template defaults.
        return out

    @staticmethod
    def _apply_template_defaults(payload: dict, template: dict) -> dict:
        out = deepcopy(payload) if isinstance(payload, dict) else {}
        tpl = template if isinstance(template, dict) else {}

        def _first_text(*vals: object) -> str | None:
            for v in vals:
                s = str(v or "").strip()
                if s:
                    return s
            return None

        for key in ("assessment", "plan", "chief_complaint"):
            if not str(out.get(key) or "").strip():
                if _first_text(tpl.get(key)):
                    out[key] = _first_text(tpl.get(key))

        template_note = _first_text(tpl.get("doctor_notes"), tpl.get("subjective"))
        template_preferences = _first_text(tpl.get("optional_preferences"))
        if template_note:
            out["doctor_notes"] = template_note
        elif template_preferences:
            out["doctor_notes"] = template_preferences
        elif not str(out.get("doctor_notes") or "").strip():
            out["doctor_notes"] = None

        template_rx = list(tpl.get("rx") or [])
        if len(template_rx) > 0:
            out["rx"] = template_rx
        elif not isinstance(out.get("rx"), list):
            out["rx"] = []
        if not isinstance(out.get("investigations"), list) or len(out.get("investigations") or []) == 0:
            out["investigations"] = list(tpl.get("investigations") or [])
        if not isinstance(out.get("red_flags"), list) or len(out.get("red_flags") or []) == 0:
            out["red_flags"] = list(tpl.get("red_flags") or [])

        has_follow_up_in = bool(str(out.get("follow_up_in") or "").strip())
        has_follow_up_date = bool(str(out.get("follow_up_date") or "").strip())
        if not has_follow_up_in and not has_follow_up_date:
            tpl_follow_in = _first_text(tpl.get("follow_up_in"))
            tpl_follow_date = _first_text(tpl.get("follow_up_date"))
            if tpl_follow_date:
                out["follow_up_date"] = tpl_follow_date
                out["follow_up_in"] = None
            elif tpl_follow_in:
                out["follow_up_in"] = tpl_follow_in
                out["follow_up_date"] = None

        if not str(out.get("follow_up_time") or "").strip():
            out["follow_up_time"] = _first_text(tpl.get("follow_up_time"))

        merged_data_gaps: list[str] = []
        for item in [*(out.get("data_gaps") or []), *(tpl.get("data_gaps") or [])]:
            s = str(item or "").strip()
            if s and s not in merged_data_gaps:
                merged_data_gaps.append(s)
        out["data_gaps"] = merged_data_gaps

        return out

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
                    session_job_id = str(session.get("job_id") or "").strip()
                    if session_job_id:
                        job = {
                            "job_id": session_job_id,
                            "patient_id": patient_id,
                            "visit_id": visit_id,
                            "status": "completed",
                            "_session_transcript": str(session.get("transcript") or ""),
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
                    if session_job_id:
                        job = {
                            "job_id": session_job_id,
                            "patient_id": patient_id,
                            "visit_id": visit_id,
                            "status": "completed",
                            "_session_transcript": str(session.get("transcript") or ""),
                        }
        if not job:
            raise ValueError("No completed transcription job found")
        if str(job.get("patient_id")) != patient_id:
            raise ValueError("Transcription job does not belong to patient")
        if visit_id and str(job.get("visit_id") or "") != str(visit_id):
            raise ValueError("Transcription job does not belong to this visit")
        if job.get("status") != "completed":
            raise ValueError("Transcription job must be completed before note generation")
        return job

    def _resolve_additional_doctor_note(
        self,
        *,
        patient_id: str,
        visit_id: str | None,
        previsit: dict,
    ) -> str:
        """Free-text doctor note from pre-visit (embedded visit doc, then legacy collection)."""
        sec = previsit.get("sections") if isinstance(previsit.get("sections"), dict) else {}
        raw = sec.get("additional_doctor_note")
        text = self._clean_context_text(raw)
        if text:
            return str(raw).strip()
        if not visit_id:
            return ""
        doc = self.db.pre_visit_summaries.find_one(
            {"patient_id": patient_id, "visit_id": visit_id},
            sort=[("updated_at", -1)],
        )
        if not doc:
            return ""
        leg = doc.get("sections") if isinstance(doc.get("sections"), dict) else {}
        raw = leg.get("additional_doctor_note")
        text = self._clean_context_text(raw)
        return str(raw).strip() if text else ""

    def _build_context(self, *, patient_id: str, visit_id: str | None, job: dict) -> dict:
        transcript = self.audio_repo.get_result(str(job.get("job_id"))) or {}
        if not transcript and str(job.get("_session_transcript") or "").strip():
            transcript = {"full_transcript_text": str(job.get("_session_transcript") or "")}
        effective_visit = visit_id or job.get("visit_id")
        if effective_visit:
            visit = self.db.visits.find_one(
                {"$or": [{"visit_id": effective_visit}, {"id": effective_visit}], "patient_id": patient_id},
                {"_id": 0, "pre_visit_summary": 1, "intake_session": 1, "vitals": 1, "transcription_session": 1},
            ) or {}
            previsit = dict(visit.get("pre_visit_summary") or {})
            intake = dict(visit.get("intake_session") or {})
            vitals = dict(visit.get("vitals") or {})
        else:
            visit = self.db.visits.find_one(
                {"patient_id": patient_id},
                {"_id": 0, "pre_visit_summary": 1, "intake_session": 1, "vitals": 1, "transcription_session": 1},
                sort=[("updated_at", -1)],
            ) or {}
            previsit = dict(visit.get("pre_visit_summary") or {})
            intake = dict(visit.get("intake_session") or {})
            vitals = dict(visit.get("vitals") or {})
        session = dict(visit.get("transcription_session") or {})
        structured_dialogue = _sanitize_structured_dialogue_for_context(session.get("structured_dialogue"))
        patient = self.db.patients.find_one({"patient_id": patient_id}) or {}

        eff_vid = str(visit_id or job.get("visit_id") or previsit.get("visit_id") or "").strip() or None
        previsit_sections = previsit.get("sections") if isinstance(previsit.get("sections"), dict) else {}
        previsit_sections = dict(previsit_sections)
        additional_dr = self._resolve_additional_doctor_note(
            patient_id=patient_id,
            visit_id=eff_vid,
            previsit=previsit,
        )
        if additional_dr and not self._clean_context_text(previsit_sections.get("additional_doctor_note")):
            previsit_sections["additional_doctor_note"] = additional_dr

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

        ctx: dict = {
            "patient_id": patient_id,
            "visit_id": visit_id or job.get("visit_id"),
            "transcription_job_id": job.get("job_id"),
            "transcript_text": transcript.get("full_transcript_text", ""),
            "transcript_segments": transcript.get("segments", []),
            # Prominent copy for the LLM + merge logic (must match previsit_sections when resolved from legacy).
            "previsit_additional_doctor_note": additional_dr or "",
            "previsit_sections": previsit_sections,
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
        if structured_dialogue:
            ctx["structured_dialogue"] = structured_dialogue
        return ctx

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

    @staticmethod
    def _clean_context_text(value: object) -> str:
        text = str(value or "").strip()
        if not text:
            return ""
        lowered = text.lower()
        if lowered in {"not provided", "n/a", "na", "none", "null", "unknown"}:
            return ""
        return text

    @classmethod
    def _extract_previsit_intake_hints(cls, *, context: dict) -> dict:
        sections = context.get("previsit_sections") if isinstance(context.get("previsit_sections"), dict) else {}
        intake_answers = context.get("intake_answers") if isinstance(context.get("intake_answers"), list) else []

        chief = sections.get("chief_complaint") if isinstance(sections.get("chief_complaint"), dict) else {}
        hpi = sections.get("hpi") if isinstance(sections.get("hpi"), dict) else {}
        meds = (
            sections.get("current_medication")
            if isinstance(sections.get("current_medication"), dict)
            else {}
        )
        pmh = (
            sections.get("past_medical_history_allergies")
            if isinstance(sections.get("past_medical_history_allergies"), dict)
            else {}
        )

        reason_for_visit = cls._clean_context_text(chief.get("reason_for_visit"))
        onset = cls._clean_context_text(chief.get("symptom_duration_or_onset"))
        severity = cls._clean_context_text(hpi.get("symptom_severity_or_progression"))
        impact = cls._clean_context_text(hpi.get("impact_on_daily_life"))
        meds_text = cls._clean_context_text(meds.get("medications_or_home_remedies"))
        past_history = cls._clean_context_text(pmh.get("past_medical_history"))
        allergies = cls._clean_context_text(pmh.get("allergies"))
        additional_doctor_note = cls._clean_context_text(sections.get("additional_doctor_note"))
        if not additional_doctor_note:
            additional_doctor_note = cls._clean_context_text(context.get("previsit_additional_doctor_note"))

        associated_symptoms_raw = hpi.get("associated_symptoms") if isinstance(hpi.get("associated_symptoms"), list) else []
        associated_symptoms = [cls._clean_context_text(x) for x in associated_symptoms_raw]
        associated_symptoms = [x for x in associated_symptoms if x]

        previsit_red_flags_raw = sections.get("red_flag_indicators") if isinstance(sections.get("red_flag_indicators"), list) else []
        previsit_red_flags = [cls._clean_context_text(x) for x in previsit_red_flags_raw]
        previsit_red_flags = [x for x in previsit_red_flags if x]

        intake_topic_values: dict[str, list[str]] = {}
        for item in intake_answers:
            if not isinstance(item, dict):
                continue
            topic = str(item.get("topic") or "").strip().lower()
            answer = cls._clean_context_text(item.get("answer"))
            if not topic or not answer:
                continue
            intake_topic_values.setdefault(topic, [])
            if answer not in intake_topic_values[topic]:
                intake_topic_values[topic].append(answer)

        if not reason_for_visit:
            reason_for_visit = (intake_topic_values.get("reason_for_visit") or [""])[0]
        if not onset:
            onset = (intake_topic_values.get("onset_duration") or [""])[0]
        if not severity:
            severity = (intake_topic_values.get("severity_progression") or [""])[0]
        if not impact:
            impact = (intake_topic_values.get("impact_daily_life") or [""])[0]
        if not meds_text:
            meds_text = (intake_topic_values.get("current_medications") or [""])[0]
        if not past_history:
            past_history = (intake_topic_values.get("past_medical_history") or [""])[0]
        if not allergies:
            allergies = (intake_topic_values.get("allergies") or [""])[0]
        if not associated_symptoms:
            associated_symptoms = intake_topic_values.get("associated_symptoms") or []

        intake_red_flags = intake_topic_values.get("red_flag_check") or []
        red_flags = []
        for value in [*previsit_red_flags, *intake_red_flags]:
            if value and value not in red_flags:
                red_flags.append(value)

        return {
            "reason_for_visit": reason_for_visit,
            "onset": onset,
            "associated_symptoms": associated_symptoms,
            "severity": severity,
            "impact": impact,
            "meds_text": meds_text,
            "past_history": past_history,
            "allergies": allergies,
            "additional_doctor_note": additional_doctor_note,
            "red_flags": red_flags,
        }

    @classmethod
    def _apply_previsit_intake_context(cls, *, payload: dict, context: dict) -> dict:
        out = deepcopy(payload) if isinstance(payload, dict) else {}
        hints = cls._extract_previsit_intake_hints(context=context)

        if not cls._clean_context_text(out.get("chief_complaint")) and hints["reason_for_visit"]:
            out["chief_complaint"] = hints["reason_for_visit"]

        merged_red_flags: list[str] = [str(x).strip() for x in (out.get("red_flags") or []) if str(x).strip()]
        for rf in hints["red_flags"]:
            if rf not in merged_red_flags:
                merged_red_flags.append(rf)
        out["red_flags"] = merged_red_flags

        note_lines: list[str] = []
        if hints["additional_doctor_note"]:
            note_lines.append(f"Pre-visit doctor note: {hints['additional_doctor_note']}")
        if hints["meds_text"]:
            note_lines.append(f"Current medications/home remedies: {hints['meds_text']}")
        if hints["past_history"]:
            note_lines.append(f"Past medical history: {hints['past_history']}")
        if hints["allergies"]:
            note_lines.append(f"Allergies: {hints['allergies']}")
        if hints["impact"]:
            note_lines.append(f"Functional impact: {hints['impact']}")

        if note_lines:
            existing = cls._clean_context_text(out.get("doctor_notes"))
            merged_notes = [existing] if existing else []
            for line in note_lines:
                if not any(line.lower() in x.lower() for x in merged_notes):
                    merged_notes.append(line)
            out["doctor_notes"] = "\n".join(merged_notes) if merged_notes else None

        assessment_prefix_parts: list[str] = []
        if hints["onset"]:
            assessment_prefix_parts.append(f"Onset/duration: {hints['onset']}")
        if hints["associated_symptoms"]:
            assessment_prefix_parts.append(
                f"Associated symptoms: {', '.join(hints['associated_symptoms'][:4])}"
            )
        if hints["severity"]:
            assessment_prefix_parts.append(f"Severity/progression: {hints['severity']}")
        if assessment_prefix_parts:
            existing_assessment = str(out.get("assessment") or "").strip()
            prefix_text = " | ".join(assessment_prefix_parts)
            if prefix_text and prefix_text.lower() not in existing_assessment.lower():
                out["assessment"] = (
                    f"{existing_assessment} {prefix_text}".strip()
                    if existing_assessment
                    else prefix_text
                )

        return out

    def _normalize_payload(self, generated: dict, *, context: dict) -> dict:
        payload = deepcopy(generated) if isinstance(generated, dict) else {}
        payload.setdefault("assessment", "Clinical assessment pending detailed review.")
        payload.setdefault("plan", "Correlate with examination findings and proceed with OPD management.")
        payload.setdefault("rx", [])
        payload.setdefault("investigations", [])
        payload.setdefault("red_flags", [])
        payload.setdefault("follow_up_time", None)
        payload.setdefault("doctor_notes", None)
        payload.setdefault("chief_complaint", self._chief_complaint(context=context))

        normalized_rx = []
        for item in payload.get("rx") or []:
            if not isinstance(item, dict):
                continue
            normalized_rx.append(
                {
                    "medicine_name": str(item.get("medicine_name") or "<medicine_name>"),
                    "dose": str(item.get("dose") or "<dose>"),
                    "frequency": str(item.get("frequency") or "<frequency>"),
                    "duration": str(item.get("duration") or "<duration>"),
                    "route": str(item.get("route") or "<route>"),
                    "food_instruction": str(item.get("food_instruction") or "<food_instruction>"),
                    "generic_available": item.get("generic_available") if isinstance(item.get("generic_available"), bool) else None,
                }
            )
        payload["rx"] = normalized_rx

        normalized_investigations = []
        for item in payload.get("investigations") or []:
            if not isinstance(item, dict):
                continue
            urgency = str(item.get("urgency") or "routine").strip().lower()
            if urgency not in {"routine", "urgent", "stat"}:
                urgency = "routine"
            normalized_investigations.append(
                {
                    "test_name": str(item.get("test_name") or "<test_name>"),
                    "urgency": urgency,
                    "preparation_instructions": str(item.get("preparation_instructions") or "") or None,
                    "routing_note": str(item.get("routing_note") or "") or None,
                }
            )
        payload["investigations"] = normalized_investigations

        payload["red_flags"] = [str(x).strip() for x in (payload.get("red_flags") or []) if str(x).strip()]
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
        follow_up_time_raw = str(payload.get("follow_up_time") or "").strip()
        if follow_up_time_raw and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", follow_up_time_raw):
            payload["follow_up_time"] = follow_up_time_raw
        else:
            payload["follow_up_time"] = None
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
            "follow_up_time": None,
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
