"""AI intake and prompt execution endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas.intake import (
    IntakeAnswerRequest,
    IntakeStatusResponse,
    PromptExecutionResponse,
    PromptedGenerationRequest,
)
from src.application.use_cases.answer_intake import AnswerIntakeUseCase
from src.core.ai_factory import execute_prompt

router = APIRouter(tags=["AI Intake"])


@router.post("/intake/answer", response_model=IntakeStatusResponse)
def answer_intake(body: IntakeAnswerRequest) -> IntakeStatusResponse:
    """Append intake answer and generate next question."""
    use_case = AnswerIntakeUseCase()
    state = use_case.log_intake_answer(
        visit_id=body.visit_id,
        patient_id=body.patient_id,
        answer=body.answer,
    )
    if not state:
        raise HTTPException(status_code=500, detail="Unable to persist intake answer")
    return IntakeStatusResponse(**state)


@router.get("/intake/status", response_model=IntakeStatusResponse)
def intake_status(visit_id: str = Query(min_length=1), patient_id: str = Query(min_length=1)) -> IntakeStatusResponse:
    """Fetch current intake session state."""
    use_case = AnswerIntakeUseCase()
    state = use_case.get_status(visit_id=visit_id, patient_id=patient_id)
    if not state:
        raise HTTPException(status_code=404, detail="Intake session not found")
    return IntakeStatusResponse(**state)


@router.post("/summary/previsit", response_model=PromptExecutionResponse)
def generate_previsit(body: PromptedGenerationRequest) -> PromptExecutionResponse:
    """Generate pre-visit summary via centralized gateway."""
    result = execute_prompt(
        scenario="previsit",
        messages=[{"role": "user", "content": f"Create pre-visit summary from context: {body.context}"}],
        metadata={"visit_id": body.visit_id, "patient_id": body.patient_id, "agent_name": "previsit_summary_agent"},
    )
    return PromptExecutionResponse(
        visit_id=body.visit_id,
        patient_id=body.patient_id,
        scenario="previsit",
        prompt_version=result["prompt_version"],
        status=result["status"],
        phase=result["phase"],
        latency_ms=result["latency_ms"],
        response_payload=result["response_payload"],
        error=result["error"],
    )


@router.post("/soap/generate", response_model=PromptExecutionResponse)
def generate_soap(body: PromptedGenerationRequest) -> PromptExecutionResponse:
    """Generate SOAP note via centralized gateway."""
    result = execute_prompt(
        scenario="soap",
        messages=[{"role": "user", "content": f"Create SOAP note from context: {body.context}"}],
        metadata={"visit_id": body.visit_id, "patient_id": body.patient_id, "agent_name": "soap_generation_agent"},
    )
    return PromptExecutionResponse(
        visit_id=body.visit_id,
        patient_id=body.patient_id,
        scenario="soap",
        prompt_version=result["prompt_version"],
        status=result["status"],
        phase=result["phase"],
        latency_ms=result["latency_ms"],
        response_payload=result["response_payload"],
        error=result["error"],
    )


@router.post("/summary/postvisit", response_model=PromptExecutionResponse)
def generate_postvisit(body: PromptedGenerationRequest) -> PromptExecutionResponse:
    """Generate post-visit summary via centralized gateway."""
    result = execute_prompt(
        scenario="postvisit",
        messages=[{"role": "user", "content": f"Create post-visit summary from context: {body.context}"}],
        metadata={"visit_id": body.visit_id, "patient_id": body.patient_id, "agent_name": "postvisit_summary_agent"},
    )
    return PromptExecutionResponse(
        visit_id=body.visit_id,
        patient_id=body.patient_id,
        scenario="postvisit",
        prompt_version=result["prompt_version"],
        status=result["status"],
        phase=result["phase"],
        latency_ms=result["latency_ms"],
        response_payload=result["response_payload"],
        error=result["error"],
    )
"""Intake module."""
# TODO: Implement this module.
