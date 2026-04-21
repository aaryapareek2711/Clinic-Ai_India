"""Short follow-up reminder lines for Meta templates (T-3d, day-before, and immediate ping)."""
from __future__ import annotations

from datetime import datetime

from src.core.config import Settings


def resolve_follow_up_template_name(settings: Settings) -> str | None:
    """Follow-up / reminder channel: dedicated follow-up template, else intake (e.g. opening_msg)."""
    name = (settings.whatsapp_followup_template_name or "").strip()
    if name:
        return name
    return (settings.whatsapp_intake_template_name or "").strip() or None


def follow_up_template_language_code(settings: Settings, preferred_language: str) -> str:
    lang = str(preferred_language or "en").strip().lower()
    if lang == "hi":
        return settings.whatsapp_followup_template_lang_hi
    return settings.whatsapp_followup_template_lang_en


def follow_up_template_body_values(
    *,
    reminder_kind: str,
    next_visit_at: datetime,
    follow_up_text: str,
) -> list[str]:
    """One body parameter for templates like opening_msg (single {{1}})."""
    date_s = next_visit_at.strftime("%Y-%m-%d")
    if reminder_kind in {"24h", "1d"}:
        return [f"Follow-up visit tomorrow ({date_s}). {follow_up_text}".strip()[:900]]
    if reminder_kind == "immediate":
        return [f"Follow-up visit scheduled on {date_s}. {follow_up_text}".strip()[:900]]
    return [f"Follow-up visit in 3 days on {date_s}. {follow_up_text}".strip()[:900]]


def default_follow_up_body_line(kind: str, next_visit_at: datetime, doc: dict) -> str:
    date_s = next_visit_at.strftime("%Y-%m-%d %H:%M UTC")
    ft = str(doc.get("follow_up_text", "") or "")
    if kind in {"24h", "1d"}:
        return f"Reminder: your follow-up visit is tomorrow ({date_s}). {ft}".strip()
    if kind == "immediate":
        return f"Follow-up visit scheduled ({date_s}). {ft}".strip()
    return f"Reminder: your follow-up visit is in 3 days ({date_s}). {ft}".strip()
