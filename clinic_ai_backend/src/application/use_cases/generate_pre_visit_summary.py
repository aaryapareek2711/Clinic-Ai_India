"""Pre-visit summary generation use case."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient


class GeneratePreVisitSummaryUseCase:
    """Generate and persist doctor-facing pre-visit summary."""

    def __init__(self) -> None:
        self.db = get_database()
        self.openai = OpenAIQuestionClient()

    def execute(self, patient_id: str, visit_id: str) -> dict[str, Any]:
        """Create pre-visit summary from the intake session for this visit."""
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}], "patient_id": patient_id},
            {"_id": 0, "intake_session": 1, "pre_visit_summary": 1},
        ) or {}

        # Preserve any doctor-saved note across refresh/regeneration.
        existing_note = (((visit.get("pre_visit_summary") or {}).get("sections") or {}).get("additional_doctor_note"))
        if existing_note is None:
            try:
                legacy_doc = self.db.pre_visit_summaries.find_one(
                    {"patient_id": patient_id, "visit_id": visit_id},
                    sort=[("updated_at", -1)],
                )
                if legacy_doc:
                    existing_note = ((legacy_doc.get("sections") or {}).get("additional_doctor_note"))
            except Exception:
                # Best-effort preservation only.
                existing_note = None
        session = dict(visit.get("intake_session") or {})
        if not session:
            raise ValueError("No intake session found for patient and visit")

        answers = session.get("answers", [])
        if not answers:
            raise ValueError("Intake answers are empty")

        language = session.get("language", "en")
        summary = self._fallback_summary(answers)
        used_ai = False
        try:
            ai_summary = self.openai.generate_pre_visit_summary(language=language, intake_answers=answers)
            if isinstance(ai_summary, dict):
                summary = ai_summary
                used_ai = True
        except Exception:
            pass

        # Ensure our custom field survives AI regeneration.
        if isinstance(summary, dict):
            summary["additional_doctor_note"] = existing_note

        now = datetime.now(timezone.utc)
        recap_rows = GeneratePreVisitSummaryUseCase._recap_rows_from_answers(answers)
        display_recap_by_language: dict[str, Any] | None = None
        display_chief_en: str | None = None
        if used_ai and isinstance(summary, dict):
            cc = summary.get("chief_complaint") or {}
            chief_line = str(cc.get("reason_for_visit") or "").strip()
            if chief_line:
                display_chief_en = chief_line
        lang_key = str(language or "en").strip().lower().replace("_", "-")
        if recap_rows:
            if lang_key in ("", "en", "en-us"):
                display_recap_by_language = {"en": recap_rows}
            else:
                display_recap_by_language = {lang_key: list(recap_rows)}
                try:
                    translated = self.openai.translate_json_payload_for_display(
                        {"recapRows": recap_rows}, target_language="English"
                    )
                    en_rows = translated.get("recapRows") if isinstance(translated, dict) else None
                    if isinstance(en_rows, list) and en_rows:
                        display_recap_by_language["en"] = en_rows
                    else:
                        display_recap_by_language["en"] = list(recap_rows)
                except Exception:
                    display_recap_by_language["en"] = list(recap_rows)

        # When doctor generates pre-visit summary, we treat intake as completed for display/workflow.
        intake_status_update = {
            "intake_session.status": "completed",
            "intake_session.pending_question": None,
            "intake_session.pending_topic": "doctor_generated_pre_visit",
            "intake_session.updated_at": now,
        }
        if display_recap_by_language is not None:
            intake_status_update["intake_session.display_recap_by_language"] = display_recap_by_language
        if display_chief_en:
            intake_status_update["intake_session.display_chief_en"] = display_chief_en
        doc = {
            "patient_id": patient_id,
            "visit_id": visit_id,
            "intake_session_id": str(session.get("visit_id") or visit_id),
            "language": language,
            # Doctor-facing body is English when the model ran; UI can skip on-load translation.
            "summary_display_language": ("en" if used_ai else None),
            # Once we generate the pre-visit summary successfully, show it as completed
            # in the UI (VisitIntakeCanvas displays this field as "Intake status").
            "status": "completed",
            "sections": summary,
            "updated_at": now,
        }
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "pre_visit_summary": doc,
                    **intake_status_update,
                    # Move workflow forward: pre-visit summary done -> pre-visit stage.
                    "status": "in_queue",
                    "previous_workflow_stage": "intake",
                    "current_workflow_stage": "pre_visit",
                    "next_workflow_stage": "vitals",
                    "updated_at": now,
                }
            },
        )
        # Best-effort: keep the standalone intake_sessions collection consistent too.
        try:
            self.db.intake_sessions.update_one(
                {"visit_id": visit_id, "patient_id": patient_id},
                {
                    "$set": {
                        "status": "completed",
                        "pending_question": None,
                        "pending_topic": "doctor_generated_pre_visit",
                        "updated_at": now,
                    }
                },
            )
        except Exception:
            # Embedded snapshot is the primary source for the visit page.
            pass
        return doc

    @staticmethod
    def _recap_rows_from_answers(answers: list[Any]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        for item in answers:
            if not isinstance(item, dict):
                continue
            q = str(item.get("question") or "").strip()
            a = str(item.get("answer") or "").strip()
            if not a:
                continue
            rows.append({"question": q, "answer": a})
        return rows

    @staticmethod
    def _fallback_summary(answers: list[dict[str, Any]]) -> dict[str, Any]:
        """Build safe fallback summary without model dependency."""
        illness = "Not provided"
        associated = []
        severity = "Not provided"
        impact = "Not provided"
        meds = "Not provided"
        history = "Not provided"
        allergies = "Not provided"
        red_flags: list[str] = []

        for item in answers:
            q = str(item.get("question", "")).lower()
            a = str(item.get("answer", "")).strip()
            if not a:
                continue
            if q == "illness":
                illness = a
            if any(k in q for k in ["pain", "discomfort", "symptom", "issue"]):
                associated.append(a)
            if any(k in q for k in ["worse", "constant", "on and off", "severity"]):
                severity = a
            if any(k in q for k in ["daily", "routine", "work", "sleep"]):
                impact = a
            if any(k in q for k in ["medicine", "medicines", "home remed"]):
                meds = a
            if any(k in q for k in ["history", "past", "condition", "surgery"]):
                history = a
            if "allerg" in q:
                allergies = a
            if any(k in a.lower() for k in ["breath", "bleed", "confusion", "chest pain", "high fever"]):
                red_flags.append(a)

        return {
            "chief_complaint": {
                "reason_for_visit": illness,
                "symptom_duration_or_onset": "Not provided",
            },
            "hpi": {
                "associated_symptoms": associated or ["Not provided"],
                "symptom_severity_or_progression": severity,
                "impact_on_daily_life": impact,
            },
            "current_medication": {
                "medications_or_home_remedies": meds,
            },
            "past_medical_history_allergies": {
                "past_medical_history": history,
                "allergies": allergies,
            },
            "red_flag_indicators": red_flags or ["No explicit red flags reported"],
        }
