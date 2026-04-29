from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.adapters.external.ai.openai_client import IntakeTurnError
from src.application.services.intake_chat_service import IntakeChatService


def _build_service() -> IntakeChatService:
    service = IntakeChatService.__new__(IntakeChatService)
    service.openai = OpenAIQuestionClient()
    return service


def test_can_complete_when_no_fields_missing() -> None:
    service = _build_service()
    session = {
        "answers": [
            {"question": "illness", "answer": "stomach pain"},
            {"question": "When did this problem first start?", "answer": "4 days", "topic": "onset_duration"},
            {"question": "What other symptoms have you noticed?", "answer": "vomiting", "topic": "associated_symptoms"},
            {"question": "How has this problem been changing over time?", "answer": "worse", "topic": "severity_progression"},
        ]
    }

    assert service._can_complete_intake(session, {"fields_missing": [], "agent2": {}}) is True


def test_recovery_turn_skips_repeated_covered_topic() -> None:
    service = _build_service()
    session = {
        "answers": [
            {"question": "illness", "answer": "stomach pain"},
            {
                "question": "How is this issue affecting your daily routine, such as sleep, eating, work, movement, or energy?",
                "answer": "It affects work",
                "topic": "impact_daily_life",
            },
        ],
        "patient_name": "Test",
    }

    recovery = service._build_recovery_turn(
        language="en",
        topic="impact_daily_life",
        session=session,
        ai_turn={"fields_missing": ["current_medications", "impact_daily_life"]},
    )

    assert recovery is not None
    assert recovery["topic"] == "current_medications"
    assert "medicines" in recovery["message"].lower()


def test_recovery_turn_closes_when_nothing_missing() -> None:
    service = _build_service()
    session = {
        "answers": [
            {"question": "illness", "answer": "stomach pain"},
            {"question": "When did this problem first start?", "answer": "4 days", "topic": "onset_duration"},
            {"question": "What other symptoms have you noticed?", "answer": "vomiting", "topic": "associated_symptoms"},
            {"question": "How has this problem been changing over time?", "answer": "worse", "topic": "severity_progression"},
        ],
        "patient_name": "Test",
    }

    recovery = service._build_recovery_turn(
        language="en",
        topic="severity_progression",
        session=session,
        ai_turn={"fields_missing": [], "agent2": {}},
    )

    assert recovery is not None
    assert recovery["topic"] == "closing"


def test_should_ask_final_question_on_last_allowed_turn() -> None:
    service = _build_service()
    session = {
        "max_questions": 10,
        "pending_topic": None,
        "answers": [
            {"question": "illness", "answer": "stomach pain"},
            {"question": "q1", "answer": "a1", "topic": "onset_duration"},
            {"question": "q2", "answer": "a2", "topic": "associated_symptoms"},
            {"question": "q3", "answer": "a3", "topic": "severity_progression"},
            {"question": "q4", "answer": "a4", "topic": "trigger_cause"},
            {"question": "q5", "answer": "a5", "topic": "current_medications"},
            {"question": "q6", "answer": "a6", "topic": "impact_daily_life"},
            {"question": "q7", "answer": "a7", "topic": "past_medical_history"},
            {"question": "q8", "answer": "a8", "topic": "allergies"},
            {"question": "q9", "answer": "a9", "topic": "family_history"},
        ],
    }

    assert service._should_ask_final_question(session) is True


def test_should_not_reask_final_question_if_already_present() -> None:
    service = _build_service()
    session = {
        "max_questions": 10,
        "pending_topic": None,
        "answers": [
            {"question": "illness", "answer": "stomach pain"},
            {"question": "q1", "answer": "a1", "topic": "onset_duration"},
            {"question": "q2", "answer": "a2", "topic": "associated_symptoms"},
            {"question": "q3", "answer": "a3", "topic": "severity_progression"},
            {"question": "q4", "answer": "a4", "topic": "trigger_cause"},
            {"question": "q5", "answer": "a5", "topic": "current_medications"},
            {"question": "q6", "answer": "a6", "topic": "impact_daily_life"},
            {"question": "q7", "answer": "a7", "topic": "past_medical_history"},
            {"question": "q8", "answer": "a8", "topic": "allergies"},
            {"question": "q9", "answer": "a9", "topic": "final_check"},
        ],
    }

    assert service._should_ask_final_question(session) is False


class _FakeCollection:
    def __init__(self) -> None:
        self.last_update = None
        self.record = None

    def find_one(self, *_args, **_kwargs):  # noqa: ANN001
        return self.record or {}

    def update_one(self, query, payload):  # noqa: ANN001
        self.last_update = (query, payload)


class _FakeWhatsApp:
    def __init__(self) -> None:
        self.sent = []

    def send_text(self, to_number: str, message: str) -> None:
        self.sent.append((to_number, message))


