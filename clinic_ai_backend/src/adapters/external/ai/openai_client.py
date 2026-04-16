"""OpenAI client module."""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib import request

from src.core.config import get_settings


ALLOWED_TOPICS = {
    "reason_for_visit",
    "onset_duration",
    "severity_progression",
    "associated_symptoms",
    "red_flag_check",
    "impact_daily_life",
    "current_medications",
    "past_medical_history",
    "treatment_history",
    "recurrence_status",
    "family_history",
    "trigger_cause",
    "menstrual_pregnancy",
    "allergies",
    "closing",
}

CONDITION_TOPIC_RULES = {
    "oncology": {
        "keywords": [
            "cancer",
            "tumor",
            "tumour",
            "chemo",
            "chemotherapy",
            "radiation",
            "oncology",
            "metastasis",
            "biopsy",
            "malignancy",
            "carcinoma",
            "leukemia",
            "lymphoma",
        ],
        "priority_topics": [
            "treatment_history",
            "recurrence_status",
            "onset_duration",
            "associated_symptoms",
            "current_medications",
            "family_history",
        ],
        "avoid_topics": ["trigger_cause"],
    },
    "infection_fever": {
        "keywords": [
            "fever",
            "viral",
            "infection",
            "cold",
            "flu",
            "cough",
            "sore throat",
            "dengue",
            "malaria",
            "typhoid",
            "chills",
        ],
        "priority_topics": [
            "onset_duration",
            "severity_progression",
            "associated_symptoms",
            "red_flag_check",
            "trigger_cause",
            "current_medications",
        ],
        "avoid_topics": [],
    },
    "cardiac": {
        "keywords": [
            "chest pain",
            "chest tightness",
            "palpitation",
            "palpitations",
            "heart",
            "bp",
            "blood pressure",
            "hypertension",
            "pressure in chest",
        ],
        "priority_topics": [
            "red_flag_check",
            "onset_duration",
            "severity_progression",
            "associated_symptoms",
            "past_medical_history",
            "current_medications",
            "family_history",
        ],
        "avoid_topics": [],
    },
    "dermatology": {
        "keywords": [
            "rash",
            "itch",
            "itching",
            "skin",
            "pimple",
            "psoriasis",
            "eczema",
            "acne",
            "lesion",
            "spot",
            "pigmentation",
        ],
        "priority_topics": [
            "onset_duration",
            "associated_symptoms",
            "severity_progression",
            "trigger_cause",
            "current_medications",
            "allergies",
        ],
        "avoid_topics": ["family_history"],
    },
    "metabolic_chronic": {
        "keywords": [
            "diabetes",
            "sugar",
            "thyroid",
            "hypertension",
            "high bp",
            "high sugar",
            "cholesterol",
            "pcos",
            "pcod",
        ],
        "priority_topics": [
            "past_medical_history",
            "current_medications",
            "severity_progression",
            "impact_daily_life",
            "associated_symptoms",
            "family_history",
        ],
        "avoid_topics": ["trigger_cause"],
    },
    "musculoskeletal": {
        "keywords": [
            "back pain",
            "knee pain",
            "joint pain",
            "body pain",
            "shoulder pain",
            "neck pain",
            "sprain",
            "swelling in joint",
        ],
        "priority_topics": [
            "onset_duration",
            "severity_progression",
            "associated_symptoms",
            "trigger_cause",
            "impact_daily_life",
            "current_medications",
        ],
        "avoid_topics": ["family_history"],
    },
    "neurological": {
        "keywords": [
            "headache",
            "migraine",
            "seizure",
            "fit",
            "numbness",
            "tingling",
            "weakness",
            "vertigo",
            "dizziness",
            "memory",
        ],
        "priority_topics": [
            "red_flag_check",
            "onset_duration",
            "severity_progression",
            "associated_symptoms",
            "past_medical_history",
            "current_medications",
        ],
        "avoid_topics": [],
    },
    "gastrointestinal": {
        "keywords": [
            "stomach",
            "abdomen",
            "abdominal",
            "vomiting",
            "diarrhea",
            "diarrhoea",
            "constipation",
            "acidity",
            "gas",
            "bloating",
            "loose motion",
            "loose motions",
        ],
        "priority_topics": [
            "onset_duration",
            "associated_symptoms",
            "severity_progression",
            "trigger_cause",
            "current_medications",
            "impact_daily_life",
        ],
        "avoid_topics": [],
    },
    "respiratory": {
        "keywords": [
            "breath",
            "breathing",
            "wheeze",
            "asthma",
            "cough",
            "cold",
            "phlegm",
            "congestion",
            "shortness of breath",
        ],
        "priority_topics": [
            "red_flag_check",
            "onset_duration",
            "associated_symptoms",
            "severity_progression",
            "trigger_cause",
            "current_medications",
        ],
        "avoid_topics": [],
    },
    "mental_health": {
        "keywords": [
            "anxiety",
            "depression",
            "stress",
            "panic",
            "sleep problem",
            "insomnia",
            "low mood",
            "overthinking",
        ],
        "priority_topics": [
            "onset_duration",
            "severity_progression",
            "impact_daily_life",
            "associated_symptoms",
            "past_medical_history",
            "current_medications",
        ],
        "avoid_topics": ["trigger_cause"],
    },
    "gynaecological": {
        "keywords": [
            "period",
            "periods",
            "pregnan",
            "bleeding",
            "white discharge",
            "pelvic pain",
            "uterus",
            "ovary",
            "ovarian",
            "fibroid",
            "vaginal",
            "menstrual",
        ],
        "priority_topics": [
            "onset_duration",
            "associated_symptoms",
            "menstrual_pregnancy",
            "severity_progression",
            "current_medications",
            "past_medical_history",
        ],
        "avoid_topics": [],
    },
    "ophthalmology": {
        "keywords": [
            "eye",
            "vision",
            "blurred vision",
            "red eye",
            "watering",
            "itchy eye",
            "eye pain",
            "swelling near eye",
        ],
        "priority_topics": [
            "onset_duration",
            "associated_symptoms",
            "severity_progression",
            "trigger_cause",
            "current_medications",
            "past_medical_history",
        ],
        "avoid_topics": ["family_history"],
    },
    "general_other": {
        "keywords": [],
        "priority_topics": ["reason_for_visit"],
        "avoid_topics": [],
    },
}

