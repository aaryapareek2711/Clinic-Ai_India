"""Central AI gateway, prompt versioning, and telemetry logging."""
from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.core.config import get_settings

logger = logging.getLogger(__name__)

PROMPT_SCENARIOS = ("intake", "previsit", "soap", "postvisit")
PROMPT_PHASE_MAP = {
    "intake": "intake",
    "previsit": "pre_visit_summary",
    "soap": "soap",
    "postvisit": "post_visit_summary",
}
PROMPT_FILES = {
    "intake": "intake_prompt.txt",
    "previsit": "summary_prompt.txt",
    "soap": "india_note_prompt.txt",
    "postvisit": "post_visit_summary_prompt.txt",
}
PROMPT_TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "adapters" / "external" / "ai" / "prompt_templates"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PromptVersionRegistry:
    """In-memory + DB-backed prompt version registry."""

    def __init__(self) -> None:
        self.db = get_database()
        self._active_versions: dict[str, dict[str, Any]] = {}

    def initialize(self) -> None:
        """Load prompt templates and upsert active prompt versions."""
        try:
            self.db.prompt_versions.create_index([("scenario", 1)], unique=True)
            self.db.prompt_logs.create_index([("visit_id", 1), ("phase", 1), ("created_at", -1)])
            self.db.intake_logs.create_index([("visit_id", 1), ("patient_id", 1)], unique=True)
        except Exception:
            logger.exception("prompt_registry_index_init_failed")
        for scenario in PROMPT_SCENARIOS:
            try:
                template = self._read_template_for_scenario(scenario)
                self.create_prompt_version(scenario=scenario, template=template)
            except Exception:
                # Fail-safe startup: runtime can still proceed using template file fallback.
                logger.exception("prompt_version_init_failed scenario=%s", scenario)

    def get_active_prompt(self, scenario: str) -> dict[str, Any]:
        """Get active prompt version for scenario from runtime cache."""
        active = self._active_versions.get(scenario)
        if active:
            return active
        doc = self.db.prompt_versions.find_one({"scenario": scenario}, sort=[("updated_at", -1)]) or {}
        versions = doc.get("versions") or []
        selected = next((item for item in versions if item.get("is_current")), None)
        if selected:
            self._active_versions[scenario] = selected
            return selected
        template = self._read_template_for_scenario(scenario)
        # Fail-safe fallback when DB is empty/corrupt.
        return {
            "version": "v1.0.0",
            "template_hash": hashlib.sha256(template.encode("utf-8")).hexdigest(),
            "template_content": template,
            "is_current": True,
            "major_version": 1,
            "minor_version": 0,
            "version_number": 0,
            "git_commit": "",
            "created_at": _utc_now(),
        }

    def create_prompt_version(self, *, scenario: str, template: str) -> dict[str, Any]:
        """Create a new version if template changed, otherwise keep current."""
        template_hash = hashlib.sha256(template.encode("utf-8")).hexdigest()
        now = _utc_now()
        doc = self.db.prompt_versions.find_one({"scenario": scenario}) or {"scenario": scenario, "versions": []}
        versions = list(doc.get("versions") or [])
        current = next((item for item in versions if item.get("is_current")), None)
        if current and current.get("template_hash") == template_hash:
            self._active_versions[scenario] = current
            return current

        version_number = int(current.get("version_number", 0) if current else 0) + 1
        major_version = int(current.get("major_version", 1) if current else 1)
        minor_version = int(current.get("minor_version", -1) if current else -1) + 1
        new_version = {
            "version": f"v{major_version}.{minor_version}.{version_number}",
            "template_hash": template_hash,
            "template_content": template,
            "is_current": True,
            "major_version": major_version,
            "minor_version": minor_version,
            "version_number": version_number,
            "git_commit": "",
            "created_at": now,
        }

        for item in versions:
            item["is_current"] = False
        versions.append(new_version)

        self.db.prompt_versions.update_one(
            {"scenario": scenario},
            {"$set": {"scenario": scenario, "versions": versions, "updated_at": now}, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        self._active_versions[scenario] = new_version
        return new_version

    @staticmethod
    def _read_template_for_scenario(scenario: str) -> str:
        filename = PROMPT_FILES.get(scenario)
        if not filename:
            raise ValueError(f"Unknown prompt scenario: {scenario}")
        return (PROMPT_TEMPLATE_DIR / filename).read_text(encoding="utf-8")


prompt_registry = PromptVersionRegistry()


def get_active_prompt(scenario: str) -> dict[str, Any]:
    """Fetch active prompt from runtime registry with DB/template fallback."""
    return prompt_registry.get_active_prompt(scenario)


def create_prompt_version(scenario: str, template: str) -> dict[str, Any]:
    """Create or reuse prompt version for scenario."""
    return prompt_registry.create_prompt_version(scenario=scenario, template=template)


def callLLMWithTelemetry(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Centralized LLM call with latency, errors, and prompt_version metadata.

    Expected payload keys: scenario, messages, model_config.
    """
    scenario = str(payload.get("scenario") or "").strip()
    messages = payload.get("messages") or []
    model_config = payload.get("model_config") or {}
    start = time.perf_counter()
    client = OpenAIQuestionClient()
    settings = get_settings()
    response_text = ""
    error_message = ""
    status = "success"
    try:
        prompt_text = "\n".join(str(item.get("content", "")) for item in messages if isinstance(item, dict))
        response_text = client._chat_completion(
            prompt=prompt_text,
            system_role=str(model_config.get("system_role") or "You are a helpful medical AI assistant."),
        )
    except Exception as exc:
        status = "failed"
        error_message = str(exc)
    latency_ms = int((time.perf_counter() - start) * 1000)
    return {
        "status": status,
        "response_text": response_text,
        "error": error_message,
        "latency_ms": latency_ms,
        "model": str(model_config.get("model") or settings.openai_model),
        "scenario": scenario,
    }


def execute_prompt(*, scenario: str, messages: list[dict[str, str]], metadata: dict[str, Any]) -> dict[str, Any]:
    """Execute active prompt through gateway and write prompt_logs."""
    db = get_database()
    active_prompt = get_active_prompt(scenario)
    prompt_version = str(active_prompt.get("version") or "")
    template = str(active_prompt.get("template_content") or "")
    rendered_segments: list[str] = [template]
    for message in messages:
        rendered_segments.append(f"{message.get('role', 'user')}: {message.get('content', '')}")
    final_prompt = "\n\n".join(rendered_segments)
    llm_result = callLLMWithTelemetry(
        {
            "scenario": scenario,
            "messages": [{"role": "user", "content": final_prompt}],
            "model_config": {
                "model": metadata.get("model"),
                "system_role": metadata.get("system_role"),
            },
        }
    )
    response_payload: dict[str, Any]
    if llm_result["status"] == "success":
        try:
            response_payload = {"raw": llm_result["response_text"], "json": json.loads(llm_result["response_text"])}
        except json.JSONDecodeError:
            response_payload = {"raw": llm_result["response_text"]}
    else:
        response_payload = {"error": llm_result["error"]}

    phase = PROMPT_PHASE_MAP.get(scenario, scenario)
    log_doc = {
        "visit_id": str(metadata.get("visit_id") or ""),
        "patient_id": str(metadata.get("patient_id") or ""),
        "phase": phase,
        "agent_name": str(metadata.get("agent_name") or "llm_gateway"),
        "prompt_payload": {"messages": messages, "final_prompt": final_prompt},
        "response_payload": response_payload,
        "metadata": {
            **metadata,
            "prompt_version": prompt_version,
            "template_hash": active_prompt.get("template_hash"),
            "latency_ms": llm_result["latency_ms"],
            "status": llm_result["status"],
            "error": llm_result["error"],
        },
        "created_at": _utc_now(),
    }
    try:
        db.prompt_logs.insert_one(log_doc)
    except Exception:
        # Reliability rule: logging should never break main flow.
        logger.exception("prompt_log_insert_failed scenario=%s", scenario)

    return {
        "status": llm_result["status"],
        "phase": phase,
        "prompt_version": prompt_version,
        "latency_ms": llm_result["latency_ms"],
        "response_text": llm_result["response_text"],
        "response_payload": response_payload,
        "error": llm_result["error"],
    }
