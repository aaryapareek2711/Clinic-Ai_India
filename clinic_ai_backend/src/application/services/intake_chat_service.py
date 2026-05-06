"""Intake chat orchestration service module."""
from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import IntakeTurnError, OpenAIQuestionClient
from src.adapters.external.whatsapp.meta_whatsapp_client import MetaWhatsAppClient
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase
from src.core.config import get_settings
from src.core.language_support import normalize_intake_language


NON_TEXT_MESSAGE_TRIGGER = "__non_text_message__"
MIN_FOLLOW_UP_QUESTIONS = 3
ACTIVE_SESSION_STATUSES = ("awaiting_conversation_start", "awaiting_illness", "in_progress")
logger = logging.getLogger(__name__)

OPENING_MESSAGES = {
    "en": "Hello! Please reply with any message to begin your intake.",
    "hi": "Namaste! Apna intake shuru karne ke liye koi bhi message bhejiye.",
    "hi-eng": "Namaste! Intake start karne ke liye koi bhi message bhejiye.",
    "ta": "Vanakkam! Ungal intake-ai thodanga yedhaavadhu oru message anuppunga.",
    "te": "Namaskaram! Mee intake prarambhinchadaniki yedaina oka message pampandi.",
    "bn": "Namaskar! Intake shuru korte jekono ekta message pathan.",
    "mr": "Namaskar! Tumcha intake suru karanyasathi kuthalahi ek message pathava.",
    "kn": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಇಂಟೇಕ್ ಪ್ರಾರಂಭಿಸಲು ಯಾವುದೇ ಒಂದು ಸಂದೇಶವನ್ನು ಕಳುಹಿಸಿ.",
}

CHIEF_COMPLAINT_MESSAGES = {
    "en": "Please describe your main health problem in a few words.",
    "hi": "कृपया अपनी मुख्य स्वास्थ्य समस्या कुछ शब्दों में बताएं।",
    "hi-eng": "Kripya apni main health problem kuch shabdon mein batayen.",
    "ta": "உங்கள் முக்கிய உடல்நலப் பிரச்சினையை சில வார்த்தைகளில் சொல்லுங்கள்.",
    "te": "మీ ప్రధాన ఆరోగ్య సమస్యను కొన్ని మాటల్లో వివరించండి.",
    "bn": "আপনার প্রধান শারীরিক সমস্যাটি কয়েকটি কথায় বলুন।",
    "mr": "कृपया तुमची मुख्य आरोग्य समस्या काही शब्दांत सांगा.",
    "kn": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಮುಖ್ಯ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಯನ್ನು ಕೆಲವು ಪದಗಳಲ್ಲಿ ಹೇಳಿ.",
}

OPT_OUT_ACK_MESSAGES = {
    "en": "Thank you. We will continue with your submitted answers.",
    "hi": "धन्यवाद। हम आपके दिए गए जवाबों के साथ आगे बढ़ेंगे।",
    "hi-eng": "Dhanyavaad. Hum aapke diye gaye answers ke saath aage badhenge.",
    "ta": "நன்றி. நீங்கள் கொடுத்த பதில்களுடன் நாங்கள் தொடர்கிறோம்.",
    "te": "ధన్యవాదాలు. మీరు ఇచ్చిన సమాధానాలతో మేము ముందుకు వెళ్తాము.",
    "bn": "ধন্যবাদ। আপনি যে উত্তরগুলো দিয়েছেন, সেগুলো নিয়ে আমরা এগিয়ে যাব।",
    "mr": "धन्यवाद. तुम्ही दिलेल्या उत्तरांसह आम्ही पुढे जाऊ.",
    "kn": "ಧನ್ಯವಾದಗಳು. ನೀವು ನೀಡಿದ ಉತ್ತರಗಳೊಂದಿಗೆ ನಾವು ಮುಂದುವರೆಯುತ್ತೇವೆ.",
}

CLOSING_MESSAGES = {
    "en": (
        "Thank you{maybe_name}, we have everything we need. "
        "Your doctor will be fully prepared for your visit. Please arrive on time. See you soon."
    ),
    "hi": (
        "धन्यवाद{maybe_name}, हमें सारी ज़रूरी जानकारी मिल गई है। "
        "आपके डॉक्टर पूरी तरह तैयार रहेंगे। कृपया समय पर पहुँचें। जल्द मिलेंगे।"
    ),
    "hi-eng": (
        "Dhanyavaad{maybe_name}, humein saari zaroori jankari mil gayi hai. "
        "Aapke doctor poori tarah tayyar rahenge. Kripya samay par pahunchein. Jaldi milenge."
    ),
    "ta": (
        "Nandri{maybe_name}, thevaiyana anaithu thagavalum engalukku kidaithulladhu. "
        "Ungal doctor sandhippirkku muzhumaiyaga tayaaraga iruppar. Dayavu seithu nerathukku vaarungal."
    ),
    "te": (
        "Dhanyavadalu{maybe_name}, maaku avasaramaina samacharam anta dorikindi. "
        "Mee doctor mee visit kosam poorthiga siddhanga untaru. Dayachesi samayaniki randi."
    ),
    "bn": (
        "Dhonnobad{maybe_name}, amader dorkarer shob tothyo peyechi. "
        "Apnar doctor apnar visit-er jonno purotai prostut thakben. Doya kore somoye ashben."
    ),
    "mr": (
        "Dhanyavaad{maybe_name}, aamhalya avashyak asleli sarv mahiti milali aahe. "
        "Tumche doctor tumchya bhetisathi purnata tayar astil. Krupaya velat ya."
    ),
    "kn": (
        "ಧನ್ಯವಾದಗಳು{maybe_name}, ನಮಗೆ ಬೇಕಾದ ಎಲ್ಲಾ ಮಾಹಿತಿ ಸಿಕ್ಕಿದೆ. "
        "ನಿಮ್ಮ ವೈದ್ಯರು ನಿಮ್ಮ ಭೇಟಿಗೆ ಸಂಪೂರ್ಣ ಸಿದ್ಧರಾಗಿರುತ್ತಾರೆ. ದಯವಿಟ್ಟು ಸಮಯಕ್ಕೆ ಬನ್ನಿ."
    ),
}


