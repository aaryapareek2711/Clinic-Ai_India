"""Intake chat orchestration service module."""
from __future__ import annotations

from datetime import datetime, timezone
from difflib import SequenceMatcher

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.adapters.external.whatsapp.meta_whatsapp_client import MetaWhatsAppClient
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase
from src.core.config import get_settings


STOP_WORDS = {"stop", "enough", "exit", "quit", "band", "rok do", "bas"}
MIN_FOLLOW_UP_QUESTIONS = 3


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
        first_question = self._chief_complaint_question(language)

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
                    "answers": [],
                    "pending_question": None,
                    "pending_topic": None,
                    "question_number": 1,
                    "max_questions": 8,
                    "processed_message_ids": [],
                    "recent_inbound_text": None,
                    "recent_inbound_at": None,
                    "last_outbound_at": None,
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
            body_values = [first_question] if settings.whatsapp_intake_template_param_count > 0 else []
            # Send first business-initiated message as approved template for better reliability.
            self.whatsapp.send_template(
                to_number=normalized_to_number,
                template_name=settings.whatsapp_intake_template_name,
                language_code=language_code,
                body_values=body_values,
            )
        else:
            self.whatsapp.send_text(normalized_to_number, greeting + first_question)

    def handle_patient_reply(self, from_number: str, message_text: str, message_id: str | None = None) -> None:
        """Handle incoming WhatsApp reply and continue intake."""
        normalized_from = self._normalize_phone_number(from_number)
        session = self.db.intake_sessions.find_one(
            {
                "to_number": normalized_from,
                "status": {"$in": ["awaiting_illness", "in_progress"]},
            },
            sort=[("updated_at", -1)],
        )
        if not session and normalized_from:
            # Backward compatibility for older records saved with + prefix.
            session = self.db.intake_sessions.find_one(
                {
                    "to_number": f"+{normalized_from}",
                    "status": {"$in": ["awaiting_illness", "in_progress"]},
                },
                sort=[("updated_at", -1)],
            )
        if not session:
            return

        if message_id and not self._claim_message(session["_id"], message_id):
            return

        cleaned = (message_text or "").strip()
        if not cleaned:
            return
        if self._is_probable_duplicate_reply(session, cleaned):
            return
        self._remember_inbound_text(session["_id"], cleaned)
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
            if self._should_treat_as_illness_correction(session, cleaned):
                self._replace_illness_and_regenerate(session, cleaned)
                return
            self._save_answer_and_ask_next(session, cleaned)

    def _save_illness_and_generate_questions(self, session: dict, illness_text: str) -> None:
        claimed = self.db.intake_sessions.find_one_and_update(
            {"_id": session["_id"], "status": "awaiting_illness"},
            {
                "$set": {
                    "illness": illness_text,
                    "status": "in_progress",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$push": {"answers": {"question": "illness", "answer": illness_text}},
            },
        )
        if not claimed:
            return
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or claimed
        self._generate_and_send_next_turn(refreshed)

    def _save_answer_and_ask_next(self, session: dict, answer_text: str) -> None:
        current_question = str(session.get("pending_question", "") or "").strip()
        if not current_question:
            return
        claimed = self.db.intake_sessions.find_one_and_update(
            {
                "_id": session["_id"],
                "status": "in_progress",
                "pending_question": current_question,
            },
            {
                "$push": {
                    "answers": {
                        "question": current_question,
                        "topic": session.get("pending_topic"),
                        "answer": answer_text,
                    }
                },
                "$set": {
                    "pending_question": None,
                    "pending_topic": None,
                    "status": "in_progress",
                    "updated_at": datetime.now(timezone.utc),
                },
            },
        )
        if not claimed:
            return
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or claimed
        self._generate_and_send_next_turn(refreshed)

    def _replace_illness_and_regenerate(self, session: dict, illness_text: str) -> None:
        answers = list(session.get("answers", []))
        replaced = False
        for answer in answers:
            if answer.get("question") == "illness":
                answer["answer"] = illness_text
                replaced = True
                break
        if not replaced:
            answers.insert(0, {"question": "illness", "answer": illness_text})

        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "illness": illness_text,
                    "answers": answers,
                    "pending_question": None,
                    "pending_topic": None,
                    "question_number": 1,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or session
        self._generate_and_send_next_turn(refreshed)

    def _generate_and_send_next_turn(self, session: dict) -> None:
        language = session.get("language", "en")
        fallback_question = self._fallback_questions(language)[0]
        try:
            if self._has_reached_intake_limit(session):
                closing_message = self._closing_message(language, session.get("patient_name"))
                self._complete_session(session, closing_message, "closing", int(session.get("question_number", 1) or 1))
                return
            patient = self.db.patients.find_one({"patient_id": session.get("patient_id")}) or {}
            context = {
                "patient_name": patient.get("name", ""),
                "patient_age": patient.get("age", ""),
                "gender": patient.get("gender", ""),
                "language": language,
                "question_number": int(session.get("question_number", 1) or 1),
                "max_questions": int(session.get("max_questions", 8) or 8),
                "previous_qa_json": session.get("answers", []),
                "has_travelled_recently": bool(patient.get("travelled_recently", False)),
                "chief_complaint": session.get("illness", ""),
            }
            ai_turn = self.openai.generate_intake_turn(context)
            message = str(ai_turn.get("message", "") or "").strip()
            if not message:
                raise RuntimeError("Empty message in AI turn")
            is_complete = bool(ai_turn.get("is_complete", False))
            topic = str(ai_turn.get("topic", "") or "")
            question_number = int(ai_turn.get("question_number", session.get("question_number", 1)) or 1)
            if topic == "closing":
                is_complete = True

            if self._is_repeated_turn(session, message, topic):
                recovery_question = self._build_recovery_question(language, topic, session)
                if recovery_question:
                    self._store_and_send_question(
                        session=session,
                        message=recovery_question,
                        topic=topic or str(session.get("pending_topic", "") or "clarification"),
                        question_number=question_number,
                    )
                    return
                fallback_topic = str(topic or session.get("pending_topic") or "clarification")
                self._store_and_send_question(
                    session=session,
                    message=fallback_question,
                    topic=fallback_topic,
                    question_number=question_number,
                )
                return

            if is_complete and self._can_complete_intake(session, ai_turn):
                self._complete_session(session, message, topic, question_number)
                return

            if is_complete:
                recovery_question = self._build_recovery_question(language, topic, session)
                if recovery_question:
                    self._store_and_send_question(
                        session=session,
                        message=recovery_question,
                        topic=topic or "clarification",
                        question_number=question_number,
                    )
                    return

            self._store_and_send_question(
                session=session,
                message=message,
                topic=topic,
                question_number=question_number,
            )
            return
        except Exception:
            pass

        # Safe fallback if model call/parsing fails.
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": fallback_question,
                    "pending_topic": "associated_symptoms",
                    "last_outbound_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        self.whatsapp.send_text(session["to_number"], fallback_question)

    def _store_and_send_question(self, session: dict, message: str, topic: str, question_number: int) -> None:
        now = datetime.now(timezone.utc)
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": message,
                    "pending_topic": topic,
                    "question_number": max(question_number + 1, int(session.get("question_number", 1) or 1) + 1),
                    "last_outbound_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )
        self.whatsapp.send_text(session["to_number"], message)

    def _complete_session(self, session: dict, message: str, topic: str, question_number: int) -> None:
        now = datetime.now(timezone.utc)
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "pending_question": None,
                    "pending_topic": topic,
                    "question_number": question_number,
                    "last_outbound_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )
        self.whatsapp.send_text(session["to_number"], message)
        self._auto_generate_pre_visit_summary(session)

    def _claim_message(self, session_id: object, message_id: str) -> bool:
        result = self.db.intake_sessions.update_one(
            {"_id": session_id, "processed_message_ids": {"$ne": message_id}},
            {"$push": {"processed_message_ids": message_id}},
        )
        return result.modified_count == 1

    def _should_treat_as_illness_correction(self, session: dict, message_text: str) -> bool:
        illness = str(session.get("illness", "") or "").strip()
        pending_question = str(session.get("pending_question", "") or "").strip()
        if not illness or not pending_question:
            return False

        follow_up_answers = [a for a in session.get("answers", []) if a.get("question") != "illness"]
        if follow_up_answers:
            return False

        last_outbound_at = self._parse_datetime(session.get("last_outbound_at"))
        if not last_outbound_at:
            return False

        seconds_since_question = (datetime.now(timezone.utc) - last_outbound_at).total_seconds()
        if seconds_since_question > 15:
            return False

        normalized_new = self._normalize_for_similarity(message_text)
        normalized_old = self._normalize_for_similarity(illness)
        if not normalized_new or not normalized_old:
            return False

        if normalized_new == normalized_old:
            return True

        similarity = SequenceMatcher(a=normalized_new, b=normalized_old).ratio()
        return similarity >= 0.6

    def _is_repeated_turn(self, session: dict, message: str, topic: str) -> bool:
        normalized_message = self._normalize_for_similarity(message)
        if not normalized_message:
            return False

        previous_questions = [
            self._normalize_for_similarity(answer.get("question", ""))
            for answer in session.get("answers", [])
            if answer.get("question") != "illness"
        ]
        if normalized_message in previous_questions:
            return True

        if topic:
            topic_count = sum(1 for answer in session.get("answers", []) if answer.get("topic") == topic)
            if topic_count >= 1:
                return True
        return False

    def _has_reached_intake_limit(self, session: dict) -> bool:
        max_questions = int(session.get("max_questions", 8) or 8)
        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        return asked_questions >= max_questions

    def _can_complete_intake(self, session: dict, ai_turn: dict) -> bool:
        if str(ai_turn.get("topic", "") or "") == "safety_interrupt":
            return True

        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        if asked_questions < MIN_FOLLOW_UP_QUESTIONS:
            return False

        extracted_facts = (ai_turn.get("agent2") or {}).get("extracted_facts") or {}
        substantive_fact_count = sum(
            1
            for value in extracted_facts.values()
            if value not in (None, "", "null")
        )
        if substantive_fact_count < 2:
            return False

        information_gaps = (ai_turn.get("agent2") or {}).get("information_gaps") or []
        return len(information_gaps) == 0

    def _build_recovery_question(self, language: str, topic: str, session: dict) -> str:
        topic_key = str(topic or session.get("pending_topic") or "").strip()
        if language == "hi":
            recovery_questions = {
                "onset_duration": "यह समस्या कब शुरू हुई थी, और क्या यह लगातार रहती है या बीच-बीच में होती है?",
                "severity_progression": "समय के साथ यह समस्या कैसी बदल रही है - बेहतर, बदतर, या लगभग वैसी ही?",
                "associated_symptoms": "इस समस्या के साथ और कौन से लक्षण हो रहे हैं? कृपया थोड़ा विस्तार से बताइए।",
                "red_flag_check": "क्या कोई गंभीर लक्षण हुए हैं, जैसे तेज दर्द, सांस की दिक्कत, बेहोशी, या खून आना?",
                "current_medications": "अभी आप कौन-कौन सी दवाएं, सप्लीमेंट, या घरेलू इलाज ले रहे हैं?",
                "impact_daily_life": "यह समस्या आपकी रोज़मर्रा की ज़िंदगी पर कैसे असर डाल रही है - जैसे नींद, खाना, काम या चलना-फिरना?",
                "treatment_history": "अब तक आपने इसके लिए क्या इलाज कराया है? कृपया थोड़ा विस्तार से बताइए।",
                "recurrence_status": "क्या यह पुरानी समस्या दोबारा हुई है, या पहले से चली आ रही बीमारी का फॉलो-अप है?",
            }
        else:
            recovery_questions = {
                "onset_duration": "When did this problem first start, and has it been constant or on and off since then?",
                "severity_progression": "How has this problem been changing over time - better, worse, or about the same?",
                "associated_symptoms": "What other symptoms have you noticed along with this? Please describe them a little.",
                "red_flag_check": "Have you had any serious warning symptoms such as severe pain, breathing trouble, fainting, or bleeding?",
                "current_medications": "What medicines, supplements, or home remedies are you taking right now for this?",
                "impact_daily_life": "How is this affecting your daily routine - like sleep, eating, work, or movement?",
                "treatment_history": "What treatment have you already received for this? Please share a bit more detail.",
                "recurrence_status": "Is this a recurrence of an older problem, or a follow-up for an existing diagnosis?",
            }
        return recovery_questions.get(topic_key, "")

    def _is_probable_duplicate_reply(self, session: dict, message_text: str) -> bool:
        recent_text = str(session.get("recent_inbound_text", "") or "").strip()
        recent_at = self._parse_datetime(session.get("recent_inbound_at"))
        if not recent_text or not recent_at:
            return False
        if self._normalize_for_similarity(recent_text) != self._normalize_for_similarity(message_text):
            return False
        return (datetime.now(timezone.utc) - recent_at).total_seconds() <= 12

    def _remember_inbound_text(self, session_id: object, message_text: str) -> None:
        self.db.intake_sessions.update_one(
            {"_id": session_id},
            {
                "$set": {
                    "recent_inbound_text": message_text,
                    "recent_inbound_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    @staticmethod
    def _closing_message(language: str, patient_name: str | None) -> str:
        name = str(patient_name or "").strip()
        if language == "hi":
            if name:
                return (
                    f"धन्यवाद {name}, हमें सारी ज़रूरी जानकारी मिल गई है। "
                    "आपके डॉक्टर पूरी तरह तैयार रहेंगे। कृपया समय पर पहुँचें। जल्द मिलेंगे।"
                )
            return (
                "धन्यवाद, हमें सारी ज़रूरी जानकारी मिल गई है। "
                "आपके डॉक्टर पूरी तरह तैयार रहेंगे। कृपया समय पर पहुँचें। जल्द मिलेंगे।"
            )
        if name:
            return (
                f"Thank you {name}, we have everything we need. "
                "Your doctor will be fully prepared for your visit. Please arrive on time. See you soon."
            )
        return (
            "Thank you, we have everything we need. "
            "Your doctor will be fully prepared for your visit. Please arrive on time. See you soon."
        )

    @staticmethod
    def _normalize_for_similarity(text: str) -> str:
        return "".join(ch.lower() for ch in str(text or "") if ch.isalnum())

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

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

    @staticmethod
    def _chief_complaint_question(language: str) -> str:
        """Return the question that asks for patient's primary problem."""
        return (
            "Please describe your main health problem in a few words."
            if language == "en"
            else "Kripya apni mukhya swasthya samasya kuch shabdon mein batayen."
        )
