"""Meta WhatsApp Cloud API client module."""
from __future__ import annotations

import json
from urllib import request

from src.core.config import get_settings


class MetaWhatsAppClient:
    """Client for sending WhatsApp text messages."""

    def send_text(self, to_number: str, message: str) -> None:
        """Send a text message via Meta WhatsApp Cloud API."""
        settings = get_settings()
        if not settings.whatsapp_access_token or not settings.whatsapp_phone_number_id:
            raise RuntimeError("WhatsApp credentials are missing")

        url = (
            f"https://graph.facebook.com/{settings.whatsapp_api_version}/"
            f"{settings.whatsapp_phone_number_id}/messages"
        )
        payload = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "text",
            "text": {"body": message},
        }
        req = request.Request(
            url=url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.whatsapp_access_token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with request.urlopen(req, timeout=20):
            return
