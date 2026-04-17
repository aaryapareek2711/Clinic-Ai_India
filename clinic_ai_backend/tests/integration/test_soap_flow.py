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
