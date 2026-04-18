"""Vitals routes module."""
from fastapi import APIRouter, HTTPException

from src.api.schemas.vitals import (
    LatestVitalsResponse,
    PatientLookupRequest,
    PatientLookupResponse,
    VitalsFormResponse,
    VitalsSubmitRequest,
    VitalsSubmitResponse,
)
from src.application.use_cases.store_vitals import StoreVitalsUseCase

router = APIRouter(prefix="/vitals", tags=["Workflow"])


@router.post("/lookup-patient", response_model=PatientLookupResponse)
def lookup_patient(payload: PatientLookupRequest) -> PatientLookupResponse:
    """Lookup patient from entered name and phone number."""
    try:
        patient = StoreVitalsUseCase().lookup_patient(payload.name, payload.phone_number)
        return PatientLookupResponse(
            patient_id=patient["patient_id"],
            visit_id=patient.get("latest_visit_id"),
            name=patient["name"],
            phone_number=patient["phone_number"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/generate-form/{patient_id}/{visit_id}", response_model=VitalsFormResponse)
def generate_vitals_form(patient_id: str, visit_id: str) -> VitalsFormResponse:
    """Generate vitals form only if context indicates need."""
    try:
        doc = StoreVitalsUseCase().generate_vitals_form(patient_id, visit_id)
        return VitalsFormResponse(**doc)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/submit", response_model=VitalsSubmitResponse)
def submit_vitals(payload: VitalsSubmitRequest) -> VitalsSubmitResponse:
    """Submit vitals values captured by hospital staff."""
    try:
        doc = StoreVitalsUseCase().submit_vitals(
            patient_id=payload.patient_id,
            visit_id=payload.visit_id,
            form_id=payload.form_id,
            staff_name=payload.staff_name,
            values=payload.values,
        )
        return VitalsSubmitResponse(
            vitals_id=doc["vitals_id"],
            patient_id=doc["patient_id"],
            visit_id=doc.get("visit_id"),
            submitted_at=doc["submitted_at"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/latest/{patient_id}/{visit_id}", response_model=LatestVitalsResponse)
def get_latest_vitals(patient_id: str, visit_id: str) -> LatestVitalsResponse:
    """Get latest submitted vitals for patient."""
    doc = StoreVitalsUseCase().get_latest_vitals(patient_id, visit_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Vitals not found")
    return LatestVitalsResponse(**doc)
