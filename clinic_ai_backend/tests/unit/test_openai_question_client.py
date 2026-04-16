from src.adapters.external.ai.openai_client import OpenAIQuestionClient


def test_uses_universal_hardcoded_sequence_for_first_topic() -> None:
    context = {
        "chief_complaint": "I have skin cancer follow-up after chemotherapy",
        "language": "en",
        "question_number": 2,
        "previous_qa_json": [{"question": "illness", "answer": "skin cancer"}],
    }
    guidance = OpenAIQuestionClient._build_condition_guidance(context)

    result = OpenAIQuestionClient._enforce_condition_guidance(
        result={"agent1": {}, "agent2": {}, "agent4": {}, "message": "", "question_number": 2},
        context=context,
        guidance=guidance,
    )

    assert guidance["condition_category"] == "chronic_or_hereditary"
    assert result["agent1"]["priority_topics"][0] == "onset_duration"
    assert result["topic"] == "onset_duration"
    assert "when did this problem first start" in result["message"].lower()


def test_moves_to_next_topic_after_covered_topic() -> None:
    context = {
        "chief_complaint": "I have fever and chills for two days",
        "language": "en",
        "question_number": 3,
        "previous_qa_json": [
            {"question": "What health problem or concern brings you in today?", "answer": "fever"},
            {"question": "When did this problem first start?", "answer": "two days", "topic": "onset_duration"},
        ],
    }
    guidance = OpenAIQuestionClient._build_condition_guidance(context)

    result = OpenAIQuestionClient._enforce_condition_guidance(
        result={"agent1": {}, "agent2": {}, "agent4": {}, "message": "", "question_number": 3},
        context=context,
        guidance=guidance,
    )

    assert guidance["condition_category"] == "general_other"
    assert result["topic"] == "associated_symptoms"
    assert "other symptoms" in result["message"].lower()


def test_blocks_menstrual_topic_for_male_patient() -> None:
    guidance = OpenAIQuestionClient._build_condition_guidance(
        {
            "chief_complaint": "period problem and abdominal pain",
            "gender": "male",
            "patient_age": 32,
        }
    )

    assert "menstrual_pregnancy" not in guidance["priority_topics"]
    assert "menstrual_pregnancy" in guidance["avoid_topics"]


def test_uses_travel_history_when_recent_travel_is_true() -> None:
    guidance = OpenAIQuestionClient._build_condition_guidance(
        {
            "chief_complaint": "stomach pain",
            "has_travelled_recently": True,
        }
    )

    assert guidance["priority_topics"][5] == "travel_history"


def test_uses_family_history_branch_for_chronic_cases() -> None:
    guidance = OpenAIQuestionClient._build_condition_guidance(
        {
            "chief_complaint": "diabetes follow up",
            "has_travelled_recently": False,
        }
    )

    assert guidance["priority_topics"][6] == "family_history"
    assert guidance["priority_topics"][7] == "past_evaluation"


def test_uses_pain_assessment_branch_for_pain_cases() -> None:
    guidance = OpenAIQuestionClient._build_condition_guidance(
        {
            "chief_complaint": "severe back pain",
            "has_travelled_recently": False,
        }
    )

    assert guidance["priority_topics"][6] == "pain_assessment"


def test_infers_covered_topic_from_question_text_without_topic_field() -> None:
    context = {
        "chief_complaint": "I have fever and chills for two days",
        "language": "en",
        "question_number": 3,
        "previous_qa_json": [
            {
                "question": "When did this problem first start, and has it been continuous or on and off since then?",
                "answer": "for two days",
            }
        ],
    }

    covered = OpenAIQuestionClient._extract_covered_topics(context)

    assert covered == ["onset_duration"]


def test_merges_model_covered_topics_with_history_topics() -> None:
    context = {
        "chief_complaint": "I have fever and chills for two days",
        "language": "en",
        "question_number": 3,
        "previous_qa_json": [
            {
                "question": "When did this problem first start, and has it been continuous or on and off since then?",
                "answer": "for two days",
            }
        ],
    }
    guidance = OpenAIQuestionClient._build_condition_guidance(context)

    result = OpenAIQuestionClient._enforce_condition_guidance(
        result={
            "agent1": {},
            "agent2": {"topics_covered": ["associated_symptoms"]},
            "agent4": {},
            "message": "",
            "question_number": 3,
        },
        context=context,
        guidance=guidance,
    )

    assert result["agent2"]["topics_covered"] == ["associated_symptoms", "onset_duration"]
    assert result["topic"] == "severity_progression"
