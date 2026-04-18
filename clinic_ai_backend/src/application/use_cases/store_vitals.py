"""Vitals generation and storage use case module."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from src.adapters.db.mongo.client import get_database
from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.application.utils.patient_identity import stable_patient_id


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

    def generate_vitals_form(self, patient_id: str, visit_id: str) -> dict:
        """Generate dynamic vitals requirements from intake + pre-visit summary."""
        patient = self.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise ValueError("Patient not found")

        intake = (
            self.db.intake_sessions.find_one(
                {"patient_id": patient_id, "visit_id": visit_id},
                sort=[("updated_at", -1)],
            )
            or {}
        )
        pre_visit = (
            self.db.pre_visit_summaries.find_one(
                {"patient_id": patient_id, "visit_id": visit_id},
                sort=[("updated_at", -1)],
            )
            or {}
        )

        payload = {
            "patient": {
                "patient_id": patient.get("patient_id"),
                "age": patient.get("age"),
                "preferred_language": patient.get("preferred_language", "en"),
            },
            "intake_answers": intake.get("answers", []),
            "pre_visit_sections": pre_visit.get("sections", {}),
        }

        result = {
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

        form_doc = {
            "form_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id,
            "needs_vitals": bool(result.get("needs_vitals", False)),
            "reason": str(result.get("reason", "No reason provided")),
            "fields": list(result.get("fields", [])),
            "generated_at": datetime.now(timezone.utc),
        }
        self.db.vitals_forms.insert_one(form_doc)
        form_doc.pop("_id", None)
        return form_doc

    def submit_vitals(self, patient_id: str, visit_id: str, form_id: str | None, staff_name: str, values: dict) -> dict:
        """Store vitals form values for patient."""
        patient = self.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise ValueError("Patient not found")

        doc = {
            "vitals_id": str(uuid4()),
            "patient_id": patient_id,
            "visit_id": visit_id,
            "form_id": form_id,
            "staff_name": staff_name,
            "submitted_at": datetime.now(timezone.utc),
            "values": values,
        }
        self.db.patient_vitals.insert_one(doc)
        doc.pop("_id", None)
        return doc

    def get_latest_vitals(self, patient_id: str, visit_id: str) -> dict | None:
        """Return latest submitted vitals."""
        doc = self.db.patient_vitals.find_one(
            {"patient_id": patient_id, "visit_id": visit_id},
            sort=[("submitted_at", -1)],
        )
        if not doc:
            return None
        doc.pop("_id", None)
        return doc

    def get_latest_vitals_form(self, patient_id: str, visit_id: str) -> dict | None:
        """Return latest generated vitals form decision."""
        doc = self.db.vitals_forms.find_one(
            {"patient_id": patient_id, "visit_id": visit_id},
            sort=[("generated_at", -1)],
        )
        if not doc:
            return None
        doc.pop("_id", None)
        return doc
