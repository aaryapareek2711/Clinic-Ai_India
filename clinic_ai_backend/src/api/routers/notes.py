"""Clinical notes routes module."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from src.adapters.db.mongo.repositories.clinical_note_repository import ClinicalNoteRepository
from src.api.schemas.notes import (
    NoteGenerateRequest,
    NoteGenerateResponse,
    NoteType,
    PostVisitWhatsAppSendRequest,
    PostVisitWhatsAppSendResponse,
)
from src.application.use_cases.generate_india_clinical_note import GenerateIndiaClinicalNoteUseCase
from src.application.use_cases.generate_post_visit_summary import GeneratePostVisitSummaryUseCase
from src.application.use_cases.generate_soap_note import GenerateSoapNoteUseCase
from src.application.use_cases.send_post_visit_summary_whatsapp_to_patient import (
    send_latest_post_visit_summary_whatsapp_to_patient,
)
from src.core.config import get_settings

router = APIRouter(prefix="/api/notes", tags=["Notes"])


@router.post("/clinical-note", response_model=NoteGenerateResponse)
def generate_clinical_note(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate clinical note (default note type)."""
    default_type = get_settings().default_note_type
    note_type: NoteType = request.note_type or default_type
    return _generate_by_type(note_type=note_type, request=request)


def generate_india_note(request: NoteGenerateRequest) -> NoteGenerateResponse:
    """Generate India clinical note explicitly."""
    doc = GenerateIndiaClinicalNoteUseCase().execute(
        patient_id=request.patient_id,
        visit_id=request.visit_id,
        transcription_job_id=request.transcription_job_id,
        force_regenerate=True,
        follow_up_date=request.follow_up_date,
    )
    return NoteGenerateResponse(**doc)


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
            follow_up_date=request.follow_up_date,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 422 if "preferred_language" in detail else 404
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return NoteGenerateResponse(**doc)


@router.get("/clinical-note", response_model=NoteGenerateResponse)
def get_latest_clinical_note(
    patient_id: str = Query(min_length=1),
    visit_id: str = Query(min_length=1),
    note_type: NoteType | None = Query(
        default=None,
        description="When set, fetch latest note of this type (e.g. soap). Otherwise uses server default_note_type.",
    ),
) -> NoteGenerateResponse:
    """Fetch latest clinical note for a patient visit."""
    resolved_type: NoteType = note_type or get_settings().default_note_type
    note = ClinicalNoteRepository().find_latest(
        patient_id=patient_id,
        visit_id=visit_id,
        note_type=resolved_type,
    )
    if not note:
        raise HTTPException(status_code=404, detail=f"No {resolved_type} note found")
    note.pop("_id", None)
    return NoteGenerateResponse(**note)


@router.post(
    "/post-visit-summary/send-whatsapp",
    response_model=PostVisitWhatsAppSendResponse,
    summary="Send stored post-visit summary to patient WhatsApp",
)
def send_post_visit_summary_whatsapp_route(
    body: PostVisitWhatsAppSendRequest,
) -> PostVisitWhatsAppSendResponse:
    """Send latest saved post-visit summary template plus immediate Meta follow-up template."""
    try:
        result = send_latest_post_visit_summary_whatsapp_to_patient(
            patient_id=body.patient_id,
            visit_id=body.visit_id,
            phone_number_override=body.phone_number,
        )
        return PostVisitWhatsAppSendResponse(**result)
    except ValueError as exc:
        detail = str(exc)
        if "No post_visit_summary" in detail:
            raise HTTPException(status_code=404, detail=detail) from exc
        if "Patient not found" in detail:
            raise HTTPException(status_code=404, detail=detail) from exc
        if "no phone number" in detail.lower():
            raise HTTPException(status_code=422, detail=detail) from exc
        raise HTTPException(status_code=400, detail=detail) from exc


@router.get("/post-visit-summary", response_model=NoteGenerateResponse)
def get_latest_post_visit_summary(
    patient_id: str = Query(min_length=1),
    visit_id: str = Query(min_length=1),
) -> NoteGenerateResponse:
    """Fetch latest post-visit summary note for a patient visit."""
    note = ClinicalNoteRepository().find_latest(
        patient_id=patient_id,
        visit_id=visit_id,
        note_type="post_visit_summary",
    )
    if not note:
        raise HTTPException(status_code=404, detail="No post_visit_summary note found")
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
            force_regenerate=request.follow_up_date is not None,
            follow_up_date=request.follow_up_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return NoteGenerateResponse(**doc)
