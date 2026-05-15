"""Unit tests for MedGemma clinical assistant provider (mocked, no model download)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from src.adapters.external.ai import medgemma_clinical_assistant as mg


@pytest.fixture(autouse=True)
def _reset_singleton() -> None:
    mg._processor = None
    mg._model = None
    mg._load_error = None
    yield
    mg._processor = None
    mg._model = None
    mg._load_error = None


def test_clinical_assistant_multiturn_returns_decoded_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    mock_processor = MagicMock()
    mock_model = MagicMock()
    mock_model.device = "cpu"

    import torch

    input_ids = torch.tensor([[1, 2, 3, 4]])
    mock_processor.apply_chat_template.return_value = {"input_ids": input_ids}
    mock_processor.decode.return_value = "Consider viral fever and monitor red flags."

    out_tokens = torch.tensor([[1, 2, 3, 4, 99, 100]])
    mock_model.generate.return_value = out_tokens

    mg._processor = mock_processor
    mg._model = mock_model

    reply = mg.MedGemmaClinicalAssistant.clinical_assistant_multiturn(
        system_prompt="Visit context here.",
        conversation=[{"role": "user", "content": "Fever for 4 days?"}],
    )
    assert "fever" in reply.lower()
    mock_model.generate.assert_called_once()


def test_load_failure_raises_safe_message(monkeypatch: pytest.MonkeyPatch) -> None:
    mg._load_error = "cuda oom"

    with pytest.raises(RuntimeError, match="temporarily unavailable"):
        mg.MedGemmaClinicalAssistant.clinical_assistant_multiturn(
            system_prompt="ctx",
            conversation=[{"role": "user", "content": "Hi"}],
        )
