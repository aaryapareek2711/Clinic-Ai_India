"""Multi-clinician tenant helpers: patients and visits scoped by doctor_id."""
from __future__ import annotations

from fastapi import HTTPException

def normalize_doctor_id(user: dict) -> str:
    """Return canonical DOCxxx for clinicians; 403 if missing."""
    did = str(user.get("doctor_id") or "").strip().upper()
    if not did:
        raise HTTPException(
            status_code=403,
            detail="Your account does not have a clinician ID; cannot access patient data.",
        )
    return did


def assert_provider_matches_user(provider_id: str, user: dict) -> str:
    """URL provider_id must match the signed-in clinician."""
    doctor_id = normalize_doctor_id(user)
    path_id = str(provider_id or "").strip().upper()
    if path_id != doctor_id:
        raise HTTPException(status_code=403, detail="Provider does not match the signed-in clinician.")
    return doctor_id


def patient_ids_for_doctor(db, doctor_id: str) -> list[str]:
    out: list[str] = []
    for row in db.patients.find({"doctor_id": doctor_id}, {"patient_id": 1}):
        pid = str(row.get("patient_id") or "").strip()
        if pid:
            out.append(pid)
    return out


def visit_filter_for_doctor(db, doctor_id: str) -> dict:
    """Mongo fragment for visits: only patients owned by this doctor."""
    ids = patient_ids_for_doctor(db, doctor_id)
    return {"patient_id": {"$in": ids}}


def ensure_patient_owned_by_doctor(db, doctor_id: str, internal_patient_id: str) -> None:
    """404 if missing or owned by another clinician (do not reveal existence)."""
    doc = db.patients.find_one({"patient_id": internal_patient_id}, {"doctor_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    pdid = str(doc.get("doctor_id") or "").strip().upper()
    if not pdid or pdid != doctor_id:
        raise HTTPException(status_code=404, detail="Patient not found")


def ensure_visit_owned_by_doctor(db, doctor_id: str, visit: dict) -> None:
    pid = str(visit.get("patient_id") or "").strip()
    if not pid:
        raise HTTPException(status_code=404, detail="Visit not found")
    ensure_patient_owned_by_doctor(db, doctor_id, pid)


def merge_patient_search_with_doctor(search_clause: dict, doctor_id: str) -> dict:
    """AND doctor scope onto a patient collection query."""
    return {"$and": [search_clause, {"doctor_id": doctor_id}]}
