"""Meta WhatsApp Cloud API client module."""
from __future__ import annotations

import json
import logging
from urllib import request
from urllib.error import HTTPError

from src.core.config import get_settings

logger = logging.getLogger(__name__)


class MetaWhatsAppClient:
    """Client for sending WhatsApp text messages."""

    def send_typing_indicator(self, to_number: str, reply_to_message_id: str | None = None) -> None:
        """Show WhatsApp typing indicator for a recipient (best effort)."""
        # WhatsApp Cloud typing indicator works with inbound message_id.
        # Prefer canonical status payload first.
        message_id = str(reply_to_message_id or "").strip()
        payload: dict = {
            "messaging_product": "whatsapp",
            "status": "typing",
            "message_id": message_id,
        }
        if not payload["message_id"]:
            # Typing indicator generally requires an inbound message context.
            logger.info("whatsapp_typing_skipped_missing_message_id to=%s", to_number[-4:] if to_number else "")
            return
        try:
            self._post_message(payload)
            return
        except Exception as exc:
            logger.warning("whatsapp_typing_status_payload_failed message_id=%s error=%s", message_id, str(exc))

        # Fallback for API variants that accept typing_indicator payloads.
        fallback_payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number,
            "type": "typing_indicator",
            "typing_indicator": {"type": "text"},
            "context": {"message_id": payload["message_id"]},
        }
        try:
            self._post_message(fallback_payload)
        except Exception as exc:
            logger.warning("whatsapp_typing_fallback_payload_failed message_id=%s error=%s", message_id, str(exc))
            raise

    def send_text(self, to_number: str, message: str) -> None:
        """Send a text message via Meta WhatsApp Cloud API."""
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": message},
        }
        self._post_message(payload)

    def send_template(
        self,
        to_number: str,
        template_name: str,
        language_code: str,
        body_values: list[str] | None = None,
    ) -> None:
        """Send a template message via Meta WhatsApp Cloud API."""
        parameters = [{"type": "text", "text": value} for value in (body_values or [])]
        template_payload: dict = {
            "name": template_name,
            "language": {"code": language_code},
        }
        if parameters:
            template_payload["components"] = [
                {
                    "type": "body",
                    "parameters": parameters,
                }
            ]
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "template",
            "template": template_payload,
        }
        self._post_message(payload)

    @staticmethod
    def _post_message(payload: dict) -> None:
        settings = get_settings()
        if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
            raise RuntimeError("WhatsApp credentials are missing")

        url = (
            f"https://graph.facebook.com/{settings.whatsapp_api_version}/"
            f"{settings.whatsapp_phone_number_id}/messages"
        )
        req = request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.whatsapp_access_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=20):
                return
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"WhatsApp API request failed: {response_body}") from exc
