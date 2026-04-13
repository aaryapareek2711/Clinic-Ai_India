"""Workflow routes module."""
from fastapi import APIRouter, HTTPException

from src.adapters.db.mongo.client import get_database
from src.api.schemas.workflow import PreVisitSummaryResponse
from src.application.use_cases.generate_pre_visit_summary import GeneratePreVisitSummaryUseCase

router = APIRouter(prefix="/workflow", tags=["Workflow"])


@router.post("/pre-visit-summary/{patient_id}", response_model=PreVisitSummaryResponse)
def generate_pre_visit_summary(patient_id: str) -> PreVisitSummaryResponse:
    """Generate pre-visit summary for latest intake session."""
    try:
        doc = GeneratePreVisitSummaryUseCase().execute(patient_id=patient_id)
        return PreVisitSummaryResponse(**doc)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/pre-visit-summary/{patient_id}", response_model=PreVisitSummaryResponse)
def get_latest_pre_visit_summary(patient_id: str) -> PreVisitSummaryResponse:
    """Fetch latest generated pre-visit summary by patient."""
    db = get_database()
    doc = db.pre_visit_summaries.find_one({"patient_id": patient_id}, sort=[("updated_at", -1)])
    if not doc:
        raise HTTPException(status_code=404, detail="Pre-visit summary not found")
    doc.pop("_id", None)
    return PreVisitSummaryResponse(**doc)
