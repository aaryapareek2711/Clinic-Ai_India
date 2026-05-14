"""Short follow-up reminder lines for Meta templates (T-3d, day-before, and immediate ping)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from src.core.config import Settings
from src.core.language_support import uses_hindi_template_family

# India Standard Time for patient-facing template lines (no DST).
_IST = timezone(timedelta(hours=5, minutes=30), name="IST")


def _format_visit_when_ist(nv: datetime) -> str:
    aware = nv if nv.tzinfo else nv.replace(tzinfo=timezone.utc)
    return aware.astimezone(_IST).strftime("%d-%m-%Y %I:%M %p").strip()


def resolve_follow_up_template_name(settings: Settings) -> str | None:
    """Follow-up/reminder Meta template name (default: ``follow_up_1``)."""
    name = (settings.whatsapp_followup_template_name or "").strip()
    if name:
        return name
    # Safety fallback for older deployments that only configured intake template.
    return (settings.whatsapp_intake_template_name or "").strip() or None


def follow_up_template_language_code(settings: Settings, preferred_language: str) -> str:
    """Language code for follow-up sends (uses follow-up template language envs)."""
    if uses_hindi_template_family(preferred_language):
        return settings.whatsapp_followup_template_lang_hi
    return settings.whatsapp_followup_template_lang_en


def follow_up_meta_template_param_count(settings: Settings) -> int:
    """Body parameter count for follow-up template (uses follow-up template env)."""
    return max(0, int(settings.whatsapp_followup_template_param_count))


def follow_up_template_body_values(
    *,
    reminder_kind: str,
    next_visit_at: datetime,
    follow_up_text: str,
) -> list[str]:
    """Body parameters for ``WHATSAPP_FOLLOWUP_TEMPLATE_NAME`` (e.g. single ``{{1}}`` on ``follow_up_1``)."""
    nv = next_visit_at if next_visit_at.tzinfo else next_visit_at.replace(tzinfo=timezone.utc)
    when_ist = _format_visit_when_ist(nv)
    now = datetime.now(timezone.utc)
    if reminder_kind in {"24h", "1d"}:
        return [f"Follow-up visit tomorrow ({when_ist} IST). {follow_up_text}".strip()[:900]]
    if reminder_kind == "immediate":
        if nv <= now:
            return [
                (
                    f"Reminder: your follow-up consultation was scheduled for {when_ist} IST. "
                    f"If you missed it, please contact the clinic to reschedule. {follow_up_text}"
                ).strip()[:900]
            ]
        return [f"Follow-up visit scheduled for {when_ist} IST. {follow_up_text}".strip()[:900]]
    return [f"Follow-up visit in 3 days ({when_ist} IST). {follow_up_text}".strip()[:900]]


def default_follow_up_body_line(kind: str, next_visit_at: datetime, doc: dict) -> str:
    nv = next_visit_at if next_visit_at.tzinfo else next_visit_at.replace(tzinfo=timezone.utc)
    when_ist = _format_visit_when_ist(nv)
    ft = str(doc.get("follow_up_text", "") or "")
    if kind in {"24h", "1d"}:
        return f"Reminder: your follow-up visit is tomorrow ({when_ist} IST). {ft}".strip()
    if kind == "immediate":
        now = datetime.now(timezone.utc)
        if nv <= now:
            return (
                f"Reminder: follow-up was scheduled for {when_ist} IST; contact clinic if you need to reschedule. {ft}"
            ).strip()
        return f"Follow-up visit scheduled for {when_ist} IST. {ft}".strip()
    return f"Reminder: your follow-up visit is in 3 days ({when_ist} IST). {ft}".strip()
