"""Visit routes module."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from src.adapters.db.mongo.client import get_database

router = APIRouter(prefix="/api/visits", tags=["Visits"])


@router.get("/{visit_id}")
def get_visit(visit_id: str) -> dict:
    """Return visit details for visit workflow page."""
    db = get_database()
    visit = db.visits.find_one({"visit_id": visit_id}, {"_id": 0})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    patient_id = str(visit.get("patient_id") or "")
    patient = db.patients.find_one({"patient_id": patient_id}, {"_id": 0}) or {}
    full_name = (patient.get("name") or "").strip()
    name_parts = [part for part in full_name.split(" ") if part]
    first_name = name_parts[0] if name_parts else "Patient"
    last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
    age = patient.get("age")
    year = datetime.now(timezone.utc).year - age if isinstance(age, int) and age > 0 else 1970

    return {
        "id": str(visit.get("visit_id") or visit_id),
        "patient_id": patient_id,
        "provider_id": str(visit.get("provider_id") or ""),
        "appointment_id": visit.get("appointment_id"),
        "visit_type": str(visit.get("visit_type") or "Visit"),
        "status": str(visit.get("status") or "open"),
        "chief_complaint": visit.get("chief_complaint"),
        "reason_for_visit": visit.get("reason_for_visit"),
        "scheduled_start": visit.get("scheduled_start"),
        "actual_start": visit.get("actual_start"),
        "subjective": visit.get("subjective"),
        "objective": visit.get("objective"),
        "assessment": visit.get("assessment"),
        "plan": visit.get("plan"),
        "patient": {
            "id": patient_id,
            "first_name": first_name,
            "last_name": last_name,
            "date_of_birth": str(patient.get("date_of_birth") or f"{year:04d}-01-01"),
            "gender": str(patient.get("gender") or "unknown"),
        },
    }
