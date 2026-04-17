"""Integration tests for notes generation flows."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest


def _insert_note_context(fake_db, patient_id: str, job_id: str = "job-n1") -> None:
    fake_db.patients.insert_one(
        {
            "patient_id": patient_id,
            "name": "Ravi Kumar",
            "age": 42,
            "gender": "male",
            "preferred_language": "en",
        }
    )
    fake_db.pre_visit_summaries.insert_one(
        {
            "patient_id": patient_id,
            "status": "generated",
            "updated_at": datetime.now(timezone.utc),
            "sections": {
                "chief_complaint": {"reason_for_visit": "Fever and cough"},
            },
        }
    )
    fake_db.intake_sessions.insert_one(
        {
            "patient_id": patient_id,
            "updated_at": datetime.now(timezone.utc),
            "answers": [{"question": "illness", "answer": "Fever and cough"}],
        }
    )
    fake_db.transcription_jobs.insert_one(
        {
            "job_id": job_id,
            "audio_id": "a1",
            "patient_id": patient_id,
            "visit_id": "v1",
            "status": "completed",
            "created_at": datetime.now(timezone.utc),
            "completed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
    )
    fake_db.transcription_results.insert_one(
        {
            "job_id": job_id,
            "patient_id": patient_id,
            "visit_id": "v1",
            "language_detected": "en",
            "overall_confidence": 0.9,
            "requires_manual_review": False,
            "full_transcript_text": "Patient reports fever for three days with dry cough.",
            "segments": [],
            "created_at": datetime.now(timezone.utc),
        }
    )


def test_default_generate_prefers_india_note(app_client, fake_db, monkeypatch: pytest.MonkeyPatch) -> None:
    _insert_note_context(fake_db, patient_id="p-note-1", job_id="job-note-1")
    monkeypatch.setattr(
        "src.adapters.external.ai.openai_client.OpenAIQuestionClient.generate_india_clinical_note",
        lambda self, context: {
            "assessment": "Likely acute upper respiratory tract infection.",
            "plan": "Hydration, symptomatic care, and close review.",
            "rx": [],
            "investigations": [],
            "red_flags": ["Worsening breathlessness"],
            "follow_up_in": "5 days",
            "follow_up_date": None,
            "doctor_notes": None,
            "chief_complaint": "Fever and cough",
            "data_gaps": context.get("data_gaps", []),
        },
    )
    response = app_client.post(
        "/notes/generate",
        json={"patient_id": "p-note-1", "transcription_job_id": "job-note-1"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["note_type"] == "india_clinical"
    assert payload["payload"]["assessment"]
    assert payload["payload"]["follow_up_in"] == "5 days"


def test_soap_endpoint_remains_operational(app_client, fake_db) -> None:
    _insert_note_context(fake_db, patient_id="p-note-2", job_id="job-note-2")
    response = app_client.post(
        "/notes/soap",
        json={"patient_id": "p-note-2", "transcription_job_id": "job-note-2"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["note_type"] == "soap"
    assert payload["legacy"] is True
    assert "subjective:" in (payload["payload"]["doctor_notes"] or "")


def test_post_visit_summary_includes_whatsapp_payload(app_client, fake_db, monkeypatch: pytest.MonkeyPatch) -> None:
    _insert_note_context(fake_db, patient_id="p-note-3", job_id="job-note-3")
    fake_db.clinical_notes.insert_one(
        {
            "note_id": "n-india-1",
            "patient_id": "p-note-3",
            "visit_id": "v1",
            "note_type": "india_clinical",
            "source_job_id": "job-note-3",
            "status": "generated",
            "version": 1,
            "created_at": datetime.now(timezone.utc),
            "payload": {
                "assessment": "Viral upper respiratory infection",
                "plan": "Hydration and rest",
                "rx": [{"medicine_name": "Paracetamol", "dose": "500 mg", "frequency": "SOS", "duration": "3 days", "route": "oral", "food_instruction": "after food"}],
                "investigations": [{"test_name": "CBC", "urgency": "routine"}],
                "red_flags": ["Breathlessness"],
                "follow_up_in": "3 days",
                "follow_up_date": None,
                "doctor_notes": None,
                "chief_complaint": "Fever and cough",
                "data_gaps": [],
            },
        }
    )
    monkeypatch.setattr(
        "src.adapters.external.ai.openai_client.OpenAIQuestionClient.generate_post_visit_summary",
        lambda self, context, language_name: {
            "visit_reason": "Fever and cough",
            "what_doctor_found": "Looks like a viral infection.",
            "medicines_to_take": ["Paracetamol 500 mg after food"],
            "tests_recommended": ["CBC"],
            "self_care": ["Drink fluids"],
            "warning_signs": ["Trouble breathing"],
            "follow_up": "Visit again in 3 days",
        },
    )
    response = app_client.post(
        "/notes/post-visit-summary",
        json={"patient_id": "p-note-3", "transcription_job_id": "job-note-3"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["note_type"] == "post_visit_summary"
    assert payload["payload"]["what_doctor_found"] == "Looks like a viral infection."
    assert "🩺" in payload["whatsapp_payload"]
    assert "💊" in payload["whatsapp_payload"]
    assert "🔬" in payload["whatsapp_payload"]
    assert "📅" in payload["whatsapp_payload"]
    assert "⚠️" in payload["whatsapp_payload"]


def test_post_visit_summary_uses_request_language_override(app_client, fake_db, monkeypatch: pytest.MonkeyPatch) -> None:
    _insert_note_context(fake_db, patient_id="p-note-4", job_id="job-note-4")
    captured: dict = {}

    def _fake_generate(self, context, language_name):
        captured["language_name"] = language_name
        return {
            "visit_reason": "Reason",
            "what_doctor_found": "Finding",
            "medicines_to_take": [],
            "tests_recommended": [],
            "self_care": [],
            "warning_signs": [],
            "follow_up": "7 days",
        }

    monkeypatch.setattr("src.adapters.external.ai.openai_client.OpenAIQuestionClient.generate_post_visit_summary", _fake_generate)
    response = app_client.post(
        "/notes/post-visit-summary",
        json={"patient_id": "p-note-4", "transcription_job_id": "job-note-4", "preferred_language": "hi"},
    )
    assert response.status_code == 200
    assert captured["language_name"] == "Hindi"


def test_post_visit_summary_prefers_india_note_without_transcript(app_client, fake_db, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db.patients.insert_one(
        {
            "patient_id": "p-note-5",
            "name": "Asha",
            "age": 31,
            "gender": "female",
            "preferred_language": "en",
        }
    )
    fake_db.clinical_notes.insert_one(
        {
            "note_id": "n-india-2",
            "patient_id": "p-note-5",
            "visit_id": "v5",
            "note_type": "india_clinical",
            "source_job_id": "job-note-5",
            "status": "generated",
            "version": 1,
            "created_at": datetime.now(timezone.utc),
            "payload": {
                "assessment": "Likely gastritis.",
                "plan": "Dietary care and medicines.",
                "rx": [{"medicine_name": "Pantoprazole", "dose": "40 mg", "frequency": "OD", "duration": "5 days", "route": "oral", "food_instruction": "before food"}],
                "investigations": [],
                "red_flags": ["Vomiting blood"],
                "follow_up_in": "5 days",
                "follow_up_date": None,
                "doctor_notes": None,
                "chief_complaint": "Acidity",
                "data_gaps": [],
            },
        }
    )
    monkeypatch.setattr(
        "src.adapters.external.ai.openai_client.OpenAIQuestionClient.generate_post_visit_summary",
        lambda self, context, language_name: {
            "visit_reason": "Acidity",
            "what_doctor_found": "Stomach irritation signs.",
            "medicines_to_take": ["Pantoprazole 40 mg before food"],
            "tests_recommended": [],
            "self_care": ["Avoid spicy food"],
            "warning_signs": ["Blood in vomit"],
            "follow_up": "Review in 5 days",
        },
    )
    response = app_client.post(
        "/notes/post-visit-summary",
        json={"patient_id": "p-note-5"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["source_job_id"] == "job-note-5"