TOPIC_QUESTION_TEMPLATES = {
    "en": {
        "reason_for_visit": "Please tell me the main health issue you want to discuss today?",
        "onset_duration": "When did this problem first start, and has it been continuous or on and off since then?",
        "severity_progression": "How has this problem been changing over time, including whether it feels better, worse, or about the same?",
        "associated_symptoms": "What other symptoms have you noticed along with this problem, and how have they been affecting you?",
        "red_flag_check": "Please describe any serious warning signs you've noticed, such as severe pain, breathlessness, fainting, bleeding, or sudden worsening?",
        "impact_daily_life": "How is this issue affecting your daily routine, such as sleep, eating, work, movement, or energy?",
        "current_medications": "What medicines, supplements, or home remedies are you currently taking for this, including anything you started recently?",
        "past_medical_history": "Please describe any past medical conditions, surgeries, or major illnesses that may be related to this problem?",
        "treatment_history": "What treatment or medical care have you already received for this problem so far?",
        "recurrence_status": "Please describe whether this is a new problem, a recurrence, or a follow-up of an older diagnosis?",
        "family_history": "Please describe any similar or related health problems in your close family, such as parents or siblings?",
        "trigger_cause": "Did anything happen around the time this started, such as travel, food changes, injury, infection exposure, or stress?",
        "menstrual_pregnancy": "When was your last menstrual period, and have you noticed any cycle changes or a possibility of pregnancy?",
        "allergies": "Please describe any allergies to medicines, foods, or anything else that doctors should know about?",
        "closing": "Thank you, we have everything we need for now. Please arrive on time for your visit.",
    },
    "hi": {
        "reason_for_visit": "कृपया बताइए कि आज आपकी मुख्य स्वास्थ्य समस्या क्या है?",
        "onset_duration": "यह समस्या पहली बार कब शुरू हुई थी, और तब से लगातार है या बीच-बीच में होती है?",
        "severity_progression": "समय के साथ यह समस्या कैसे बदली है, जैसे बेहतर, बदतर, या लगभग वैसी ही?",
        "associated_symptoms": "इस समस्या के साथ आपने और कौन-कौन से लक्षण महसूस किए हैं?",
        "red_flag_check": "कृपया बताइए कि क्या कोई गंभीर चेतावनी वाले लक्षण हुए हैं, जैसे तेज दर्द, सांस की तकलीफ, बेहोशी, खून आना, या अचानक बिगड़ना?",
        "impact_daily_life": "यह समस्या आपकी रोजमर्रा की जिंदगी, जैसे नींद, खाना, काम, चलना-फिरना, या ऊर्जा पर कैसे असर डाल रही है?",
        "current_medications": "अभी आप इसके लिए कौन-कौन सी दवाएं, सप्लीमेंट, या घरेलू इलाज ले रहे हैं?",
        "past_medical_history": "कृपया अपनी पुरानी बीमारियों, सर्जरी, या बड़ी स्वास्थ्य समस्याओं के बारे में बताइए जो इससे जुड़ी हो सकती हैं?",
        "treatment_history": "अब तक आपने इस समस्या के लिए क्या इलाज या चिकित्सा सलाह ली है?",
        "recurrence_status": "कृपया बताइए कि यह नई समस्या है, पुरानी समस्या दोबारा हुई है, या किसी पुराने निदान का फॉलो-अप है?",
        "family_history": "क्या आपके परिवार में माता-पिता या भाई-बहनों को ऐसी या मिलती-जुलती स्वास्थ्य समस्या रही है?",
        "trigger_cause": "यह शुरू होने के आसपास क्या हुआ था, जैसे यात्रा, खाने में बदलाव, चोट, संक्रमण का संपर्क, या तनाव?",
        "menstrual_pregnancy": "आपकी आखिरी माहवारी कब हुई थी, और क्या चक्र में कोई बदलाव या गर्भावस्था की संभावना है?",
        "allergies": "कृपया बताइए कि आपको दवाओं, खाने, या किसी और चीज से कोई एलर्जी है क्या?",
        "closing": "धन्यवाद, अभी के लिए हमें जरूरी जानकारी मिल गई है। कृपया समय पर आएं।",
    },
}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _normalize_topic_list(topics: list[str] | None) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for topic in topics or []:
        if topic in ALLOWED_TOPICS and topic not in seen:
            seen.add(topic)
            normalized.append(topic)
    return normalized


