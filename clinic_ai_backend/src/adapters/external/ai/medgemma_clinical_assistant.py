"""MedGemma provider for visit-page clinical assistant (singleton model load)."""
from __future__ import annotations

import logging
import os
import threading
from typing import Any

from src.core.config import get_settings

logger = logging.getLogger(__name__)

_ASSISTANT_UNAVAILABLE = (
    "AI assistant is temporarily unavailable. Please continue with clinical judgment and try again later."
)

_load_lock = threading.Lock()
_processor: Any | None = None
_model: Any | None = None
_load_error: str | None = None


def _hf_token() -> str | None:
    for key in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACEHUB_API_TOKEN"):
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return None


def _ensure_loaded() -> None:
    global _processor, _model, _load_error
    if _model is not None and _processor is not None:
        return
    with _load_lock:
        if _model is not None and _processor is not None:
            return
        if _load_error:
            raise RuntimeError(_ASSISTANT_UNAVAILABLE)
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor

            settings = get_settings()
            model_id = settings.medgemma_model_id
            token = _hf_token()
            kwargs: dict[str, Any] = {}
            if token:
                kwargs["token"] = token

            logger.info("medgemma_loading model_id=%s", model_id)
            _processor = AutoProcessor.from_pretrained(model_id, **kwargs)
            _model = AutoModelForImageTextToText.from_pretrained(
                model_id,
                dtype=torch.float32,
                device_map="auto",
                **kwargs,
            )
            logger.info("medgemma_loaded model_id=%s", model_id)
        except Exception as exc:  # noqa: BLE001
            _load_error = str(exc)
            logger.exception("medgemma_load_failed")
            raise RuntimeError(_ASSISTANT_UNAVAILABLE) from exc


def _build_prompt(system_prompt: str, conversation: list[dict[str, str]]) -> str:
    parts: list[str] = [system_prompt.strip(), "", "### Conversation"]
    for m in conversation:
        role = str(m.get("role") or "").strip().lower()
        content = str(m.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        label = "Doctor" if role == "user" else "Assistant"
        parts.append(f"{label}: {content[:12000]}")
    parts.append("")
    parts.append(
        "Answer the doctor's latest question using only the visit context above. "
        "Be brief by default (about 60–150 words). Use short bullets only if helpful. "
        "Give a longer answer only if the question clearly needs it."
    )
    return "\n".join(parts).strip()


class MedGemmaClinicalAssistant:
    """Visit clinical assistant backed by google/medgemma-1.5-4b-it."""

    @classmethod
    def clinical_assistant_multiturn(
        cls,
        *,
        system_prompt: str,
        conversation: list[dict[str, str]],
    ) -> str:
        if not conversation:
            raise ValueError("messages_must_include_at_least_one_user_turn")
        if str(conversation[-1].get("role") or "").strip().lower() != "user":
            raise ValueError("last_message_must_be_user")

        _ensure_loaded()
        settings = get_settings()
        prompt = _build_prompt(system_prompt, conversation)

        try:
            import torch

            messages = [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "You are a doctor-facing clinical decision support assistant. "
                                "Be concise and to the point by default. "
                                "Do not provide a final diagnosis or prescribe directly. "
                                "Expand only when the question clearly needs a detailed workup."
                            ),
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}],
                },
            ]

            inputs = _processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            )
            inputs = {key: value.to(_model.device) for key, value in inputs.items()}

            with torch.inference_mode():
                outputs = _model.generate(
                    **inputs,
                    max_new_tokens=settings.clinical_assistant_max_output_tokens,
                    do_sample=False,
                    use_cache=True,
                )

            generated_tokens = outputs[0][inputs["input_ids"].shape[-1] :]
            answer = _processor.decode(generated_tokens, skip_special_tokens=True).strip()
            if not answer:
                raise RuntimeError("empty_generation")
            return answer
        except RuntimeError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("medgemma_generate_failed")
            raise RuntimeError(_ASSISTANT_UNAVAILABLE) from exc
