"""Intake chat orchestration service module."""
from __future__ import annotations

from datetime import datetime, timezone

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.adapters.external.whatsapp.meta_whatsapp_client import MetaWhatsAppClient
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase
from src.core.config import get_settings


STOP_WORDS = {"stop", "enough", "exit", "quit", "band", "rok do", "bas"}


class IntakeChatService:
    """Coordinates intake question flow on WhatsApp."""

    def __init__(self) -> None:
        self.db = get_database()
        self.whatsapp = MetaWhatsAppClient()
        self.openai = OpenAIQuestionClient()

    def start_intake(self, patient_id: str, to_number: str, language: str) -> None:
        """Start intake with one-time greeting and first illness question."""
        normalized_to_number = self._normalize_phone_number(to_number)
        greeting = (
            "Hello! Welcome to Clinic AI India. "
            if language == "en"
            else "Namaste! Clinic AI India mein aapka swagat hai. "
        )
        first_question = (
            "Please describe your main health problem in a few words."
            if language == "en"
            else "Kripya apni mukhya swasthya samasya kuch shabdon mein batayen."
        )

        self.db.intake_sessions.update_one(
            {"patient_id": patient_id},
            {
                "$set": {
                    "patient_id": patient_id,
                    "to_number": normalized_to_number,
                    "language": language,
                    "status": "awaiting_illness",
                    "greeting_sent": True,
                    "illness": None,
                    "questions": [],
                    "current_index": 0,
                    "answers": [],
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
        settings = get_settings()
        if settings.whatsapp_intake_template_name:
            language_code = (
                settings.whatsapp_intake_template_lang_hi
                if language == "hi"
                else settings.whatsapp_intake_template_lang_en
            )
            # Send first business-initiated message as approved template for better reliability.
            self.whatsapp.send_template(
                to_number=normalized_to_number,
                template_name=settings.whatsapp_intake_template_name,
                language_code=language_code,
                body_values=[first_question],
            )
        else:
            self.whatsapp.send_text(normalized_to_number, greeting + first_question)

    def handle_patient_reply(self, from_number: str, message_text: str) -> None:
        """Handle incoming WhatsApp reply and continue intake."""
        normalized_from = self._normalize_phone_number(from_number)
        session = self.db.intake_sessions.find_one({"to_number": normalized_from})
        if not session and normalized_from:
            # Backward compatibility for older records saved with + prefix.
            session = self.db.intake_sessions.find_one({"to_number": f"+{normalized_from}"})
        if not session:
            return

        cleaned = (message_text or "").strip()
        if cleaned.lower() in STOP_WORDS:
            self.db.intake_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"status": "stopped", "updated_at": datetime.now(timezone.utc)}},
            )
            end_msg = (
                "Thank you. We will continue with your submitted answers."
                if session.get("language") == "en"
                else "Dhanyavaad. Hum aapke diye gaye jawaabon ke saath aage badhenge."
            )
            self.whatsapp.send_text(from_number, end_msg)
            self._auto_generate_pre_visit_summary(session)
            return

        status = session.get("status")
        if status == "awaiting_illness":
            self._save_illness_and_generate_questions(session, cleaned)
            return

        if status == "in_progress":
            self._save_answer_and_ask_next(session, cleaned)

    def _save_illness_and_generate_questions(self, session: dict, illness_text: str) -> None:
        language = session.get("language", "en")
        questions = self._fallback_questions(language)
        try:
            ai_questions = self.openai.generate_questions(illness_text, language)
            if ai_questions:
                questions = ai_questions
        except Exception:
            pass

        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "illness": illness_text,
                    "questions": questions,
                    "status": "in_progress",
                    "current_index": 0,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$push": {"answers": {"question": "illness", "answer": illness_text}},
            },
        )
        self.whatsapp.send_text(session["to_number"], questions[0])

    def _save_answer_and_ask_next(self, session: dict, answer_text: str) -> None:
        idx = int(session.get("current_index", 0))
        questions = session.get("questions", [])
        if idx >= len(questions):
            return

        current_question = questions[idx]
        new_idx = idx + 1
        next_status = "completed" if new_idx >= len(questions) else "in_progress"

        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$push": {"answers": {"question": current_question, "answer": answer_text}},
                "$set": {
                    "current_index": new_idx,
                    "status": next_status,
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )

        if next_status == "completed":
            done_msg = (
                "Thank you. Your intake is complete."
                if session.get("language") == "en"
                else "Dhanyavaad. Aapka intake poora ho gaya hai."
            )
            self.whatsapp.send_text(session["to_number"], done_msg)
            self._auto_generate_pre_visit_summary(session)
            return

        self.whatsapp.send_text(session["to_number"], questions[new_idx])

    @staticmethod
    def _fallback_questions(language: str) -> list[str]:
        if language == "hi":
            return [
                "Yeh samasya kab se hai?",
                "Dard ya takleef kahan hai?",
                "Lakshan lagataar hain ya beech-beech mein aate hain?",
                "Kya aap abhi koi dawa le rahe hain?",
                "Kya bukhar, ulti, ya saans lene mein dikkat hai?",
            ]
        return [
            "Since when are you facing this issue?",
            "Where exactly is the discomfort or pain?",
            "Are symptoms constant or on and off?",
            "Are you currently taking any medicines?",
            "Any fever, vomiting, or breathing difficulty?",
        ]

    @staticmethod
    def _auto_generate_pre_visit_summary(session: dict) -> None:
        patient_id = str(session.get("patient_id", "")).strip()
        if not patient_id:
            return
        try:
            GeneratePreVisitSummaryUseCase().execute(patient_id=patient_id)
        except Exception:
            # Do not block intake completion on summary generation errors.
            return

    @staticmethod
    def _normalize_phone_number(phone_number: str) -> str:
        """Normalize phone number for reliable matching across webhook/provider formats."""
        return "".join(ch for ch in str(phone_number or "") if ch.isdigit())
