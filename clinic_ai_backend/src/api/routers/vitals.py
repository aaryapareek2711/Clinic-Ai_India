"""Vitals routes module."""
from fastapi import APIRouter, Body, Depends, HTTPException

from src.adapters.db.mongo.client import get_database
from src.api.deps import get_current_user
from src.api.tenant_scope import ensure_patient_owned_by_doctor, normalize_doctor_id
from src.api.schemas.vitals import (
    LatestVitalsResponse,
    PatientLookupRequest,
    PatientLookupResponse,
    VITALS_SUBMIT_OPENAPI_EXAMPLES,
    VitalsFormResponse,
    VitalsSubmitRequest,
    VitalsSubmitResponse,
    VitalsSubmitTemplateResponse,
)
from src.application.use_cases.store_vitals import StoreVitalsUseCase
from src.application.utils.patient_id_crypto import encode_patient_id, resolve_internal_patient_id

router = APIRouter(prefix="/api/vitals", tags=["Workflow"])


@router.post("/lookup-patient", response_model=PatientLookupResponse)
def lookup_patient(
    payload: PatientLookupRequest,
    current_user: dict = Depends(get_current_user),
) -> PatientLookupResponse:
    """Lookup patient from entered name and phone number."""
    try:
        doctor_key = normalize_doctor_id(current_user)
        patient = StoreVitalsUseCase().lookup_patient(
            payload.name, payload.phone_number, doctor_id=doctor_key
        )
        ensure_patient_owned_by_doctor(
            get_database(),
            doctor_key,
            str(patient["patient_id"]),
        )
        return PatientLookupResponse(
            patient_id=encode_patient_id(str(patient["patient_id"])),
            visit_id=patient.get("latest_visit_id"),
            name=patient["name"],
            phone_number=patient["phone_number"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/generate-form/{patient_id}/{visit_id}", response_model=VitalsFormResponse)
def generate_vitals_form(
    patient_id: str,
    visit_id: str,
    current_user: dict = Depends(get_current_user),
) -> VitalsFormResponse:
    """Generate vitals form only if context indicates need."""
    try:
        internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
        ensure_patient_owned_by_doctor(get_database(), normalize_doctor_id(current_user), internal_patient_id)
        doc = StoreVitalsUseCase().generate_vitals_form(internal_patient_id, visit_id)
        if doc.get("patient_id"):
            doc["patient_id"] = encode_patient_id(str(doc["patient_id"]))
        return VitalsFormResponse(**doc)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/submit", response_model=VitalsSubmitResponse)
def submit_vitals(
    payload: VitalsSubmitRequest = Body(..., openapi_examples=VITALS_SUBMIT_OPENAPI_EXAMPLES),
    current_user: dict = Depends(get_current_user),
) -> VitalsSubmitResponse:
    """Submit vitals values captured by hospital staff.

    Keys in `values` come from `POST .../generate-form` response `fields` for that visit (not a global template).
    """
    try:
        internal_patient_id = resolve_internal_patient_id(payload.patient_id, allow_raw_fallback=True)
        ensure_patient_owned_by_doctor(get_database(), normalize_doctor_id(current_user), internal_patient_id)
        doc = StoreVitalsUseCase().submit_vitals(
            patient_id=internal_patient_id,
            visit_id=payload.visit_id,
            form_id=payload.form_id,
            staff_name=payload.staff_name,
            values=payload.values_as_dict(),
        )
        return VitalsSubmitResponse(
            vitals_id=doc["vitals_id"],
            patient_id=encode_patient_id(str(doc["patient_id"])),
            visit_id=doc.get("visit_id"),
            submitted_at=doc["submitted_at"],
        )
    except ValueError as exc:
        detail = str(exc)
        status = 422 if detail.startswith(("Missing required", "Vitals form not", "Stored vitals")) else 404
        raise HTTPException(status_code=status, detail=detail) from exc


@router.get("/submit-template/{patient_id}/{visit_id}", response_model=VitalsSubmitTemplateResponse)
def get_submit_template(
    patient_id: str,
    visit_id: str,
    current_user: dict = Depends(get_current_user),
) -> VitalsSubmitTemplateResponse:
    """
    Build a submit template with exact keys from latest vitals form.

    This avoids manual key editing in Swagger/UI. Staff only fill `staff_name` and `value`s.
    """
    try:
        internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
        ensure_patient_owned_by_doctor(get_database(), normalize_doctor_id(current_user), internal_patient_id)
        doc = StoreVitalsUseCase().build_submit_template(internal_patient_id, visit_id)
        if doc.get("patient_id"):
            doc["patient_id"] = encode_patient_id(str(doc["patient_id"]))
        return VitalsSubmitTemplateResponse(**doc)
    except ValueError as exc:
        detail = str(exc)
        status = 422 if detail.startswith(("Vitals form not", "Stored vitals")) else 404
        raise HTTPException(status_code=status, detail=detail) from exc


@router.get("/latest/{patient_id}/{visit_id}", response_model=LatestVitalsResponse)
def get_latest_vitals(
    patient_id: str,
    visit_id: str,
    current_user: dict = Depends(get_current_user),
) -> LatestVitalsResponse:
    """Get latest submitted vitals for patient."""
    internal_patient_id = resolve_internal_patient_id(patient_id, allow_raw_fallback=True)
    ensure_patient_owned_by_doctor(get_database(), normalize_doctor_id(current_user), internal_patient_id)
    doc = StoreVitalsUseCase().get_latest_vitals(internal_patient_id, visit_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Vitals not found")
    if doc.get("patient_id"):
        doc["patient_id"] = encode_patient_id(str(doc["patient_id"]))
    return LatestVitalsResponse(**doc)
