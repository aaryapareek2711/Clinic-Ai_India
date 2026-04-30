"""Intake and AI flow schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class IntakeAnswerRequest(BaseModel):
    """Request payload for intake answer submission."""

    visit_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class IntakeStatusRequest(BaseModel):
    """Request payload for intake status fetch."""

    visit_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)


class PromptedGenerationRequest(BaseModel):
    """Request payload for summary and SOAP generation APIs."""

    visit_id: str = Field(..., min_length=1)
    patient_id: str = Field(..., min_length=1)
    context: dict = Field(default_factory=dict)


class IntakeQuestionAnswer(BaseModel):
    """Stored intake question/answer entry."""

    question: str
    answer: str
    timestamp: str
    question_number: int


class IntakeStatusResponse(BaseModel):
    """Intake state snapshot."""

    id: str | None = None
    visit_id: str
    patient_id: str
    status: str
    questions_asked: list[IntakeQuestionAnswer] = Field(default_factory=list)
    pending_question: str | None = None
    current_question_count: int = 0
    max_questions: int = 0
    asked_categories: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None


class PromptExecutionResponse(BaseModel):
    """Response for prompt-backed generation endpoints."""

    visit_id: str
    patient_id: str
    scenario: str
    prompt_version: str
    status: str
    phase: str
    latency_ms: int
    response_payload: dict
    error: str = ""
