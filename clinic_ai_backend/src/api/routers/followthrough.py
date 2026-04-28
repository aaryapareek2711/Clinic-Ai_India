"""Follow-through and lab pipeline routes."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.adapters.db.mongo.client import get_database
from src.application.utils.patient_id_crypto import encode_patient_id

router = APIRouter(prefix="/api/follow-through", tags=["Follow-through"])


class CreateLabRecordRequest(BaseModel):
    visit_id: str = Field(min_length=1)
    source: str = Field(default="whatsapp", min_length=1, max_length=50)
    raw_text: str = Field(min_length=1)


class ReviewLabRecordRequest(BaseModel):
    decision: str = Field(default="approved", min_length=1, max_length=50)
    notes: str | None = None


class ContinuityUpdateRequest(BaseModel):
    continuity_summary: str = Field(min_length=1)
    mark_visit_completed: bool = True


def _to_iso(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _extract_numeric_flags(raw_text: str) -> tuple[list[dict], list[str]]:
    values: list[dict] = []
    flags: list[str] = []
    for match in re.finditer(r"([A-Za-z ]{2,30})[:= -]*([0-9]+(?:\.[0-9]+)?)", raw_text):
        label = re.sub(r"\s+", " ", match.group(1)).strip()
        value = float(match.group(2))
        values.append({"label": label, "value": value})
        lowered = label.lower()
        if ("glucose" in lowered or "sugar" in lowered) and value > 200:
            flags.append(f"{label} high ({value})")
        if ("oxygen" in lowered or "spo2" in lowered) and value < 92:
            flags.append(f"{label} low ({value})")
    return values, flags


def _public_lab_record(doc: dict) -> dict:
    patient_id = str(doc.get("patient_id") or "")
    return {
        "record_id": str(doc.get("record_id") or ""),
        "visit_id": str(doc.get("visit_id") or ""),
        "patient_id": encode_patient_id(patient_id) if patient_id else "",
        "source": str(doc.get("source") or "whatsapp"),
        "status": str(doc.get("status") or "received"),
        "raw_text": str(doc.get("raw_text") or ""),
        "extracted_values": doc.get("extracted_values") or [],
        "flags": doc.get("flags") or [],
        "doctor_decision": doc.get("doctor_decision"),
        "doctor_notes": doc.get("doctor_notes"),
        "continuity_summary": doc.get("continuity_summary"),
        "created_at": _to_iso(doc.get("created_at")),
        "updated_at": _to_iso(doc.get("updated_at")),
    }


@router.post("/lab-records")
def create_lab_record(payload: CreateLabRecordRequest) -> dict:
    db = get_database()
    visit = db.visits.find_one({"visit_id": payload.visit_id}) or db.visits.find_one({"id": payload.visit_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    now = datetime.now(timezone.utc)
    record = {
        "record_id": f"LAB-{uuid4()}",
        "visit_id": str(visit.get("visit_id") or visit.get("id") or payload.visit_id),
        "patient_id": str(visit.get("patient_id") or ""),
        "source": payload.source,
        "status": "received",
        "raw_text": payload.raw_text,
        "extracted_values": [],
        "flags": [],
        "doctor_decision": None,
        "doctor_notes": None,
        "continuity_summary": None,
        "created_at": now,
        "updated_at": now,
    }
    db.follow_through_lab_records.insert_one(record)
    return _public_lab_record(record)


@router.get("/lab-queue")
def list_lab_queue(status: str | None = Query(default=None)) -> dict:
    db = get_database()
    query: dict = {}
    if status:
        query["status"] = status
    records = list(db.follow_through_lab_records.find(query, {"_id": 0}))
    records.sort(key=lambda item: item.get("updated_at") or item.get("created_at") or datetime.min, reverse=True)
    return {"items": [_public_lab_record(item) for item in records]}


@router.post("/lab-records/{record_id}/extract")
def extract_lab_record(record_id: str) -> dict:
    db = get_database()
    record = db.follow_through_lab_records.find_one({"record_id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Lab record not found")

    values, flags = _extract_numeric_flags(str(record.get("raw_text") or ""))
    db.follow_through_lab_records.update_one(
        {"record_id": record_id},
        {
            "$set": {
                "status": "extracted",
                "extracted_values": values,
                "flags": flags,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    updated = db.follow_through_lab_records.find_one({"record_id": record_id}) or {}
    return _public_lab_record(updated)


@router.post("/lab-records/{record_id}/review")
def review_lab_record(record_id: str, payload: ReviewLabRecordRequest) -> dict:
    db = get_database()
    record = db.follow_through_lab_records.find_one({"record_id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Lab record not found")

    decision = payload.decision.strip().lower()
    if decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=422, detail="decision must be approved or rejected")
    status_value = "doctor_reviewed" if decision == "approved" else "review_rejected"
    db.follow_through_lab_records.update_one(
        {"record_id": record_id},
        {
            "$set": {
                "status": status_value,
                "doctor_decision": decision,
                "doctor_notes": payload.notes,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    updated = db.follow_through_lab_records.find_one({"record_id": record_id}) or {}
    return _public_lab_record(updated)


@router.post("/lab-records/{record_id}/continuity-update")
def update_continuity(record_id: str, payload: ContinuityUpdateRequest) -> dict:
    db = get_database()
    record = db.follow_through_lab_records.find_one({"record_id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Lab record not found")

    now = datetime.now(timezone.utc)
    db.follow_through_lab_records.update_one(
        {"record_id": record_id},
        {"$set": {"status": "continuity_updated", "continuity_summary": payload.continuity_summary, "updated_at": now}},
    )
    if payload.mark_visit_completed:
        visit_id = str(record.get("visit_id") or "")
        if visit_id:
            db.visits.update_one(
                {"visit_id": visit_id},
                {"$set": {"status": "completed", "actual_end": now, "updated_at": now}},
            )
            db.visits.update_one(
                {"id": visit_id},
                {"$set": {"status": "completed", "actual_end": now, "updated_at": now}},
            )

    updated = db.follow_through_lab_records.find_one({"record_id": record_id}) or {}
    return _public_lab_record(updated)