def _normalize_question_text(value: str) -> str:
    text = _normalize_text(value)
    return re.sub(r"[^a-z0-9\u0900-\u097f\s]", "", text)


class OpenAIQuestionClient:
    """Simple OpenAI wrapper for intake, summary, and vitals generation."""

    def generate_intake_turn(self, context: dict) -> dict:
        """Generate one intake turn from the dynamic intake template."""
        guidance = self._build_condition_guidance(context)
        template_path = Path(__file__).resolve().parent / "prompt_templates" / "intake_prompt.txt"
        template = template_path.read_text(encoding="utf-8")
        replacements = {
            "{{patient_name}}": str(context.get("patient_name", "") or ""),
            "{{patient_age}}": str(context.get("patient_age", "") or ""),
            "{{gender}}": str(context.get("gender", "") or ""),
            "{{language}}": str(context.get("language", "en") or "en"),
            "{{question_number}}": str(int(context.get("question_number", 0) or 0)),
            "{{max_questions}}": str(int(context.get("max_questions", 8) or 8)),
            "{{previous_qa_json}}": json.dumps(context.get("previous_qa_json", []), ensure_ascii=True),
            "{{has_travelled_recently}}": "true" if bool(context.get("has_travelled_recently", False)) else "false",
            "{{chief_complaint}}": str(context.get("chief_complaint", "") or ""),
            "{{deterministic_condition_category}}": guidance["condition_category"],
            "{{deterministic_priority_topics}}": json.dumps(guidance["priority_topics"], ensure_ascii=True),
            "{{deterministic_avoid_topics}}": json.dumps(guidance["avoid_topics"], ensure_ascii=True),
        }
        prompt = template
        for placeholder, value in replacements.items():
            prompt = prompt.replace(placeholder, value)

        content = self._chat_completion(
            prompt=prompt,
            system_role=(
                "You are an expert clinical intake orchestration engine. "
                "Follow the provided instructions exactly and return strict JSON only."
            ),
        )
        result = json.loads(content)
        if not isinstance(result, dict):
            raise RuntimeError("Model did not return object")
        return self._enforce_condition_guidance(result=result, context=context, guidance=guidance)

    def generate_pre_visit_summary(self, language: str, intake_answers: list[dict]) -> dict:
        """Generate a structured five-section pre-visit summary."""
        template_path = Path(__file__).resolve().parent / "prompt_templates" / "summary_prompt.txt"
        template = template_path.read_text(encoding="utf-8")
        prompt = template.replace("{{language}}", language).replace(
            "{{intake_answers_json}}", json.dumps(intake_answers, ensure_ascii=True)
        )
        content = self._chat_completion(
            prompt=prompt,
            system_role="You generate structured pre-visit summaries for doctors.",
        )
        summary = json.loads(content)
        if not isinstance(summary, dict):
            raise RuntimeError("Model did not return object")
        return summary

    def generate_vitals_form(self, context: dict) -> dict:
        """Generate context-aware vitals requirement form."""
        template_path = Path(__file__).resolve().parent / "prompt_templates" / "vitals_prompt.txt"
        template = template_path.read_text(encoding="utf-8")
        prompt = template.replace("{{context_json}}", json.dumps(context, ensure_ascii=True))
        content = self._chat_completion(
            prompt=prompt,
            system_role="You decide if vitals are needed and generate a safe structured vitals form.",
        )
        result = json.loads(content)
        if not isinstance(result, dict):
            raise RuntimeError("Model did not return object")
        return result

    @staticmethod
    def _chat_completion(prompt: str, system_role: str) -> str:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        payload = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": system_role},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        req = request.Request(
            url="https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        return body["choices"][0]["message"]["content"]

    @classmethod
    def _build_condition_guidance(cls, context: dict) -> dict:
        complaint = _normalize_text(context.get("chief_complaint", ""))
        category = cls._infer_condition_category(complaint)
        priority_topics = list(CONDITION_TOPIC_RULES[category]["priority_topics"])
        avoid_topics = list(CONDITION_TOPIC_RULES[category]["avoid_topics"])

        gender = _normalize_text(context.get("gender", ""))
        age = context.get("patient_age")
        try:
            age_value = int(age) if age not in ("", None) else None
        except (TypeError, ValueError):
            age_value = None

        if category != "gynaecological" and "menstrual_pregnancy" in priority_topics:
            priority_topics = [topic for topic in priority_topics if topic != "menstrual_pregnancy"]
        if gender in {"male", "m", "man", "boy"} or (age_value is not None and age_value < 12):
            if "menstrual_pregnancy" in priority_topics:
                priority_topics = [topic for topic in priority_topics if topic != "menstrual_pregnancy"]
            if "menstrual_pregnancy" not in avoid_topics:
                avoid_topics.append("menstrual_pregnancy")

        if category != "infection_fever" and not bool(context.get("has_travelled_recently", False)):
            if "trigger_cause" in priority_topics and complaint:
                # Keep trigger questions for non-infectious conditions, but avoid travel-specific drift.
                pass

        return {
            "condition_category": category,
            "priority_topics": _normalize_topic_list(priority_topics),
            "avoid_topics": _normalize_topic_list(avoid_topics),
        }

    @classmethod
    def _infer_condition_category(cls, complaint: str) -> str:
        if not complaint or complaint in {"hi", "hello", "hey", "ok", "okay", "yes", "no"}:
            return "general_other"

        for category, config in CONDITION_TOPIC_RULES.items():
            if category == "general_other":
                continue
            if any(keyword in complaint for keyword in config["keywords"]):
                return category

        return "general_other"

    @classmethod
    def _extract_covered_topics(cls, context: dict) -> list[str]:
        covered: list[str] = []
        for qa in context.get("previous_qa_json", []) or []:
            topic = cls._infer_topic_from_qa(qa)
            if topic in ALLOWED_TOPICS and topic not in covered:
                covered.append(topic)
        return covered

    @classmethod
    def _infer_topic_from_qa(cls, qa: dict | None) -> str:
        item = qa or {}
        explicit_topic = str(item.get("topic", "") or "").strip()
        if explicit_topic in ALLOWED_TOPICS:
            return explicit_topic

        question = str(item.get("question", "") or "")
        normalized_question = _normalize_question_text(question)
        if not normalized_question or normalized_question == "illness":
            return ""

        for language_topics in TOPIC_QUESTION_TEMPLATES.values():
            for topic, template in language_topics.items():
                if topic == "closing":
                    continue
                if _normalize_question_text(template) == normalized_question:
                    return topic

        keyword_map = {
            "reason_for_visit": ["main health issue", "health problem", "concern brings you", "मुख्य स्वास्थ्य समस्या"],
            "onset_duration": ["when did this problem first start", "पहली बार कब शुरू"],
            "severity_progression": ["changing over time", "better worse", "समय के साथ"],
            "associated_symptoms": ["other symptoms", "और कौन", "लक्षण"],
            "red_flag_check": ["warning signs", "गंभीर चेतावनी", "severe pain", "breathlessness"],
            "impact_daily_life": ["daily routine", "रोजमर्रा", "sleep eating work"],
            "current_medications": ["medicines supplements", "दवाएं", "home remedies"],
            "past_medical_history": ["past medical conditions", "पुरानी बीमारियों", "surgeries"],
            "treatment_history": ["treatment or medical care", "क्या इलाज", "medical care"],
            "recurrence_status": ["new problem", "recurrence", "फॉलोअप", "फॉलो-अप"],
            "family_history": ["close family", "परिवार", "parents or siblings"],
            "trigger_cause": ["around the time this started", "शुरू होने के आसपास", "travel food changes injury"],
            "menstrual_pregnancy": ["last menstrual period", "आखिरी माहवारी", "possibility of pregnancy"],
            "allergies": ["allergies to medicines", "एलर्जी", "foods or anything else"],
        }
        for topic, phrases in keyword_map.items():
            if any(phrase in normalized_question for phrase in phrases):
                return topic
        return ""

    @classmethod
    def _next_topic_from_plan(cls, context: dict, guidance: dict) -> str:
        covered = set(cls._extract_covered_topics(context))
        avoid = set(guidance["avoid_topics"])
        for topic in guidance["priority_topics"]:
            if topic not in covered and topic not in avoid:
                return topic
        return "closing"

    @classmethod
    def _topic_message(cls, topic: str, language: str) -> str:
        lang = "hi" if str(language or "").strip().lower() == "hi" else "en"
        return TOPIC_QUESTION_TEMPLATES[lang].get(topic) or TOPIC_QUESTION_TEMPLATES[lang]["reason_for_visit"]

    @classmethod
    def _enforce_condition_guidance(cls, result: dict, context: dict, guidance: dict) -> dict:
        agent1 = result.get("agent1") if isinstance(result.get("agent1"), dict) else {}
        agent2 = result.get("agent2") if isinstance(result.get("agent2"), dict) else {}
        agent4 = result.get("agent4") if isinstance(result.get("agent4"), dict) else {}

        enforced_next_topic = cls._next_topic_from_plan(context=context, guidance=guidance)
        if result.get("is_complete"):
            enforced_next_topic = "closing"

        agent1["condition_category"] = guidance["condition_category"]
        agent1["priority_topics"] = guidance["priority_topics"]
        existing_avoid = _normalize_topic_list(agent1.get("avoid_topics"))
        merged_avoid = _normalize_topic_list(existing_avoid + guidance["avoid_topics"])
        agent1["avoid_topics"] = merged_avoid
        agent1["topic_plan"] = guidance["priority_topics"]

        covered = _normalize_topic_list(agent2.get("topics_covered") or [])
        covered = _normalize_topic_list(covered + cls._extract_covered_topics(context))
        agent2["topics_covered"] = covered
        agent2["information_gaps"] = [
            topic for topic in guidance["priority_topics"] if topic not in covered and topic not in merged_avoid
        ]
        agent2["redundant_categories"] = _normalize_topic_list(agent2.get("redundant_categories"))

        is_complete = enforced_next_topic == "closing"
        agent4["next_topic"] = enforced_next_topic
        agent4["stop_intake"] = is_complete
        agent4["reason"] = (
            f"Using deterministic topic plan for {guidance['condition_category']}."
            if not is_complete
            else "No remaining required topics for this illness category."
        )

        result["agent1"] = agent1
        result["agent2"] = agent2
        result["agent4"] = agent4
        result["fields_collected"] = covered
        result["fields_missing"] = agent2["information_gaps"]
        result["topic"] = enforced_next_topic
        result["is_complete"] = is_complete
        if not isinstance(result.get("question_number"), int):
            result["question_number"] = int(context.get("question_number", 1) or 1)

        if enforced_next_topic == "closing":
            result["message"] = result.get("message") or cls._topic_message("closing", context.get("language", "en"))
        else:
            result["message"] = cls._topic_message(enforced_next_topic, context.get("language", "en"))

        return result
