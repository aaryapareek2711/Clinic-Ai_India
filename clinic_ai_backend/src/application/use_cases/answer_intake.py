"""Intake answer logging and next-question orchestration."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.core.ai_factory import execute_prompt


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AnswerIntakeUseCase:
    """Append intake answer, update state, and generate next question."""

    def __init__(self) -> None:
        self.db = get_database()

    def log_intake_answer(self, *, visit_id: str, patient_id: str, answer: str) -> dict[str, Any]:
        now = _utc_now()
        session = self.db.intake_logs.find_one({"visit_id": visit_id, "patient_id": patient_id}) or {}
        if not session:
            session = {
                "id": str(uuid4()),
                "visit_id": visit_id,
                "patient_id": patient_id,
                "status": "in_progress",
                "questions_asked": [],
                "pending_question": "Please describe your primary problem.",
                "current_question_count": 0,
                "max_questions": 8,
                "asked_categories": [],
                "created_at": now,
                "updated_at": now,
                "completed_at": None,
            }
            self.db.intake_logs.insert_one(session)

        pending_question = str(session.get("pending_question") or "Please describe your primary problem.")
        current_count = int(session.get("current_question_count", 0) or 0)
        max_questions = int(session.get("max_questions", 8) or 8)
        qa_entry = {
            "question": pending_question,
            "answer": str(answer or "").strip(),
            "timestamp": now.isoformat(),
            "question_number": current_count + 1,
        }
        questions_asked = list(session.get("questions_asked") or [])
        questions_asked.append(qa_entry)

        if current_count + 1 >= max_questions:
            next_question = None
            status = "completed"
            completed_at = now
        else:
            llm_result = execute_prompt(
                scenario="intake",
                messages=[
                    {"role": "system", "content": "Generate only one concise next intake question."},
                    {"role": "user", "content": f"Q/A history: {questions_asked}"},
                ],
                metadata={
                    "visit_id": visit_id,
                    "patient_id": patient_id,
                    "agent_name": "intake_question_agent",
                },
            )
            generated_text = str(llm_result.get("response_text") or "").strip()
            next_question = generated_text.splitlines()[0].strip() if generated_text else "Any associated symptoms?"
            status = "in_progress"
            completed_at = None

        self.db.intake_logs.update_one(
            {"visit_id": visit_id, "patient_id": patient_id},
            {
                "$set": {
                    "status": status,
                    "questions_asked": questions_asked,
                    "pending_question": next_question,
                    "current_question_count": current_count + 1,
                    "updated_at": now,
                    "completed_at": completed_at,
                }
            },
            upsert=True,
        )

        updated = self.db.intake_logs.find_one({"visit_id": visit_id, "patient_id": patient_id}) or {}
        updated.pop("_id", None)
        return updated

    def get_status(self, *, visit_id: str, patient_id: str) -> dict[str, Any]:
        session = self.db.intake_logs.find_one({"visit_id": visit_id, "patient_id": patient_id}) or {}
        if session:
            session.pop("_id", None)
        return session
