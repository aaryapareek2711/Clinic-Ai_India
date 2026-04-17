"""Clinical notes routes module."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.api.schemas.notes import NoteGenerateRequest, NoteGenerateResponse, NoteType
from src.application.use_cases.generate_india_clinical_note import GenerateIndiaClinicalNoteUseCase
from src.application.use_cases.generate_post_visit_summary import GeneratePostVisitSummaryUseCase
from src.application.use_cases.generate_soap_note import GenerateSoapNoteUseCase
from src.core.config import get_settings

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.post("/generate", response_model=NoteGenerateResponse)
def generate_default_note(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate default note type (India clinical by default)."""
    default_type = get_settings().default_note_type
    note_type: NoteType = request.note_type or default_type
    return _generate_by_type(note_type=note_type, request=request)


@router.post("/india", response_model=NoteGenerateResponse)
def generate_india_note(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate India clinical note explicitly."""
    doc = GenerateIndiaClinicalNoteUseCase().execute(
        patient_id=request.patient_id,
        visit_id=request.visit_id,
        transcription_job_id=request.transcription_job_id,
        force_regenerate=True,
    )
    return NoteGenerateResponse(**doc)


@router.post("/soap", response_model=NoteGenerateResponse)
def generate_soap_note(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate legacy SOAP note explicitly."""
    try:
        doc = GenerateSoapNoteUseCase().execute(
            patient_id=request.patient_id,
            visit_id=request.visit_id,
            transcription_job_id=request.transcription_job_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NoteGenerateResponse(**doc)


@router.post("/post-visit-summary", response_model=NoteGenerateResponse)
def generate_post_visit_summary(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate patient-facing post-visit summary explicitly."""
    try:
        doc = GeneratePostVisitSummaryUseCase().execute(
            patient_id=request.patient_id,
            visit_id=request.visit_id,
            transcription_job_id=request.transcription_job_id,
            preferred_language=request.preferred_language,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 422 if "preferred_language" in detail else 404
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return NoteGenerateResponse(**doc)


@router.get("/latest/by-context", response_model=NoteGenerateResponse)
def get_latest_note(
    patient_id: str = Query(default=""),
    visit_id: str | None = Query(default=None),
    note_type: NoteType | None = Query(default=None),
) -> NoteGenerateResponse:
    """Fetch latest note by optional patient/visit filters."""
    if not patient_id and not visit_id:
        raise HTTPException(status_code=400, detail="Provide patient_id or visit_id")
    note = ClinicalNoteRepository().find_latest(patient_id=patient_id or None, visit_id=visit_id, note_type=note_type)
    if not note:
        raise HTTPException(status_code=404, detail="No matching note found")
    note.pop("_id", None)
    return NoteGenerateResponse(**note)


@router.get("/{note_id}", response_model=NoteGenerateResponse)
def get_note(note_id: str) -> NoteGenerateResponse:
    """Fetch note by ID."""
    note = ClinicalNoteRepository().find_by_note_id(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Clinical note not found")
    note.pop("_id", None)
    return NoteGenerateResponse(**note)


def _generate_by_type(*, note_type: NoteType, request: NoteGenerateRequest) -> NoteGenerateResponse:
    if note_type == "soap":
        return generate_soap_note(request)
    if note_type == "post_visit_summary":
        return generate_post_visit_summary(request)
    try:
        doc = GenerateIndiaClinicalNoteUseCase().execute(
            patient_id=request.patient_id,
            visit_id=request.visit_id,
            transcription_job_id=request.transcription_job_id,
            force_regenerate=False,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NoteGenerateResponse(**doc)
