"""Tests for strict template-driven India clinical note generation."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import pytest

from src.adapters.external.ai.openai_client import OpenAIQuestionClient
from src.api.routers.notes import _sync_note_into_visit
from src.application.use_cases.generate_india_clinical_note import GenerateIndiaClinicalNoteUseCase


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _seed_completed_transcription(patched_db: Any, *, patient_id: str, visit_id: str, job_id: str) -> None:
    patched_db.transcription_jobs.insert_one(
        {
            "job_id": job_id,
            "patient_id": patient_id,
            "visit_id": visit_id,
            "status": "completed",
            "completed_at": _utc_now(),
            "updated_at": _utc_now(),
        }
    )
    patched_db.transcription_results.replace_one(
        {"job_id": job_id},
        {"job_id": job_id, "full_transcript_text": "Patient reports fever and cough for 3 days."},
        upsert=True,
    )


def _seed_visit(patched_db: Any, *, patient_id: str, visit_id: str) -> None:
    patched_db.patients.replace_one(
        {"patient_id": patient_id},
        {
            "patient_id": patient_id,
            "name": "Template Test Patient",
            "phone_number": "9876543210",
            "doctor_id": "DOC001",
            "updated_at": _utc_now(),
        },
        upsert=True,
    )
    patched_db.visits.insert_one({"visit_id": visit_id, "patient_id": patient_id, "updated_at": _utc_now()})


@pytest.fixture
def fake_llm(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch note generation to be deterministic and template-aware for testing."""

    def _fake_generate(self: OpenAIQuestionClient, *, context: dict) -> dict:  # type: ignore[override]
        tpl = context.get("selected_template") if isinstance(context.get("selected_template"), dict) else {}
        detail = tpl.get("section_detail_level") if isinstance(tpl.get("section_detail_level"), dict) else {}
        assessment = (
            "Assessment: brief."
            if detail.get("assessment") != "detail"
            else "Assessment: detailed line 1.\nAssessment: detailed line 2.\nAssessment: detailed line 3."
        )
        plan = (
            "Plan: brief."
            if detail.get("plan") != "detail"
            else "Plan: detailed line 1.\nPlan: detailed line 2.\nPlan: detailed line 3."
        )
        return {
            "chief_complaint": "Fever and cough",
            "assessment": assessment,
            "plan": plan,
            "rx": [
                {
                    "medicine_name": "Paracetamol",
                    "dose": "500mg",
                    "frequency": "TID",
                    "duration": "3 days",
                    "route": "PO",
                    "food_instruction": "After food",
                    "generic_available": True,
                }
            ],
            "investigations": [
                {
                    "test_name": "CBC",
                    "urgency": "routine",
                    "preparation_instructions": None,
                    "routing_note": None,
                }
            ],
            "red_flags": ["Breathlessness", "Chest pain"],
            "follow_up_in": "5 days",
            "follow_up_date": None,
            "follow_up_time": None,
            "doctor_notes": "Some narrative notes.",
            "data_gaps": [],
        }

    monkeypatch.setattr(OpenAIQuestionClient, "generate_india_clinical_note", _fake_generate)