def test_generate_next_turn_exception_uses_global_fallback_metadata() -> None:
    service = IntakeChatService.__new__(IntakeChatService)
    service._planner_fallback_topic = lambda _session: "associated_symptoms"

    class _FailingOpenAI:
        @staticmethod
        def _topic_message(_topic: str, _language: str) -> str:
            return "What other symptoms have you noticed?"

        @staticmethod
        def generate_intake_turn(_context: dict) -> dict:
            raise IntakeTurnError("json_parse_error")

    service.openai = _FailingOpenAI()

    fake_db = type("FakeDB", (), {})()
    fake_db.intake_sessions = _FakeCollection()
    fake_db.patients = _FakeCollection()
    fake_db.patients.record = {"name": "Patient", "age": 30, "gender": "female", "travelled_recently": False}
    service.db = fake_db
    service.whatsapp = _FakeWhatsApp()

    session = {
        "_id": "session-1",
        "visit_id": "visit-1",
        "to_number": "9999999999",
        "patient_id": "p1",
        "language": "en",
        "question_number": 2,
        "max_questions": 8,
        "answers": [{"question": "illness", "answer": "fever"}],
        "illness": "fever",
    }

    service._generate_and_send_next_turn(session)

    update_payload = fake_db.intake_sessions.last_update[1]["$set"]
    assert update_payload["last_message_source"] == "global_fallback"
    assert update_payload["last_fallback_reason"] == "json_parse_error"
    assert update_payload["last_selected_topic"] == "associated_symptoms"
    assert service.whatsapp.sent


def test_stop_request_detects_english_and_hindi_variants() -> None:
    service = _build_service()

    assert service._is_stop_request("stop") is True
    assert service._is_stop_request("please stop") is True
    assert service._is_stop_request("रुकना") is True
    assert service._is_stop_request("நிறுத்து") is True
    assert service._is_stop_request("बंद करो") is True
    assert service._is_stop_request("நிறுத்துங்கள்") is True
    assert service._is_stop_request("ఆపు") is True
    assert service._is_stop_request("ఆపండి") is True
    assert service._is_stop_request("বন্ধ") is True
    assert service._is_stop_request("বন্ধ করুন") is True
    assert service._is_stop_request("थांब") is True
    assert service._is_stop_request("थांबा") is True
    assert service._is_stop_request("ನಿಲ್ಲಿಸು") is True
    assert service._is_stop_request("ನಿಲ್ಲಿಸಿ") is True
    assert service._is_stop_request("continue") is False


def test_stop_confirmation_message_respects_language() -> None:
    service = _build_service()

    assert service._stop_confirmation_message("en") == "Thank you. We will continue with your submitted answers."
    assert service._stop_confirmation_message("hi-eng") == "Dhanyavaad. Hum aapke diye gaye jawaabon ke saath aage badhenge."
    assert service._stop_confirmation_message("hi") == "धन्यवाद। हम आपके दिए गए जवाबों के साथ आगे बढ़ेंगे।"


def test_detect_stop_request_prefers_llm_when_model_flags_opt_out() -> None:
    service = IntakeChatService.__new__(IntakeChatService)

    class _FakeOpenAI:
        @staticmethod
        def detect_patient_opt_out(*, message_text: str, language: str, recent_answers: list[dict]) -> dict:
            assert message_text == "i want to stop now"
            assert language == "en"
            assert isinstance(recent_answers, list)
            return {"is_opt_out": True, "confidence": 0.9, "reason": "patient asked to stop"}

    service.openai = _FakeOpenAI()
    result = service._detect_stop_request(
        message_text="i want to stop now",
        language="en",
        answers=[{"question": "illness", "answer": "fever"}],
    )
    assert result["detected"] is True
    assert result["source"] == "llm"
    assert result["confidence"] == 0.9


def test_detect_stop_request_uses_keyword_fallback_when_llm_errors() -> None:
    service = IntakeChatService.__new__(IntakeChatService)

    class _FailingOpenAI:
        @staticmethod
        def detect_patient_opt_out(*, message_text: str, language: str, recent_answers: list[dict]) -> dict:
            raise RuntimeError("network issue")

    service.openai = _FailingOpenAI()
    result = service._detect_stop_request(message_text="stop", language="en", answers=[])
    assert result["detected"] is True
    assert result["source"] == "keyword_fallback"


def test_opening_and_chief_complaint_use_language_catalog() -> None:
    service = _build_service()

    assert "नमस्ते" in service._opening_message("hi")
    assert "Namaste" in service._opening_message("hi-eng")
    assert "வணக்கம்" in service._opening_message("ta")
    assert "నమస్తే" in service._opening_message("te")
    assert "নমস্কার" in service._opening_message("bn")
    assert "नमस्कार" in service._opening_message("mr")
    assert "ನಮಸ್ಕಾರ" in service._opening_message("kn")
    assert "मुख्य स्वास्थ्य समस्या" in service._chief_complaint_question("hi")
    assert "mukhya swasthya samasya" in service._chief_complaint_question("hi-eng")
    assert "முக்கிய உடல்நல பிரச்சினை" in service._chief_complaint_question("ta")
    assert "ప్రధాన ఆరోగ్య సమస్య" in service._chief_complaint_question("te")
    assert "প্রধান স্বাস্থ্য সমস্যাটি" in service._chief_complaint_question("bn")
    assert "मुख्य आरोग्य समस्या" in service._chief_complaint_question("mr")
    assert "ಮುಖ್ಯ ಆರೋಗ್ಯ ಸಮಸ್ಯೆ" in service._chief_complaint_question("kn")
