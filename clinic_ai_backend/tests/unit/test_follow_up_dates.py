"""Unit tests for follow-up instant parsing (post-visit reminders)."""
from __future__ import annotations

from datetime import date, datetime, time, timezone

from src.application.utils import follow_up_dates as fd


def test_next_visit_instant_date_only_uses_09_utc() -> None:
    instant = fd.next_visit_instant_for_staff_input(date(2030, 8, 10), follow_up_time_hh_mm=None)
    assert instant == datetime(2030, 8, 10, 9, 0, tzinfo=timezone.utc)


def test_next_visit_instant_with_time_uses_india_wall_clock() -> None:
    instant = fd.next_visit_instant_for_staff_input(date(2030, 8, 10), follow_up_time_hh_mm="10:30")
    assert instant == datetime(2030, 8, 10, 5, 0, tzinfo=timezone.utc)


def test_format_next_visit_patient_display_from_iso() -> None:
    text = fd.format_next_visit_patient_display("2030-08-10T05:00:00+00:00")
    assert "2030" in text
    assert "10:30" in text


def test_parse_staff_follow_up_hh_mm() -> None:
    assert fd.parse_staff_follow_up_hh_mm("09:05") == (9, 5)
    assert fd.parse_staff_follow_up_hh_mm("") is None
