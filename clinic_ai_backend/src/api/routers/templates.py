"""Template library routes for clinical note snippets."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from src.adapters.db.mongo.client import get_database

router = APIRouter(prefix="/api/templates", tags=["Templates"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    data = dict(doc)
    data.pop("_id", None)
    return data


@router.post("")
def create_template(body: dict[str, Any]) -> dict[str, Any]:
    db = get_database()
    now = _utc_now()
    template_id = str(body.get("id") or uuid4())
    doc = {
        "id": template_id,
        "name": str(body.get("name") or "").strip(),
        "description": str(body.get("description") or "").strip(),
        "type": str(body.get("type") or "personal").strip() or "personal",
        "category": str(body.get("category") or "General").strip() or "General",
        "specialty": str(body.get("specialty") or "").strip(),
        "content": dict(body.get("content") or {}),
        "tags": list(body.get("tags") or []),
        "appointment_types": list(body.get("appointment_types") or []),
        "is_favorite": bool(body.get("is_favorite") or False),
        "author_id": str(body.get("author_id") or "current_user"),
        "author_name": str(body.get("author_name") or "You"),
        "usage_count": 0,
        "last_used": None,
        "created_at": now,
        "updated_at": now,
        "is_active": True,
    }
    if not doc["name"]:
        raise HTTPException(status_code=422, detail="Template name is required")
    db.templates.insert_one(doc)
    return _serialize(doc)


@router.get("")
def list_templates(
    type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    specialty: str | None = Query(default=None),
    search: str | None = Query(default=None),
    is_favorite: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
) -> dict[str, Any]:
    db = get_database()
    query: dict[str, Any] = {"is_active": {"$ne": False}}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if specialty:
        query["specialty"] = specialty
    if is_favorite is not None:
        query["is_favorite"] = is_favorite
    if search and search.strip():
        s = search.strip()
        query["$or"] = [
            {"name": {"$regex": s, "$options": "i"}},
            {"description": {"$regex": s, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": s, "$options": "i"}}},
        ]

    skip = (page - 1) * page_size
    cursor = db.templates.find(query).sort("updated_at", -1).skip(skip).limit(page_size)
    items = [_serialize(dict(item)) for item in cursor]
    total = db.templates.count_documents(query)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{template_id}")
def get_template(template_id: str) -> dict[str, Any]:
    db = get_database()
    doc = db.templates.find_one({"id": template_id, "is_active": {"$ne": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    return _serialize(dict(doc))


@router.put("/{template_id}")
def update_template(template_id: str, body: dict[str, Any]) -> dict[str, Any]:
    db = get_database()
    existing = db.templates.find_one({"id": template_id, "is_active": {"$ne": False}})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    patch = dict(body)
    patch["updated_at"] = _utc_now()
    db.templates.update_one({"id": template_id}, {"$set": patch})
    updated = db.templates.find_one({"id": template_id})
    return _serialize(dict(updated or {}))


@router.delete("/{template_id}")
def delete_template(template_id: str) -> dict[str, Any]:
    db = get_database()
    result = db.templates.update_one({"id": template_id}, {"$set": {"is_active": False, "updated_at": _utc_now()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"ok": True}


@router.post("/{template_id}/use")
def record_template_usage(template_id: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    db = get_database()
    now = _utc_now()
    result = db.templates.update_one(
        {"id": template_id, "is_active": {"$ne": False}},
        {"$inc": {"usage_count": 1}, "$set": {"last_used": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    if body:
        db.template_usage_events.insert_one(
            {
                "template_id": template_id,
                "visit_id": body.get("visit_id"),
                "patient_id": body.get("patient_id"),
                "created_at": now,
            }
        )
    return {"ok": True}


@router.post("/{template_id}/favorite")
def toggle_template_favorite(template_id: str) -> dict[str, Any]:
    db = get_database()
    doc = db.templates.find_one({"id": template_id, "is_active": {"$ne": False}})
    if not doc:
        raise HTTPException(status_code=404, detail="Template not found")
    next_value = not bool(doc.get("is_favorite"))
    db.templates.update_one({"id": template_id}, {"$set": {"is_favorite": next_value, "updated_at": _utc_now()}})
    return {"id": template_id, "is_favorite": next_value}
