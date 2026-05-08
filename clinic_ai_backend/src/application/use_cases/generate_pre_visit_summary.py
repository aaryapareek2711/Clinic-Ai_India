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
        try:
            ai_summary = self.openai.generate_pre_visit_summary(language=language, intake_answers=answers)
            if isinstance(ai_summary, dict):
                summary = ai_summary
        except Exception:
            pass

        # Ensure our custom field survives AI regeneration.
        if isinstance(summary, dict):
            summary["additional_doctor_note"] = existing_note

        now = datetime.now(timezone.utc)
        # When doctor generates pre-visit summary, we treat intake as completed for display/workflow.
        intake_status_update = {
            "intake_session.status": "completed",
            "intake_session.pending_question": None,
            "intake_session.pending_topic": "doctor_generated_pre_visit",
            "intake_session.updated_at": now,
        }
        doc = {
            "patient_id": patient_id,
            "visit_id": visit_id,
            "intake_session_id": str(session.get("visit_id") or visit_id),
            "language": language,
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