class IntakeChatService:
    """Coordinates intake question flow on WhatsApp."""

    def __init__(self) -> None:
        self.db = get_database()
        self.whatsapp = MetaWhatsAppClient()
        self.openai = OpenAIQuestionClient()

    def start_intake(self, patient_id: str, visit_id: str, to_number: str, language: str) -> None:
        """Start intake with opening message; first clinical question comes after user reply."""
        normalized_to_number = self._normalize_phone_number(to_number)
        existing_session = self.db.intake_sessions.find_one(
            {"patient_id": patient_id, "visit_id": visit_id},
            sort=[("updated_at", -1)],
        ) or {}
        existing_status = str(existing_session.get("status") or "")
        # Idempotency: do not reset an active intake or resend greeting.
        if existing_session and existing_status in {"awaiting_conversation_start", "awaiting_illness", "in_progress"}:
            logger.info(
                "intake_start_skipped_existing_active_session visit_id=%s patient_id=%s status=%s",
                visit_id,
                patient_id,
                existing_status,
            )
            return
        opening_message = self._opening_message(language)
        patient_name = ""
        patients_collection = getattr(self.db, "patients", None)
        if patients_collection is not None:
            patient = patients_collection.find_one({"patient_id": patient_id}) or {}
            patient_name = str(patient.get("name") or "").strip()

        self.db.intake_sessions.update_one(
            {"visit_id": visit_id},
            {
                "$set": {
                    "patient_id": patient_id,
                    "visit_id": visit_id,
                    "to_number": normalized_to_number,
                    "language": language,
                    "patient_name": patient_name,
                    "status": "awaiting_conversation_start",
                    "greeting_sent": True,
                    "illness": None,
                    "answers": [],
                    "pending_question": None,
                    "pending_topic": None,
                    "question_number": 1,
                    "max_questions": 10,
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
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "previous_workflow_stage": None,
                    "current_workflow_stage": "intake",
                    "next_workflow_stage": "pre_visit",
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        current_session = self.db.intake_sessions.find_one({"visit_id": visit_id}) or {}
        if current_session:
            self._sync_visit_intake_projection(current_session)
        if normalized_to_number:
            self._supersede_other_active_sessions_for_number(
                to_number=normalized_to_number,
                keep_session_id=current_session.get("_id"),
                reason="new_intake_started",
            )
        settings = get_settings()
        if settings.whatsapp_intake_template_name:
            language_code = (
                settings.whatsapp_intake_template_lang_hi
                if language == "hi"
                else settings.whatsapp_intake_template_lang_en
            )
            body_values = [opening_message] if settings.whatsapp_intake_template_param_count > 0 else []
            try:
                # Send first business-initiated template to open the WhatsApp conversation window.
                self.whatsapp.send_template(
                    to_number=normalized_to_number,
                    template_name=settings.whatsapp_intake_template_name,
                    language_code=language_code,
                    body_values=body_values,
                )
                logger.info(
                    "whatsapp_intake_opening_sent visit_id=%s channel=template template=%s to=%s",
                    visit_id,
                    settings.whatsapp_intake_template_name,
                    self._mask_phone_number(normalized_to_number),
                )
            except Exception:
                logger.exception(
                    "whatsapp_intake_template_failed visit_id=%s template=%s to=%s fallback=text",
                    visit_id,
                    settings.whatsapp_intake_template_name,
                    self._mask_phone_number(normalized_to_number),
                )
                self.whatsapp.send_text(normalized_to_number, opening_message)
                logger.info(
                    "whatsapp_intake_opening_sent visit_id=%s channel=text to=%s reason=template_failure",
                    visit_id,
                    self._mask_phone_number(normalized_to_number),
                )
        else:
            self.whatsapp.send_text(normalized_to_number, opening_message)
            logger.info(
                "whatsapp_intake_opening_sent visit_id=%s channel=text to=%s reason=template_not_configured",
                visit_id,
                self._mask_phone_number(normalized_to_number),
            )

    def handle_patient_reply(self, from_number: str, message_text: str, message_id: str | None = None) -> None:
        """Handle incoming WhatsApp reply and continue intake."""
        normalized_from = self._normalize_phone_number(from_number)
        active_statuses = list(ACTIVE_SESSION_STATUSES)
        session = self._resolve_active_session_for_inbound_number(normalized_from, active_statuses)
        if not session:
            bootstrapped = self._bootstrap_session_for_number(normalized_from)
            if bootstrapped:
                logger.info(
                    "whatsapp_inbound_bootstrapped_session from=%s visit_id=%s patient_id=%s message_id=%s",
                    self._mask_phone_number(normalized_from),
                    str(bootstrapped.get("visit_id") or ""),
                    str(bootstrapped.get("patient_id") or ""),
                    message_id,
                )
                # Use the freshly bootstrapped session directly so this same inbound
                # message can advance intake immediately even if number-based re-resolve
                # misses due record-shape drift.
                session = bootstrapped
                resolved_after_bootstrap = self._resolve_active_session_for_inbound_number(normalized_from, active_statuses)
                if resolved_after_bootstrap:
                    session = resolved_after_bootstrap
            if not session:
                logger.info(
                    "whatsapp_inbound_no_session from=%s message_id=%s",
                    self._mask_phone_number(normalized_from),
                    message_id,
                )
                return
        logger.info(
            "whatsapp_inbound_state_resolved from=%s visit_id=%s patient_id=%s status=%s qn=%s pending_question_present=%s",
            self._mask_phone_number(normalized_from),
            str(session.get("visit_id") or ""),
            str(session.get("patient_id") or ""),
            str(session.get("status") or ""),
            int(session.get("question_number", 0) or 0),
            bool(str(session.get("pending_question") or "").strip()),
        )

        # Keep session destination aligned with the latest successful inbound sender format.
        if normalized_from and str(session.get("to_number") or "") != normalized_from:
            self.db.intake_sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"to_number": normalized_from, "updated_at": datetime.now(timezone.utc)}},
            )
            session["to_number"] = normalized_from

        if message_id and not self._claim_message(session["_id"], message_id):
            logger.info(
                "whatsapp_inbound_duplicate_message_id_ignored visit_id=%s message_id=%s",
                str(session.get("visit_id") or ""),
                message_id,
            )
            return
        try:
            status = session.get("status")
            cleaned = (message_text or "").strip()
            if not cleaned:
                if status != "awaiting_conversation_start":
                    return
                cleaned = NON_TEXT_MESSAGE_TRIGGER
            if cleaned == NON_TEXT_MESSAGE_TRIGGER:
                # We still want any reply (emoji/symbol-only) to advance the flow.
                # For pre-illness bootstrap we keep current behavior; for the actual
                # chief-complaint answer step (awaiting_illness) we convert it into
                # a neutral placeholder instead of dropping the message.
                if status == "awaiting_conversation_start":
                    pass
                elif status in {"awaiting_illness", "in_progress"}:
                    cleaned = "Not provided"
                else:
                    return
            if not self._claim_inbound_text(session, cleaned):
                logger.info(
                    "whatsapp_inbound_duplicate_fingerprint_ignored visit_id=%s patient_id=%s",
                    str(session.get("visit_id") or ""),
                    str(session.get("patient_id") or ""),
                )
                return
            if self._is_probable_duplicate_reply(session, cleaned):
                logger.info(
                    "whatsapp_inbound_probable_duplicate_ignored visit_id=%s patient_id=%s",
                    str(session.get("visit_id") or ""),
                    str(session.get("patient_id") or ""),
                )
                return
            self._remember_inbound_text(session["_id"], cleaned)
            if self._should_end_intake_via_llm(session=session, message_text=cleaned):
                self.db.intake_sessions.update_one(
                    {"_id": session["_id"]},
                    {"$set": {"status": "stopped", "updated_at": datetime.now(timezone.utc)}},
                )
                self._supersede_other_active_sessions_for_number(
                    to_number=str(session.get("to_number") or ""),
                    keep_session_id=session.get("_id"),
                    reason="patient_opted_out",
                )
                end_msg = self._opt_out_ack_message(session.get("language", "en"))
                self._send_text_with_typing(session["to_number"], end_msg)
                self._auto_generate_pre_visit_summary(session)
                return

            if status == "awaiting_conversation_start":
                claimed = self.db.intake_sessions.find_one_and_update(
                    {"_id": session["_id"], "status": "awaiting_conversation_start"},
                    {
                        "$set": {
                            "status": "awaiting_illness",
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                )
                if not claimed:
                    # Another webhook advanced this session first — attach this inbound text to the
                    # current state rather than silently dropping it.
                    refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or {}
                    rs = str(refreshed.get("status") or "")
                    if rs == "awaiting_illness":
                        patient = self.db.patients.find_one({"patient_id": refreshed.get("patient_id")}) or {}
                        if self._should_reask_chief_complaint(cleaned, patient):
                            self._send_chief_complaint_and_persist_pending(refreshed)
                            return
                        self._save_illness_and_generate_questions(refreshed, cleaned)
                        return
                    if rs == "in_progress":
                        if self._should_treat_as_illness_correction(refreshed, cleaned):
                            self._replace_illness_and_regenerate(refreshed, cleaned)
                            return
                        self._save_answer_and_ask_next(refreshed, cleaned)
                        return
                    # If we still got stuck in awaiting_conversation_start (or any unexpected status),
                    # ensure the chief complaint prompt is consistently persisted so the next patient
                    # reply advances the intake flow.
                    self._send_chief_complaint_and_persist_pending(refreshed)
                    return
                refreshed_waiting = self.db.intake_sessions.find_one({"_id": session["_id"]}) or session
                # Always ask chief complaint first after intake opening/template.
                # The first inbound message only starts the conversation; the next
                # patient message should carry illness/chief complaint content.
                self._send_chief_complaint_and_persist_pending(refreshed_waiting)
                return

            if status == "awaiting_illness":
                self._save_illness_and_generate_questions(session, cleaned)
                return

            if status == "in_progress":
                if self._should_treat_as_illness_correction(session, cleaned):
                    self._replace_illness_and_regenerate(session, cleaned)
                    return
                self._save_answer_and_ask_next(session, cleaned)
        except Exception:
            # Keep webhook retries useful: rollback processed message marker if this turn failed.
            if message_id:
                self._unclaim_message(session["_id"], message_id)
            raise

    def _save_illness_and_generate_questions(self, session: dict, illness_text: str) -> None:
        claimed = self.db.intake_sessions.find_one_and_update(
            {"_id": session["_id"], "status": "awaiting_illness"},
            {
                "$set": {
                    "illness": illness_text,
                    "status": "in_progress",
                    "pending_question": None,
                    "pending_topic": None,
                    "updated_at": datetime.now(timezone.utc),
                },
                "$push": {"answers": {"question": "illness", "answer": illness_text}},
            },
        )
        if not claimed:
            latest = self.db.intake_sessions.find_one({"_id": session["_id"]}) or {}
            latest_status = str(latest.get("status") or "")
            if latest_status in {"awaiting_conversation_start", "awaiting_illness"}:
                # Recovery guard: if status drift/race kept session in a pre-illness state,
                # force-capture illness and continue so the flow does not stall.
                repaired = self.db.intake_sessions.find_one_and_update(
                    {"_id": session["_id"], "status": {"$in": ["awaiting_conversation_start", "awaiting_illness"]}},
                    {
                        "$set": {
                            "illness": illness_text,
                            "status": "in_progress",
                            "pending_question": None,
                            "pending_topic": None,
                            "updated_at": datetime.now(timezone.utc),
                        },
                        "$push": {"answers": {"question": "illness", "answer": illness_text}},
                    },
                )
                if repaired:
                    refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or repaired
                    self._generate_and_send_next_turn(refreshed)
                    return
            if latest_status == "in_progress":
                logger.warning(
                    "intake_awaiting_illness_claim_failed_recovering_as_in_progress visit_id=%s patient_id=%s",
                    str(session.get("visit_id") or ""),
                    str(session.get("patient_id") or ""),
                )
                self._save_answer_and_ask_next(latest, illness_text)
            return
        refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or claimed
        self._generate_and_send_next_turn(refreshed)

    def _save_answer_and_ask_next(self, session: dict, answer_text: str) -> None:
        current_question = str(session.get("pending_question", "") or "").strip()
        if not current_question:
            logger.warning(
                "intake_missing_pending_question_recovering visit_id=%s patient_id=%s",
                str(session.get("visit_id") or ""),
                str(session.get("patient_id") or ""),
            )
            self.db.intake_sessions.update_one(
                {"_id": session["_id"], "status": "in_progress"},
                {
                    "$push": {
                        "answers": {
                            "question": "unmapped_follow_up",
                            "topic": "clarification",
                            "answer": answer_text,
                        }
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                },
            )
            refreshed = self.db.intake_sessions.find_one({"_id": session["_id"]}) or session
            self._generate_and_send_next_turn(refreshed)
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
        fallback_topic = self._planner_fallback_topic(session)
        planner_fallback_question = self.openai._topic_message(fallback_topic, language)
        try:
            if self._should_ask_final_question(session):
                final_qn = int(session.get("question_number", 1) or 1)
                self._store_and_send_question(
                    session=session,
                    message=self._final_question(language),
                    topic="final_check",
                    question_number=final_qn,
                    message_source="template_fallback",
                    fallback_reason="",
                    selected_topic="final_check",
                    model_topic="",
                )
                self._log_intake_turn(
                    session=session,
                    question_number=final_qn,
                    selected_topic="final_check",
                    model_topic="",
                    message_source="template_fallback",
                    llm_structure_valid=False,
                    llm_message_valid=False,
                    fallback_reason="",
                    is_complete=False,
                )
                return
            if self._has_reached_intake_limit(session):
                closing_qn = int(session.get("question_number", 1) or 1)
                closing_message = self._closing_message(language, session.get("patient_name"))
                self._complete_session(
                    session,
                    closing_message,
                    "closing",
                    closing_qn,
                    message_source="template_fallback",
                    fallback_reason="",
                    selected_topic="closing",
                    model_topic="",
                )
                self._log_intake_turn(
                    session=session,
                    question_number=closing_qn,
                    selected_topic="closing",
                    model_topic="",
                    message_source="template_fallback",
                    llm_structure_valid=False,
                    llm_message_valid=False,
                    fallback_reason="",
                    is_complete=True,
                )
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
                recovery = self._build_recovery_turn(language, topic, session, ai_turn)
                if recovery:
                    self._store_and_send_question(
                        session=session,
                        message=recovery["message"],
                        topic=recovery["topic"],
                        question_number=question_number,
                        message_source="template_fallback",
                        fallback_reason="",
                        selected_topic=recovery["topic"],
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    )
                    self._log_intake_turn(
                        session=session,
                        question_number=question_number,
                        selected_topic=str(recovery["topic"] or ""),
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                        message_source="template_fallback",
                        llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                        llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                        fallback_reason="",
                        is_complete=False,
                    )
                    return
                self._store_and_send_question(
                    session=session,
                    message=planner_fallback_question,
                    topic="clarification",
                    question_number=question_number,
                    message_source="template_fallback",
                    fallback_reason="topic_mismatch",
                    selected_topic=fallback_topic,
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                )
                self._log_intake_turn(
                    session=session,
                    question_number=question_number,
                    selected_topic=fallback_topic,
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    message_source="template_fallback",
                    llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                    llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                    fallback_reason="topic_mismatch",
                    is_complete=False,
                )
                return

            if is_complete and self._can_complete_intake(session, ai_turn):
                self._log_intake_turn(
                    session=session,
                    question_number=question_number,
                    selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                    llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                    llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                    fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                    is_complete=True,
                )
                self._complete_session(
                    session,
                    message,
                    topic,
                    question_number,
                    message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                    fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                    selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                    model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                )
                return

            if is_complete:
                recovery = self._build_recovery_turn(language, topic, session, ai_turn)
                if recovery:
                    self._store_and_send_question(
                        session=session,
                        message=recovery["message"],
                        topic=recovery["topic"],
                        question_number=question_number,
                        message_source="template_fallback",
                        fallback_reason="",
                        selected_topic=recovery["topic"],
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                    )
                    self._log_intake_turn(
                        session=session,
                        question_number=question_number,
                        selected_topic=str(recovery["topic"] or ""),
                        model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                        message_source="template_fallback",
                        llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                        llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                        fallback_reason="",
                        is_complete=False,
                    )
                    return

            self._store_and_send_question(
                session=session,
                message=message,
                topic=topic,
                question_number=question_number,
                message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                model_topic=str(ai_turn.get("last_model_topic", "") or ""),
            )
            self._log_intake_turn(
                session=session,
                question_number=question_number,
                selected_topic=str(ai_turn.get("last_selected_topic", topic) or topic),
                model_topic=str(ai_turn.get("last_model_topic", "") or ""),
                message_source=str(ai_turn.get("last_message_source", "template_fallback") or "template_fallback"),
                llm_structure_valid=bool(ai_turn.get("llm_structure_valid", False)),
                llm_message_valid=bool(ai_turn.get("llm_message_valid", False)),
                fallback_reason=str(ai_turn.get("last_fallback_reason", "") or ""),
                is_complete=bool(is_complete),
            )
            return
        except IntakeTurnError as exc:
            fallback_reason = exc.reason_code
            model_topic = exc.model_topic
        except Exception:
            fallback_reason = "unknown_exception"
            model_topic = ""

        # Safe fallback if model call/parsing fails.
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": planner_fallback_question,
                    "pending_topic": fallback_topic,
                    "last_outbound_at": datetime.now(timezone.utc).isoformat(),
                    "last_message_source": "global_fallback",
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": fallback_topic,
                    "last_model_topic": model_topic,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        self._send_text_with_typing(session["to_number"], planner_fallback_question)
        self._log_intake_turn(
            session=session,
            question_number=int(session.get("question_number", 1) or 1),
            selected_topic=fallback_topic,
            model_topic=model_topic,
            message_source="global_fallback",
            llm_structure_valid=False,
            llm_message_valid=False,
            fallback_reason=fallback_reason,
            is_complete=False,
        )

    def _store_and_send_question(
        self,
        session: dict,
        message: str,
        topic: str,
        question_number: int,
        *,
        message_source: str,
        fallback_reason: str,
        selected_topic: str,
        model_topic: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        logger.info(
            "intake_next_question_generated visit_id=%s patient_id=%s qn=%s topic=%s source=%s",
            str(session.get("visit_id") or ""),
            str(session.get("patient_id") or ""),
            int(question_number),
            str(topic or ""),
            str(message_source or ""),
        )
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "in_progress",
                    "pending_question": message,
                    "pending_topic": topic,
                    "question_number": max(question_number + 1, int(session.get("question_number", 1) or 1) + 1),
                    "last_outbound_at": now.isoformat(),
                    "last_message_source": message_source,
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": selected_topic,
                    "last_model_topic": model_topic,
                    "updated_at": now,
                }
            },
        )
        refreshed_session = self.db.intake_sessions.find_one({"_id": session["_id"]}) or {}
        if refreshed_session:
            self._sync_visit_intake_projection(refreshed_session)
        self._send_text_with_typing(session["to_number"], message)
        logger.info(
            "intake_next_question_sent visit_id=%s patient_id=%s to=%s",
            str(session.get("visit_id") or ""),
            str(session.get("patient_id") or ""),
            self._mask_phone_number(str(session.get("to_number") or "")),
        )

    def _complete_session(
        self,
        session: dict,
        message: str,
        topic: str,
        question_number: int,
        *,
        message_source: str,
        fallback_reason: str,
        selected_topic: str,
        model_topic: str,
    ) -> None:
        now = datetime.now(timezone.utc)
        logger.info(
            "intake_session_completing visit_id=%s patient_id=%s topic=%s qn=%s",
            str(session.get("visit_id") or ""),
            str(session.get("patient_id") or ""),
            str(topic or ""),
            int(question_number),
        )
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "completed",
                    "pending_question": None,
                    "pending_topic": topic,
                    "question_number": question_number,
                    "last_outbound_at": now.isoformat(),
                    "last_message_source": message_source,
                    "last_fallback_reason": fallback_reason,
                    "last_selected_topic": selected_topic,
                    "last_model_topic": model_topic,
                    "updated_at": now,
                }
            },
        )
        refreshed_session = self.db.intake_sessions.find_one({"_id": session["_id"]}) or {}
        if refreshed_session:
            self._sync_visit_intake_projection(refreshed_session)
        visit_id = str(session.get("visit_id") or "").strip()
        if visit_id:
            self.db.visits.update_one(
                {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
                {
                    "$set": {
                        "previous_workflow_stage": "intake",
                        "current_workflow_stage": "pre_visit",
                        "next_workflow_stage": "vitals",
                        "updated_at": now,
                    }
                },
            )
        self._supersede_other_active_sessions_for_number(
            to_number=str(session.get("to_number") or ""),
            keep_session_id=session.get("_id"),
            reason="session_completed",
        )
        self._send_text_with_typing(session["to_number"], message)
        self._auto_generate_pre_visit_summary(session)

    def _bootstrap_session_for_number(self, normalized_from: str) -> dict | None:
        """
        Auto-create intake session when webhook receives message before explicit intake scheduling.

        This keeps patient flow alive even if start-intake trigger was missed.
        """
        if not normalized_from:
            return None
        variants, last10 = self._phone_variants(normalized_from)
        patient_query: dict = {"$or": [{"phone_number": {"$in": variants}}]}
        if last10:
            patient_query["$or"].append({"phone_number": {"$regex": f"{re.escape(last10)}$"}})
        patient = (self.db.patients.find_one(patient_query) if getattr(self.db, "patients", None) is not None else None) or {}
        patient_id = str(patient.get("patient_id") or "").strip()
        if not patient_id:
            return None
        visit = self.db.visits.find_one(
            {
                "patient_id": patient_id,
                "status": {"$in": ["open", "scheduled", "queued", "in_queue", "in_progress"]},
            },
            sort=[("updated_at", -1), ("created_at", -1)],
        ) or self.db.visits.find_one({"patient_id": patient_id}, sort=[("updated_at", -1), ("created_at", -1)])
        visit_id = str((visit or {}).get("visit_id") or (visit or {}).get("id") or "").strip()
        if not visit_id:
            return None
        self.start_intake(
            patient_id=patient_id,
            visit_id=visit_id,
            to_number=normalized_from,
            language=str(patient.get("preferred_language") or "en"),
        )
        return self.db.intake_sessions.find_one({"patient_id": patient_id, "visit_id": visit_id}) or None

    def _supersede_other_active_sessions_for_number(
        self,
        *,
        to_number: str,
        keep_session_id: object | None,
        reason: str,
    ) -> None:
        normalized = self._normalize_phone_number(to_number)
        if not normalized:
            return
        variants, last10 = self._phone_variants(normalized)
        query: dict = {
            "status": {"$in": list(ACTIVE_SESSION_STATUSES)},
            "$or": [{"to_number": {"$in": variants}}],
        }
        if last10:
            query["$or"].append({"to_number": {"$regex": f"{re.escape(last10)}$"}})
        if keep_session_id is not None:
            query["_id"] = {"$ne": keep_session_id}
        update_many = getattr(self.db.intake_sessions, "update_many", None)
        if callable(update_many):
            update_many(
                query,
                {
                    "$set": {
                        "status": "superseded",
                        "pending_question": None,
                        "pending_topic": None,
                        "superseded_reason": reason,
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )

    def _planner_fallback_topic(self, session: dict) -> str:
        context = {
            "chief_complaint": session.get("illness", ""),
            "gender": session.get("gender", ""),
            "patient_age": session.get("patient_age"),
            "previous_qa_json": session.get("answers", []),
            "has_travelled_recently": bool(session.get("has_travelled_recently", False)),
        }
        guidance = self.openai._build_condition_guidance(context)
        next_topic = self.openai._next_topic_from_plan(context=context, guidance=guidance)
        return next_topic if next_topic != "closing" else "associated_symptoms"

    @staticmethod
    def _log_intake_turn(
        *,
        session: dict,
        question_number: int,
        selected_topic: str,
        model_topic: str,
        message_source: str,
        llm_structure_valid: bool,
        llm_message_valid: bool,
        fallback_reason: str,
        is_complete: bool,
    ) -> None:
        logger.info(
            "intake_turn visit_id=%s session_id=%s question_number=%s selected_topic=%s model_topic=%s "
            "message_source=%s llm_structure_valid=%s llm_message_valid=%s fallback_reason=%s is_complete=%s",
            str(session.get("visit_id", "") or ""),
            str(session.get("_id", "") or ""),
            int(question_number),
            str(selected_topic or ""),
            str(model_topic or ""),
            str(message_source or ""),
            bool(llm_structure_valid),
            bool(llm_message_valid),
            str(fallback_reason or ""),
            bool(is_complete),
        )

    def _claim_message(self, session_id: object, message_id: str) -> bool:
        result = self.db.intake_sessions.update_one(
            {"_id": session_id, "processed_message_ids": {"$ne": message_id}},
            {"$push": {"processed_message_ids": message_id}},
        )
        return result.modified_count == 1

    def _unclaim_message(self, session_id: object, message_id: str) -> None:
        self.db.intake_sessions.update_one(
            {"_id": session_id},
            {"$pull": {"processed_message_ids": message_id}},
        )

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
        max_questions = int(session.get("max_questions", 10) or 10)
        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        return asked_questions >= max_questions

    def _should_ask_final_question(self, session: dict) -> bool:
        max_questions = int(session.get("max_questions", 10) or 10)
        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        if asked_questions != max_questions - 1:
            return False
        pending_topic = str(session.get("pending_topic", "") or "").strip()
        if pending_topic == "final_check":
            return False
        asked_topics = {str(answer.get("topic", "") or "").strip() for answer in session.get("answers", [])}
        return "final_check" not in asked_topics

    def _can_complete_intake(self, session: dict, ai_turn: dict) -> bool:
        if str(ai_turn.get("topic", "") or "") == "safety_interrupt":
            return True

        asked_questions = sum(1 for answer in session.get("answers", []) if answer.get("question") != "illness")
        if asked_questions < MIN_FOLLOW_UP_QUESTIONS:
            return False

        fields_missing = [field for field in (ai_turn.get("fields_missing") or []) if isinstance(field, str) and field]
        if not fields_missing:
            return True

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

    def _build_recovery_turn(self, language: str, topic: str, session: dict, ai_turn: dict) -> dict | None:
        topic_key = str(topic or session.get("pending_topic") or "").strip()
        covered_topics = set(self._covered_topics_from_session(session))
        missing_topics = [
            item
            for item in (ai_turn.get("fields_missing") or [])
            if isinstance(item, str) and item and item not in covered_topics
        ]

        # If the repeated topic is already covered, jump to the next missing topic instead of re-asking it.
        if missing_topics:
            next_topic = missing_topics[0]
            return {
                "topic": next_topic,
                "message": self.openai._topic_message(next_topic, language),
            }

        # If nothing meaningful remains, stop instead of looping.
        if self._can_complete_intake(session, ai_turn):
            return {
                "topic": "closing",
                "message": self._closing_message(language, session.get("patient_name")),
            }

        recovery_question = self._build_recovery_question(language, topic_key, session)
        if recovery_question and topic_key not in covered_topics:
            return {
                "topic": topic_key or "clarification",
                "message": recovery_question,
            }
        return None

    def _covered_topics_from_session(self, session: dict) -> list[str]:
        return self.openai._extract_covered_topics({"previous_qa_json": session.get("answers", [])})

    def _build_recovery_question(self, language: str, topic: str, session: dict) -> str:
        topic_key = str(topic or session.get("pending_topic") or "").strip()
        return self.openai._topic_message(topic_key, language) if topic_key else ""

    def _is_probable_duplicate_reply(self, session: dict, message_text: str) -> bool:
        recent_text = str(session.get("recent_inbound_text", "") or "").strip()
        recent_at = self._parse_datetime(session.get("recent_inbound_at"))
        if not recent_text or not recent_at:
            return False
        if self._normalize_for_similarity(recent_text) != self._normalize_for_similarity(message_text):
            return False
        return (datetime.now(timezone.utc) - recent_at).total_seconds() <= 12

    def _should_reask_chief_complaint(self, message_text: str, patient: dict) -> bool:
        if str(message_text or "").strip() == NON_TEXT_MESSAGE_TRIGGER:
            return True
        normalized = self._normalize_for_similarity(message_text)
        if not normalized:
            return True

        patient_name = self._normalize_for_similarity(patient.get("name", ""))
        if patient_name and (normalized == patient_name or normalized in patient_name or patient_name in normalized):
            return True

        intro_phrases = {
            "hi",
            "hii",
            "hiii",
            "hello",
            "hey",
            "namaste",
            "namaskar",
            "goodmorning",
            "goodevening",
            "acha",
            "ok",
            "okay",
            "yes",
            "no",
        }
        if normalized in intro_phrases:
            return True

        token_count = len(str(message_text or "").split())
        if token_count <= 2 and normalized.isalpha() and len(normalized) <= 3:
            return True

        return False

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

    def _claim_inbound_text(self, session: dict, message_text: str) -> bool:
        """
        Guard against replayed inbound payloads without stable message_id.

        Some WhatsApp webhook deliveries can replay the same patient text quickly
        (network retries / duplicate endpoint delivery). If we process both, one
        patient reply can advance the flow twice and emit two questions.
        """
        normalized = self._normalize_for_similarity(message_text)
        if not normalized:
            return True
        now = datetime.now(timezone.utc)
        last_fp = str(session.get("last_inbound_fingerprint", "") or "").strip()
        last_at = self._parse_datetime(session.get("last_inbound_fingerprint_at"))
        if last_fp == normalized and last_at is not None:
            if (now - last_at).total_seconds() <= 15:
                return False
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "last_inbound_fingerprint": normalized,
                    "last_inbound_fingerprint_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )
        return True

    def _should_end_intake_via_llm(self, session: dict, message_text: str) -> bool:
        """Let LLM decide whether patient intends to stop intake."""
        status = str(session.get("status") or "")
        if status not in {"awaiting_illness", "in_progress"}:
            return False
        try:
            decision = self.openai.detect_patient_opt_out(
                message_text=message_text,
                language=str(session.get("language") or "en"),
                pending_question=str(session.get("pending_question") or ""),
                recent_answers=list(session.get("answers") or []),
            )
        except Exception:
            logger.exception(
                "intake_opt_out_detection_failed visit_id=%s session_id=%s",
                str(session.get("visit_id") or ""),
                str(session.get("_id") or ""),
            )
            return False
        if str(decision.get("intent") or "") != "opt_out":
            return False
        if not bool(decision.get("is_opt_out")):
            return False
        confidence = float(decision.get("confidence") or 0.0)
        # Pure LLM gating: only stop on high-confidence opt-out intent.
        return confidence >= 0.7

    @staticmethod
    def _closing_message(language: str, patient_name: str | None) -> str:
        lang = normalize_intake_language(language)
        name = str(patient_name or "").strip()
        template = CLOSING_MESSAGES.get(lang, CLOSING_MESSAGES["en"])
        maybe_name = f" {name}" if name else ""
        return template.replace("{maybe_name}", maybe_name)

    @staticmethod
    def _final_question(language: str) -> str:
        lang = normalize_intake_language(language)
        if lang == "hi":
            return "कृपया बताइए कि क्या आपकी तकलीफ, स्वास्थ्य, या चिंता के बारे में कोई और महत्वपूर्ण बात है जो अभी तक साझा नहीं हुई है?"
        if lang == "kn":
            return "ನಿಮ್ಮ ಲಕ್ಷಣಗಳು, ಆರೋಗ್ಯ ಅಥವಾ ಚಿಂತೆಗಳ ಬಗ್ಗೆ ಇನ್ನೂ ಹಂಚದ ಮುಖ್ಯ ಮಾಹಿತಿಯೇನಾದರೂ ಇದೆಯೆ?"
        return "Please describe anything else about your symptoms, health, or concerns that you feel is important and has not been shared yet?"

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
        visit_id = str(session.get("visit_id", "")).strip()
        if not patient_id or not visit_id:
            return
        try:
            GeneratePreVisitSummaryUseCase().execute(patient_id=patient_id, visit_id=visit_id)
        except Exception:
            # Do not block intake completion on summary generation errors.
            return

    @staticmethod
    def _normalize_phone_number(phone_number: str) -> str:
        """Normalize phone number for reliable matching across webhook/provider formats."""
        return "".join(ch for ch in str(phone_number or "") if ch.isdigit())

    @classmethod
    def _phone_numbers_match(cls, stored_number: str, incoming_number: str) -> bool:
        """Match phone numbers across local/country-code formats."""
        stored = cls._normalize_phone_number(stored_number)
        incoming = cls._normalize_phone_number(incoming_number)
        if not stored or not incoming:
            return False
        if stored == incoming:
            return True
        # Last-10 matching supports common IN/US workflows when one side omits country code.
        if len(stored) >= 10 and len(incoming) >= 10:
            return stored[-10:] == incoming[-10:]
        return False

    @staticmethod
    def _phone_variants(phone_number: str) -> tuple[list[str], str]:
        normalized = IntakeChatService._normalize_phone_number(phone_number)
        if not normalized:
            return [], ""
        last10 = normalized[-10:] if len(normalized) >= 10 else normalized
        variants = {
            normalized,
            f"+{normalized}",
            last10,
            f"+{last10}",
        }
        return sorted(variant for variant in variants if variant), last10

    def _resolve_active_session_for_inbound_number(self, normalized_from: str, active_statuses: list[str]) -> dict | None:
        if not normalized_from:
            return None

        variants, last10 = self._phone_variants(normalized_from)
        base_or = [{"to_number": {"$in": variants}}]
        if last10:
            base_or.append({"to_number": {"$regex": f"{re.escape(last10)}$"}})
        status_priority = ["in_progress", "awaiting_illness", "awaiting_conversation_start"]
        eligible_statuses = [status for status in status_priority if status in active_statuses]
        if not eligible_statuses:
            return None

        # Prefer the most recently touched active session for this handset.
        # A strict status priority incorrectly routes replies to an older stale in_progress intake
        # while the latest visit is still awaiting_conversation_start after the template opening.
        session = self.db.intake_sessions.find_one(
            {"status": {"$in": eligible_statuses}, "$or": base_or},
            sort=[("updated_at", -1)],
        )
        if session:
            return session

        # Resolve through patients collection when intake session number shape diverges.
        patients_collection = getattr(self.db, "patients", None)
        if patients_collection is None:
            return None
        patient_query: dict = {"$or": [{"phone_number": {"$in": variants}}]}
        if last10:
            patient_query["$or"].append({"phone_number": {"$regex": f"{re.escape(last10)}$"}})
        patient = patients_collection.find_one(patient_query, {"patient_id": 1}) or {}
        patient_id = str(patient.get("patient_id") or "").strip()
        if not patient_id:
            return None
        session = self.db.intake_sessions.find_one(
            {"patient_id": patient_id, "status": {"$in": eligible_statuses}},
            sort=[("updated_at", -1)],
        )
        return session

    @staticmethod
    def _mask_phone_number(phone_number: str) -> str:
        value = str(phone_number or "")
        if len(value) <= 4:
            return "*" * len(value)
        return f"{'*' * (len(value) - 4)}{value[-4:]}"

    def _sync_visit_intake_projection(self, session: dict) -> None:
        visit_id = str(session.get("visit_id") or "").strip()
        if not visit_id:
            return
        snapshot = {
            "patient_id": str(session.get("patient_id") or "").strip(),
            "visit_id": visit_id,
            "to_number": str(session.get("to_number") or "").strip(),
            "language": str(session.get("language") or "en"),
            "patient_name": str(session.get("patient_name") or "").strip(),
            "status": str(session.get("status") or "in_progress"),
            "illness": session.get("illness"),
            "answers": list(session.get("answers") or []),
            "pending_question": session.get("pending_question"),
            "pending_topic": session.get("pending_topic"),
            "question_number": int(session.get("question_number", 1) or 1),
            "max_questions": int(session.get("max_questions", 10) or 10),
            "last_outbound_at": session.get("last_outbound_at"),
            "updated_at": session.get("updated_at") or datetime.now(timezone.utc),
        }
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"$set": {"intake_session": snapshot, "updated_at": snapshot["updated_at"]}},
        )

    def _send_chief_complaint_and_persist_pending(self, session: dict) -> None:
        """Send the scripted chief complaint ask and persist outbound metadata."""
        to_number = str(session.get("to_number") or "").strip()
        if not to_number:
            logger.warning(
                "intake_chief_complaint_skipped_missing_to_number visit_id=%s",
                str(session.get("visit_id") or ""),
            )
            return
        message = self._chief_complaint_question(session.get("language", "en"))
        now = datetime.now(timezone.utc)
        self._send_text_with_typing(to_number, message)
        self.db.intake_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "status": "awaiting_illness",
                    "pending_question": message,
                    # Use canonical topic keys so downstream planner / covered-topics inference
                    # understands this step as "reason_for_visit".
                    "pending_topic": "reason_for_visit",
                    "last_outbound_at": now.isoformat(),
                    "updated_at": now,
                }
            },
        )

    @staticmethod
    def _chief_complaint_question(language: str) -> str:
        """Return the question that asks for patient's primary problem."""
        lang = normalize_intake_language(language)
        return CHIEF_COMPLAINT_MESSAGES.get(lang, CHIEF_COMPLAINT_MESSAGES["en"])

    @staticmethod
    def _opening_message(language: str) -> str:
        """Return the initial opening message before intake begins."""
        lang = normalize_intake_language(language)
        return OPENING_MESSAGES.get(lang, OPENING_MESSAGES["en"])

    def _send_text_with_typing(self, to_number: str, message: str) -> None:
        """
        Best-effort typing indicator before sending message.

        If typing indicator call fails, message send must still proceed.
        """
        try:
            self.whatsapp.send_typing_indicator(to_number)
        except Exception:
            logger.exception(
                "whatsapp_typing_indicator_failed to=%s",
                self._mask_phone_number(str(to_number or "")),
            )
        self.whatsapp.send_text(to_number, message)

    @staticmethod
    def _opt_out_ack_message(language: str) -> str:
        lang = normalize_intake_language(language)
        return OPT_OUT_ACK_MESSAGES.get(lang, OPT_OUT_ACK_MESSAGES["en"])