def test_template_rx_excluded_generates_empty_rx(
    app_client: Any,  # TestClient
    patched_db: Any,
    fake_llm: None,
) -> None:
    patient_id = "john_999"
    visit_id = "CONSULT-20260511-001"
    job_id = "job-1"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    tpl_res = app_client.post(
        "/api/templates",
        json={
            "name": "No Rx Template",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["chief_complaint", "assessment", "plan", "investigations", "red_flags", "data_gaps"],
                "section_detail_level": {"assessment": "brief", "plan": "brief"},
                "section_order": ["chief_complaint", "assessment", "plan"],
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert tpl_res.status_code == 200
    template_id = tpl_res.json()["id"]

    note_res = app_client.post(
        "/api/notes/clinical-note",
        json={
            "patient_id": patient_id,
            "visit_id": visit_id,
            "template_id": template_id,
            "force_regenerate": True,
        },
    )
    assert note_res.status_code == 200, note_res.text
    payload = note_res.json()["payload"]
    assert payload["rx"] == []


def test_template_doctor_notes_excluded_generates_null_doctor_notes(
    app_client: Any,
    patched_db: Any,
    fake_llm: None,
) -> None:
    patient_id = "john_998"
    visit_id = "CONSULT-20260511-002"
    job_id = "job-2"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    tpl_res = app_client.post(
        "/api/templates",
        json={
            "name": "No Notes Template",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan", "rx"],
                "section_detail_level": {"assessment": "brief", "plan": "brief"},
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert tpl_res.status_code == 200
    template_id = tpl_res.json()["id"]

    note_res = app_client.post(
        "/api/notes/clinical-note",
        json={
            "patient_id": patient_id,
            "visit_id": visit_id,
            "template_id": template_id,
            "force_regenerate": True,
        },
    )
    assert note_res.status_code == 200, note_res.text
    payload = note_res.json()["payload"]
    assert payload["doctor_notes"] is None


def test_template_optional_preferences_fill_doctor_notes_when_section_omitted(
    app_client: Any,
    patched_db: Any,
    fake_llm: None,
) -> None:
    """Optional preferences are UI hints for narrative; they must survive strict mode when doctor_notes is not listed."""
    patient_id = "john_prefs_1"
    visit_id = "CONSULT-20260511-PREFS"
    job_id = "job-prefs-1"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    tpl_res = app_client.post(
        "/api/templates",
        json={
            "name": "Prefs Only Template",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan", "rx"],
                "section_detail_level": {"assessment": "brief", "plan": "brief"},
                "optional_preferences": "Start insulin education; emphasize foot care.",
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert tpl_res.status_code == 200
    template_id = tpl_res.json()["id"]

    note_res = app_client.post(
        "/api/notes/clinical-note",
        json={
            "patient_id": patient_id,
            "visit_id": visit_id,
            "template_id": template_id,
            "force_regenerate": True,
        },
    )
    assert note_res.status_code == 200, note_res.text
    payload = note_res.json()["payload"]
    assert payload["doctor_notes"] == "Start insulin education; emphasize foot care."


def test_assessment_detail_is_longer_than_brief(
    app_client: Any,
    patched_db: Any,
    fake_llm: None,
) -> None:
    patient_id = "john_997"
    visit_id = "CONSULT-20260511-003"
    job_id = "job-3"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    brief_tpl = app_client.post(
        "/api/templates",
        json={
            "name": "Brief",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan"],
                "section_detail_level": {"assessment": "brief", "plan": "brief"},
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert brief_tpl.status_code == 200
    brief_id = brief_tpl.json()["id"]

    detail_tpl = app_client.post(
        "/api/templates",
        json={
            "name": "Detail",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan"],
                "section_detail_level": {"assessment": "detail", "plan": "brief"},
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert detail_tpl.status_code == 200
    detail_id = detail_tpl.json()["id"]

    brief_note = app_client.post(
        "/api/notes/clinical-note",
        json={"patient_id": patient_id, "visit_id": visit_id, "template_id": brief_id, "force_regenerate": True},
    )
    assert brief_note.status_code == 200, brief_note.text
    brief_assessment = brief_note.json()["payload"]["assessment"]

    detail_note = app_client.post(
        "/api/notes/clinical-note",
        json={"patient_id": patient_id, "visit_id": visit_id, "template_id": detail_id, "force_regenerate": True},
    )
    assert detail_note.status_code == 200, detail_note.text
    detail_assessment = detail_note.json()["payload"]["assessment"]

    assert len(detail_assessment) > len(brief_assessment) + 30


def test_mixed_brief_detail_across_sections(
    app_client: Any,
    patched_db: Any,
    fake_llm: None,
) -> None:
    patient_id = "john_996"
    visit_id = "CONSULT-20260511-004"
    job_id = "job-4"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    tpl = app_client.post(
        "/api/templates",
        json={
            "name": "Mixed",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan", "rx"],
                "section_detail_level": {"assessment": "detail", "plan": "brief"},
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert tpl.status_code == 200
    template_id = tpl.json()["id"]

    note = app_client.post(
        "/api/notes/clinical-note",
        json={"patient_id": patient_id, "visit_id": visit_id, "template_id": template_id, "force_regenerate": True},
    )
    assert note.status_code == 200, note.text
    payload = note.json()["payload"]
    assert "detailed line" in payload["assessment"].lower()
    assert payload["plan"] == "Plan: brief."


def test_template_serializer_roundtrip_includes_new_keys(app_client: Any) -> None:
    create = app_client.post(
        "/api/templates",
        json={
            "name": "Serializer",
            "description": "",
            "type": "personal",
            "category": "General",
            "specialty": "",
            "content": {
                "included_sections": ["assessment", "plan"],
                "section_detail_level": {"assessment": "brief", "plan": "detail"},
                "section_order": ["assessment", "plan"],
            },
            "tags": [],
            "appointment_types": [],
            "is_favorite": False,
        },
    )
    assert create.status_code == 200
    template_id = create.json()["id"]

    fetched = app_client.get(f"/api/templates/{template_id}")
    assert fetched.status_code == 200
    content = fetched.json()["content"]
    assert content["included_sections"] == ["assessment", "plan"]
    assert content["section_detail_level"]["assessment"] == "brief"
    assert content["section_detail_level"]["plan"] == "detail"
    assert content["section_order"] == ["assessment", "plan"]


def test_visit_note_payload_reflects_selected_sections_only(
    patched_db: Any,
    fake_llm: None,
) -> None:
    patient_id = "john_995"
    visit_id = "CONSULT-20260511-005"
    job_id = "job-5"
    _seed_visit(patched_db, patient_id=patient_id, visit_id=visit_id)
    _seed_completed_transcription(patched_db, patient_id=patient_id, visit_id=visit_id, job_id=job_id)

    # Seed template directly into the in-memory DB (avoid relying on API-side visit syncing).
    template_id = "tpl-visit-sync"
    patched_db.templates.insert_one(
        {
            "id": template_id,
            "is_active": True,
            "content": {
                "included_sections": ["assessment", "plan"],
                "section_detail_level": {"assessment": "brief", "plan": "brief"},
            },
        }
    )

    doc = GenerateIndiaClinicalNoteUseCase().execute(
        patient_id=patient_id,
        visit_id=visit_id,
        transcription_job_id=None,
        force_regenerate=True,
        follow_up_date=None,
        follow_up_time=None,
        template_id=template_id,
    )
    _sync_note_into_visit(note_type="india_clinical", doc=doc)

    # Visit record should have been synced with filtered payload already applied.
    visit_doc = patched_db.visits.find_one({"visit_id": visit_id, "patient_id": patient_id})
    assert visit_doc is not None
    clinical_note = visit_doc.get("clinical_note") or {}
    payload = clinical_note.get("payload") or clinical_note
    assert "rx" in payload, f"visit clinical_note missing keys: {payload}"
    assert payload["rx"] == []
    assert payload["investigations"] == []
    assert payload["red_flags"] == []
    assert payload["doctor_notes"] is None
