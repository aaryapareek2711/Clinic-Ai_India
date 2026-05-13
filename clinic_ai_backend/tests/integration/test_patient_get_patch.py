"""Tests for GET/PATCH single patient (detail + staff edits)."""
from __future__ import annotations

from src.application.utils.patient_id_crypto import decode_patient_id


def test_get_patient_returns_summary(app_client) -> None:
    reg = app_client.post(
        "/api/patients/register",
        json={
            "name": "Profile View",
            "phone_number": "9000000001",
            "age": 36,
            "gender": "female",
            "preferred_language": "en",
            "travelled_recently": False,
            "consent": True,
        },
    )
    assert reg.status_code == 200
    opaque = reg.json()["patient_id"]

    res = app_client.get(f"/api/patients/{opaque}")
    assert res.status_code == 200
    body = res.json()
    assert body["full_name"] == "Profile View"
    assert body["phone_number"] == "919000000001"
    assert body["age"] == 36
    assert decode_patient_id(body["patient_id"]) == decode_patient_id(opaque)


def test_patch_patient_updates_demographics(app_client) -> None:
    reg = app_client.post(
        "/api/patients/register",
        json={
            "name": "Patch Me",
            "phone_number": "9000000002",
            "age": 22,
            "gender": "male",
            "preferred_language": "en",
            "travelled_recently": False,
            "consent": True,
        },
    )
    assert reg.status_code == 200
    opaque = reg.json()["patient_id"]

    patched = app_client.patch(f"/api/patients/{opaque}", json={"age": 33, "gender": "female"})
    assert patched.status_code == 200
    data = patched.json()
    assert data["age"] == 33
    assert data["gender"] == "female"

    refetch = app_client.get(f"/api/patients/{opaque}")
    assert refetch.status_code == 200
    assert refetch.json()["age"] == 33


def test_patch_identity_rewires_visits(app_client) -> None:
    reg = app_client.post(
        "/api/patients/register",
        json={
            "name": "Visit Carry",
            "phone_number": "9000000003",
            "age": 40,
            "gender": "male",
            "preferred_language": "en",
            "travelled_recently": False,
            "consent": True,
            "appointment_date": "2099-06-01",
            "appointment_time": "10:00",
        },
    )
    assert reg.status_code == 200
    reg_body = reg.json()
    opaque = reg_body["patient_id"]
    internal_before = decode_patient_id(opaque)
    visit_id = reg_body.get("visit_id")
    assert visit_id

    patched = app_client.patch(
        f"/api/patients/{opaque}",
        json={"name": "Visit Carry Jr", "phone_number": "9000000003"},
    )
    assert patched.status_code == 200
    new_opaque = patched.json()["patient_id"]
    internal_after = decode_patient_id(new_opaque)
    assert internal_before != internal_after
    assert internal_after == "doc001_visitcarryjr_919000000003"

    visit_res = app_client.get(f"/api/patients/{new_opaque}/latest-visit")
    assert visit_res.status_code == 200
    assert visit_res.json()["visit_id"] == visit_id


def test_patch_patient_accepts_india_mobile_formats_and_stores_canonical(app_client) -> None:
    reg = app_client.post(
        "/api/patients/register",
        json={
            "name": "Format Test",
            "phone_number": "9000000004",
            "age": 30,
            "gender": "male",
            "preferred_language": "en",
            "travelled_recently": False,
            "consent": True,
        },
    )
    assert reg.status_code == 200
    opaque = reg.json()["patient_id"]

    patched = app_client.patch(
        f"/api/patients/{opaque}",
        json={"phone_number": "+91 900 0000 004"},
    )
    assert patched.status_code == 200
    assert patched.json()["phone_number"] == "919000000004"

    alt = app_client.patch(f"/api/patients/{opaque}", json={"phone_number": "919000000004"})
    assert alt.status_code == 200
    assert alt.json()["phone_number"] == "919000000004"
