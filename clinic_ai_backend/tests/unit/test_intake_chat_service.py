from src.adapters.external.ai.openai_client import OpenAIQuestionClient
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
