"""OpenAI client module."""
from __future__ import annotations

import json
from urllib import request

from src.core.config import get_settings


class OpenAIQuestionClient:
    """Simple OpenAI wrapper for intake question generation."""

    def generate_questions(self, illness_text: str, language: str) -> list[str]:
        """Generate follow-up intake questions from illness text."""
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        prompt = (
            "Generate 5 short clinical intake follow-up questions as a JSON array of strings. "
            f"Language: {'Hindi' if language == 'hi' else 'English'}. "
            "Do not include greeting. Keep each question under 20 words. "
            f"Patient illness description: {illness_text}"
        )

        payload = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": "You are a medical intake assistant."},
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

        content = body["choices"][0]["message"]["content"]
        try:
            questions = json.loads(content)
        except json.JSONDecodeError:
            raise RuntimeError("Invalid JSON returned by model")
        if not isinstance(questions, list):
            raise RuntimeError("Model did not return list")
        return [str(q).strip() for q in questions if str(q).strip()][:5]
