"""Send WhatsApp template reminders at T-3 days and the calendar day before next visit."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from src.adapters.external.whatsapp.meta_whatsapp_client import MetaWhatsAppClient
from src.application.services.follow_up_whatsapp_templates import (
    default_follow_up_body_line,
    follow_up_template_body_values,
    follow_up_template_language_code,
    resolve_follow_up_template_name,
)
from src.core.config import get_settings

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ProcessFollowUpRemindersUseCase:
    """Scan scheduled follow-ups and send due Meta template messages."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.whatsapp = MetaWhatsAppClient()

    def execute(self, *, db: Any, now: datetime | None = None) -> dict[str, int]:
        now_utc = now or _utc_now()
        if now_utc.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=timezone.utc)
        else:
            now_utc = now_utc.astimezone(timezone.utc)

        sent_3d = 0
        sent_24h = 0
        skipped = 0

        if not (self.settings.whatsapp_access_token or "").strip() or not (
            self.settings.whatsapp_phone_number_id or ""
        ).strip():
            skipped = len(list(db.follow_up_reminders.find({})))
            return {"sent_3d": 0, "sent_24h": 0, "skipped": skipped}

        template_name = resolve_follow_up_template_name(self.settings)
        if not template_name:
            skipped = len(list(db.follow_up_reminders.find({})))
            return {"sent_3d": 0, "sent_24h": 0, "skipped": skipped}

        param_count = max(0, int(self.settings.whatsapp_followup_template_param_count))

        for doc in list(db.follow_up_reminders.find({})):
            nv = doc.get("next_visit_at")
            if nv is None:
                skipped += 1
                continue
            if isinstance(nv, datetime):
                if nv.tzinfo is None:
                    nv = nv.replace(tzinfo=timezone.utc)
                nv = nv.astimezone(timezone.utc)
            else:
                skipped += 1
                continue
            if nv <= now_utc:
                skipped += 1
                continue

            to_number = str(doc.get("to_number") or "")
            if not to_number:
                skipped += 1
                continue

            lang = str(doc.get("preferred_language") or "en").strip().lower()
            language_code = follow_up_template_language_code(self.settings, lang)

            t3 = nv - timedelta(days=3)
            # Second ping: one calendar day before visit (same clock as next_visit_at), not only "24h" wall literal.
            t1d = nv - timedelta(days=1)
            rid = doc.get("reminder_id")

            if doc.get("remind_3d_sent_at") is None and now_utc >= t3 and now_utc < nv:
                body_values = follow_up_template_body_values(
                    reminder_kind="3d",
                    next_visit_at=nv,
                    follow_up_text=str(doc.get("follow_up_text") or ""),
                )
                if param_count > 0 and not body_values:
                    body_values = [default_follow_up_body_line("3d", nv, doc)]
                try:
                    self.whatsapp.send_template(
                        to_number=to_number,
                        template_name=template_name,
                        language_code=language_code,
                        body_values=body_values[:param_count] if param_count else body_values,
                    )
                    db.follow_up_reminders.update_one(
                        {"reminder_id": rid},
                        {"$set": {"remind_3d_sent_at": now_utc, "updated_at": now_utc}},
                    )
                    sent_3d += 1
                except Exception as exc:
                    logger.warning(
                        "follow_up_reminder_send_failed reminder_kind=3d reminder_id=%s to=%s error=%s",
                        rid,
                        to_number,
                        exc,
                    )
                    skipped += 1

            fresh = db.follow_up_reminders.find_one({"reminder_id": rid}) or doc
            if fresh.get("remind_24h_sent_at") is None and now_utc >= t1d and now_utc < nv:
                body_values = follow_up_template_body_values(
                    reminder_kind="1d",
                    next_visit_at=nv,
                    follow_up_text=str(doc.get("follow_up_text") or ""),
                )
                if param_count > 0 and not body_values:
                    body_values = [default_follow_up_body_line("1d", nv, fresh)]
                try:
                    self.whatsapp.send_template(
                        to_number=to_number,
                        template_name=template_name,
                        language_code=language_code,
                        body_values=body_values[:param_count] if param_count else body_values,
                    )
                    db.follow_up_reminders.update_one(
                        {"reminder_id": rid},
                        {"$set": {"remind_24h_sent_at": now_utc, "updated_at": now_utc}},
                    )
                    sent_24h += 1
                except Exception as exc:
                    logger.warning(
                        "follow_up_reminder_send_failed reminder_kind=1d reminder_id=%s to=%s error=%s",
                        rid,
                        to_number,
                        exc,
                    )
                    skipped += 1

        return {"sent_3d": sent_3d, "sent_24h": sent_24h, "skipped": skipped}
