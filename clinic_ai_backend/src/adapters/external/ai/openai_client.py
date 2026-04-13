"""OpenAI client module."""
from __future__ import annotations

import json
from pathlib import Path
from urllib import request

from src.core.config import get_settings


class OpenAIQuestionClient:
    """Simple OpenAI wrapper for intake and pre-visit generation."""

    def generate_questions(self, illness_text: str, language: str) -> list[str]:
        """Generate follow-up intake questions from illness text."""
        prompt = (
            "Generate 5 short clinical intake follow-up questions as a JSON array of strings. "
            f"Language: {'Hindi' if language == 'hi' else 'English'}. "
            "Do not include greeting. Keep each question under 20 words. "
            f"Patient illness description: {illness_text}"
        )
        content = self._chat_completion(prompt=prompt, system_role="You are a medical intake assistant.")
        questions = json.loads(content)
        if not isinstance(questions, list):
            raise RuntimeError("Model did not return list")
        return [str(q).strip() for q in questions if str(q).strip()][:5]

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
