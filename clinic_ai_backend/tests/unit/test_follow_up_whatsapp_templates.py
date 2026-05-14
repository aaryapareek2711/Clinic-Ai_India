"""Tests for Meta follow-up template body lines."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.application.services.follow_up_whatsapp_templates import follow_up_template_body_values


def test_immediate_body_future_includes_ist_time() -> None:
    nv = datetime(2030, 6, 20, 5, 0, tzinfo=timezone.utc)
    out = follow_up_template_body_values(
        reminder_kind="immediate",
        next_visit_at=nv,
        follow_up_text="Bring labs",
    )
    assert len(out) == 1
    assert "IST" in out[0]
    assert "Bring labs" in out[0]
    assert "20-06-2030" in out[0]


def test_immediate_body_when_slot_already_passed() -> None:
    past = datetime.now(timezone.utc) - timedelta(hours=2)
    out = follow_up_template_body_values(
        reminder_kind="immediate",
        next_visit_at=past,
        follow_up_text="Rest",
    )
    assert len(out) == 1
    assert "missed" in out[0].lower() or "reschedule" in out[0].lower()
    assert "Rest" in out[0]
