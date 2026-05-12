"""Vitals generation and storage use case module."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.application.utils.patient_identity import stable_patient_id
from src.core.vitals_catalog import VITAL_CONTEXT_BY_KEY, normalize_contextual_vital_key

_ALLOWED_FIELD_TYPES = frozenset({"number", "text", "boolean", "select"})
_FIELD_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_MAX_VITAL_FIELDS = 8
# Illness-specific vitals from the model (excluding weight/BP, which are always prepended when vitals are needed).
_MAX_CONTEXTUAL_VITAL_FIELDS = 3

def _one_line_chief_complaint(intake: dict, pre_visit: dict) -> str:
    """Single string tying illness + pre-visit chief for the vitals model."""
    parts: list[str] = []
    illness = intake.get("illness")
    if illness:
        parts.append(str(illness).strip())
    sections = pre_visit.get("sections") if isinstance(pre_visit.get("sections"), dict) else {}
    chief = sections.get("chief_complaint") if isinstance(sections, dict) else None
    if isinstance(chief, dict):
        reason = str(chief.get("reason_for_visit", "") or "").strip()
        if reason:
            parts.append(reason)
    return " | ".join(dict.fromkeys(parts)) if parts else ""


class StoreVitalsUseCase:
    """Handles patient lookup, AI vitals form generation, and submission."""

    def __init__(self) -> None:
        self.db = get_database()
        self.openai = OpenAIQuestionClient()

    def lookup_patient(self, name: str, phone_number: str) -> dict:
        """Find patient for entered name and phone number."""
        patient_id = stable_patient_id(name, phone_number)
        patient = self.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise ValueError("Patient not found for provided name and phone number")
        visit = self.db.visits.find_one({"patient_id": patient_id}, sort=[("created_at", -1)])
        latest_visit_id = str(visit["visit_id"]) if visit else None
        patient.pop("_id", None)
        patient["latest_visit_id"] = latest_visit_id
        return patient

    @staticmethod
    def _sanitize_vitals_fields(fields: Any) -> list[dict[str, Any]]:
        """Normalize AI output: stable keys, valid types, dedupe, cap count."""
        if not isinstance(fields, list):
            return []
        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in fields:
            if len(out) >= _MAX_VITAL_FIELDS:
                break
            if not isinstance(raw, dict):
                continue
            key = str(raw.get("key", "")).strip().lower().replace(" ", "_").replace("-", "_")
            if not key or not _FIELD_KEY_RE.match(key):
                continue
            if key in seen:
                continue
            seen.add(key)
            ft = str(raw.get("field_type", "text")).strip().lower()
            if ft not in _ALLOWED_FIELD_TYPES:
                ft = "text"
            label = str(raw.get("label", key)).strip() or key
            unit = raw.get("unit")
            unit_out: str | None
            if unit in (None, ""):
                unit_out = None
            else:
                unit_out = str(unit).strip()[:32] or None
            out.append(
                {
                    "key": key,
                    "label": label[:120],
                    "field_type": ft,
                    "unit": unit_out,
                    "required": bool(raw.get("required", True)),
                    "reason": str(raw.get("reason", "")).strip()[:400] or "Linked to visit intake context",
                }
            )
        return out

    @staticmethod
    def _fixed_common_vitals_fields() -> list[dict[str, Any]]:
        """Weight and BP are collected for every visit that needs a vitals form (prepended to contextual fields)."""
        return [
            {
                "key": "body_weight_kg",
                "label": "Body weight",
                "field_type": "number",
                "unit": "kg",
                "required": True,
                "reason": "Routine for all OPD visits; supports dosing and risk review.",
            },
            {
                "key": "blood_pressure_mmhg",
                "label": "Blood pressure",
                "field_type": "text",
                "unit": "mmHg",
                "required": True,
                "reason": "Routine cardiovascular screening for all visits (e.g. 120/80).",
            },
        ]

    @staticmethod
    def _sanitize_contextual_vitals_fields(fields: Any, *, max_count: int = _MAX_CONTEXTUAL_VITAL_FIELDS) -> list[dict[str, Any]]:
        """Map illness-specific picks to the canonical vitals catalog; numeric only; omits weight/BP; cap ``max_count``."""
        if not isinstance(fields, list):
            return []
        out: list[dict[str, Any]] = []
        seen: set[str] = set()
        cap = max(0, int(max_count))
        for raw in fields:
            if len(out) >= cap:
                break
            if not isinstance(raw, dict):
                continue
            raw_key = str(raw.get("key", "")).strip().lower().replace(" ", "_").replace("-", "_")
            canonical = normalize_contextual_vital_key(raw_key)
            if not canonical or canonical in seen:
                continue
            if not _FIELD_KEY_RE.match(canonical):
                continue
            seen.add(canonical)
            ft = str(raw.get("field_type", "number")).strip().lower()
            if ft != "number":
                continue
            spec = VITAL_CONTEXT_BY_KEY[canonical]
            label = str(spec.get("label") or canonical).strip()[:120]
            unit_raw = spec.get("unit")
            unit_out: str | None
            if unit_raw in (None, ""):
                unit_out = None
            else:
                unit_out = str(unit_raw).strip()[:32] or None
            out.append(
                {
                    "key": canonical,
                    "label": label,
                    "field_type": "number",
                    "unit": unit_out,
                    "required": bool(raw.get("required", True)),
                    "reason": str(raw.get("reason", "")).strip()[:400] or "Linked to visit intake context",
                }
            )
        return out

    def generate_vitals_form(self, patient_id: str, visit_id: str) -> dict:
        """Generate dynamic vitals requirements from intake + pre-visit summary."""
        patient = self.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise ValueError("Patient not found")

        # If a vitals form already exists on this visit, return it instead of generating a new one.
        existing_visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}], "patient_id": patient_id},
            {"_id": 0, "vitals_form": 1},
        )
        existing_form = dict((existing_visit or {}).get("vitals_form") or {})
        if existing_form:
            existing_form.pop("_id", None)
            return existing_form

        visit_doc = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "intake_session": 1, "pre_visit_summary": 1},
        ) or {}
        intake = dict(visit_doc.get("intake_session") or {})
        pre_visit = dict(visit_doc.get("pre_visit_summary") or {})

        chief_line = _one_line_chief_complaint(intake, pre_visit)
        payload = {
            "patient": {
                "patient_id": patient.get("patient_id"),
                "name": patient.get("name"),
                "age": patient.get("age"),
                "gender": patient.get("gender"),
                "preferred_language": patient.get("preferred_language", "en"),
            },
            "visit": {"visit_id": visit_id},
            "chief_complaint_line": chief_line,
            "intake": {
                "language": intake.get("language"),
                "status": intake.get("status"),
                "illness": intake.get("illness"),
                "answers": intake.get("answers", []),
            },
            "pre_visit_sections": pre_visit.get("sections", {}),
        }

        result: dict[str, Any] = {
            "needs_vitals": False,
            "reason": "No additional vitals required based on available context.",
            "fields": [],
        }
        try:
            ai_result = self.openai.generate_vitals_form(context=payload)
            if isinstance(ai_result, dict) and "needs_vitals" in ai_result:
                result = ai_result
        except Exception:
            pass

        if result.get("needs_vitals"):
            contextual = self._sanitize_contextual_vitals_fields(
                result.get("fields"),
                max_count=_MAX_CONTEXTUAL_VITAL_FIELDS,
            )
            result["fields"] = self._fixed_common_vitals_fields() + contextual
        else:
            # Keep baseline capture available for every visit so the Vitals tab never renders as an empty form.
            result = {
                "needs_vitals": True,
                "reason": "Baseline vitals are captured for every visit.",
                "fields": self._fixed_common_vitals_fields(),
            }

        if result.get("needs_vitals") and not result["fields"]:
            result = {
                "needs_vitals": False,
                "reason": "Model returned needs_vitals but no form fields could be built; skipping vitals capture.",
                "fields": [],
            }

        form_doc = {
            "form_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id,
            "needs_vitals": bool(result.get("needs_vitals", False)),
            "reason": str(result.get("reason", "No reason provided")),
            "fields": list(result.get("fields", [])),
            "generated_at": datetime.now(timezone.utc),
        }
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {
                "$set": {
                    "vitals_form": form_doc,
                    # Vitals form generation means we are now in the vitals stage.
                    "status": "in_progress",
                    "previous_workflow_stage": "pre_visit",
                    "current_workflow_stage": "vitals",
                    "next_workflow_stage": "transcription",
                    "updated_at": form_doc["generated_at"],
                }
            },
        )
        form_doc.pop("_id", None)
        return form_doc

    def submit_vitals(
        self,
        patient_id: str,
        visit_id: str,
        form_id: str | None,
        staff_name: str,
        values: dict[str, Any],
    ) -> dict:
        """Store vitals form values for patient."""
        patient = self.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise ValueError("Patient not found")

        values_out = dict(values)
        if form_id:
            visit_doc = self.db.visits.find_one(
                {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
                {"_id": 0, "vitals_form": 1},
            ) or {}
            form = dict(visit_doc.get("vitals_form") or {})
            if not form:
                raise ValueError(
                    "Vitals form not found for this patient and visit; call POST /vitals/generate-form first "
                    "or pass the correct form_id."
                )
            if str(form.get("form_id") or "") != str(form_id):
                raise ValueError("Submitted form_id does not match latest vitals form for this visit.")
            fields = self._sanitize_vitals_fields(form.get("fields"))
            if form.get("needs_vitals") and not fields:
                raise ValueError("Stored vitals form has no valid fields; generate a new form.")
            allowed = {f["key"] for f in fields}
            required = {f["key"] for f in fields if f.get("required")}
            filtered = {k: values_out[k] for k in values_out if k in allowed}
            missing = [
                k
                for k in sorted(required)
                if k not in filtered
                or filtered[k] is None
                or (isinstance(filtered[k], str) and not str(filtered[k]).strip())
            ]
            if missing:
                raise ValueError(
                    "Missing required vitals: "
                    + ", ".join(missing)
                    + ". Submit one value per `key` from the form `fields` array (e.g. body_weight_kg, blood_pressure_mmhg, temperature_f)."
                    f" Allowed keys: {', '.join(sorted(allowed))}."
                )
            values_out = filtered

        doc = {
            "vitals_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id,
            "form_id": form_id,
            "staff_name": staff_name.strip(),
            "submitted_at": datetime.now(timezone.utc),
            "values": values_out,
        }
        self.db.visits.update_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"$set": {"vitals": doc, "updated_at": doc["submitted_at"]}},
        )
        doc.pop("_id", None)
        return doc

    def get_latest_vitals(self, patient_id: str, visit_id: str) -> dict | None:
        """Return latest submitted vitals."""
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "vitals": 1},
        ) or {}
        doc = dict(visit.get("vitals") or {})
        if not doc:
            return None
        return doc

    def get_latest_vitals_form(self, patient_id: str, visit_id: str) -> dict | None:
        """Return latest generated vitals form decision."""
        visit = self.db.visits.find_one(
            {"$or": [{"visit_id": visit_id}, {"id": visit_id}]},
            {"_id": 0, "vitals_form": 1},
        ) or {}
        doc = dict(visit.get("vitals_form") or {})
        if not doc:
            return None
        return doc

    def build_submit_template(self, patient_id: str, visit_id: str) -> dict:
        """
        Build a ready-to-submit payload template from latest form keys.

        Values are prefilled from latest submitted vitals for the same visit when available;
        otherwise values are returned as null for direct staff entry.
        """
        form = self.get_latest_vitals_form(patient_id, visit_id)
        if not form:
            raise ValueError("Vitals form not found for this patient and visit; call POST /vitals/generate-form first")
        form_id = str(form.get("form_id") or "")
        if not form_id:
            raise ValueError("Latest vitals form is missing form_id")
        fields = self._sanitize_vitals_fields(form.get("fields"))
        if form.get("needs_vitals") and not fields:
            raise ValueError("Stored vitals form has no valid fields; generate a new form.")

        latest = self.get_latest_vitals(patient_id, visit_id) or {}
        latest_values = latest.get("values") if isinstance(latest.get("values"), dict) else {}
        source = "latest_vitals" if latest_values else "empty"
        values: list[dict[str, Any]] = [{"key": f["key"], "value": latest_values.get(f["key"])} for f in fields]

        if not values and not bool(form.get("needs_vitals", False)):
            # No fields required for this visit.
            source = "empty"

        return {
            "patient_id": patient_id,
            "visit_id": visit_id,
            "form_id": form_id,
            "staff_name": "",
            "values": values,
            "source": source,
        }
