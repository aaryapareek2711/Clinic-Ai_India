from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.adapters.external.ai.openai_client import IntakeTurnError
from src.application.services.intake_chat_service import IntakeChatService
from src.core.config import get_settings


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

    def update_one(self, query, payload, **kwargs):  # noqa: ANN001
        self.last_update = (query, payload, kwargs)


class _FakeWhatsApp:
    def __init__(self, *, fail_template: bool = False) -> None:
        self.sent = []
        self.fail_template = fail_template

    def send_text(self, to_number: str, message: str) -> None:
        self.sent.append(("text", to_number, message))

    def send_template(
        self,
        to_number: str,
        template_name: str,
        language_code: str,
        body_values: list[str] | None = None,
    ) -> None:
        if self.fail_template:
            raise RuntimeError("template failed")
        self.sent.append(("template", to_number, template_name, language_code, body_values or []))


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


def test_start_intake_prefers_template_when_configured() -> None:
    service = IntakeChatService.__new__(IntakeChatService)
    fake_db = type("FakeDB", (), {})()
    fake_db.intake_sessions = _FakeCollection()
    service.db = fake_db
    service.whatsapp = _FakeWhatsApp()
    service.openai = OpenAIQuestionClient()

    settings = get_settings()
    previous_template = settings.whatsapp_intake_template_name
    previous_param_count = settings.whatsapp_intake_template_param_count
    settings.whatsapp_intake_template_name = "opening_msg"
    settings.whatsapp_intake_template_param_count = 1
    try:
        service.start_intake(
            patient_id="patient-1",
            visit_id="visit-1",
            to_number="+91 98765 43210",
            language="en",
        )
    finally:
        settings.whatsapp_intake_template_name = previous_template
        settings.whatsapp_intake_template_param_count = previous_param_count

    assert service.whatsapp.sent
    first = service.whatsapp.sent[0]
    assert first[0] == "template"
    assert first[1] == "919876543210"
    assert first[2] == "opening_msg"


def test_start_intake_falls_back_to_text_when_template_fails() -> None:
    service = IntakeChatService.__new__(IntakeChatService)
    fake_db = type("FakeDB", (), {})()
    fake_db.intake_sessions = _FakeCollection()
    service.db = fake_db
    service.whatsapp = _FakeWhatsApp(fail_template=True)
    service.openai = OpenAIQuestionClient()

    settings = get_settings()
    previous_template = settings.whatsapp_intake_template_name
    previous_param_count = settings.whatsapp_intake_template_param_count
    settings.whatsapp_intake_template_name = "opening_msg"
    settings.whatsapp_intake_template_param_count = 1
    try:
        service.start_intake(
            patient_id="patient-1",
            visit_id="visit-1",
            to_number="9876543210",
            language="en",
        )
    finally:
        settings.whatsapp_intake_template_name = previous_template
        settings.whatsapp_intake_template_param_count = previous_param_count

    assert service.whatsapp.sent
    assert service.whatsapp.sent[0][0] == "text"
    assert service.whatsapp.sent[0][1] == "9876543210"
