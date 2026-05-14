"""Parse next-visit / follow-up instants for reminder scheduling."""
from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

# India Standard Time (no DST). Avoid requiring IANA tzdata on Windows CI.
_IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def parse_staff_follow_up_hh_mm(raw: str | None) -> tuple[int, int] | None:
    """Parse ``HH:MM`` (24h) from staff input; return (hour, minute) or None."""
    text = str(raw or "").strip()
    if not text:
        return None
    m = re.fullmatch(r"(?:([01]\d|2[0-3]):([0-5]\d))", text)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2))


def next_visit_instant_for_staff_input(
    d: date | None,
    *,
    follow_up_time_hh_mm: str | None,
) -> datetime | None:
    """
    UTC instant for WhatsApp reminder windows (T-3d / T-1d).

    When ``follow_up_time_hh_mm`` is set, interpret date + time in **Asia/Kolkata** (clinic wall clock).
    When time is omitted, keep legacy behaviour: **09:00 UTC** on that calendar date.
    """
    if d is None:
        return None
    parts = parse_staff_follow_up_hh_mm(follow_up_time_hh_mm)
    if parts is None:
        return datetime.combine(d, time(9, 0, tzinfo=timezone.utc))
    hh, mm = parts
    local = datetime.combine(d, time(hh, mm, tzinfo=_IST))
    return local.astimezone(timezone.utc)


def format_next_visit_patient_display(stored: str | None) -> str:
    """Human-readable next visit line for WhatsApp text (India local when parseable)."""
    text = str(stored or "").strip()
    if not text:
        return ""
    dt = parse_next_visit_at(text)
    if dt is None:
        return text
    local = dt.astimezone(_IST)
    return local.strftime("%d-%m-%Y %I:%M %p").replace(" 0", " ").strip()


def parse_next_visit_at(value: Any) -> datetime | None:
    """
    Return timezone-aware UTC datetime for the patient's next follow-up visit, or None.

    Accepts ISO date ``YYYY-MM-DD``, ISO datetime strings, or ``datetime`` from Mongo.
    Calendar dates are interpreted as 09:00 UTC on that day (mid-morning India-friendly default).
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    text = str(value).strip()
    if not text or text.lower() in {"null", "none", "n/a", "na", "tbd"}:
        return None
    # ISO datetime with optional Z
    if "T" in text or re.match(r"^\d{4}-\d{2}-\d{2} ", text):
        try:
            iso = text.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            pass
    # Calendar date only
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", text[:10])
    if m:
        try:
            d = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            return datetime.combine(d, time(9, 0, tzinfo=timezone.utc))
        except ValueError:
            return None
    return None
