"""WhatsApp webhook routes module."""
import logging

from fastapi import APIRouter, HTTPException, Query, Request, Response

from src.application.services.intake_chat_service import IntakeChatService
from src.core.config import get_settings

router = APIRouter(prefix="/webhooks/whatsapp", tags=["Workflow"])
logger = logging.getLogger(__name__)


@router.get("")
@router.get("/")
def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
) -> str:
    """Verify WhatsApp webhook endpoint."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("")
@router.post("/")
async def receive_webhook(request: Request) -> dict:
    """Receive incoming WhatsApp messages and continue intake flow."""
    body = await request.json()
    entries = body.get("entry", [])
    service = IntakeChatService()
    logger.info("WhatsApp webhook received entries=%s", len(entries))

    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                from_number = message.get("from")
                text = _extract_message_text(message)
                logger.info(
                    "WhatsApp inbound message from=%s type=%s text_present=%s",
                    from_number,
                    message.get("type"),
                    bool(text),
                )
                if from_number and text:
                    service.handle_patient_reply(from_number=from_number, message_text=text)

    return {"received": True}


def _extract_message_text(message: dict) -> str:
    """Extract user-entered text across common WhatsApp message types."""
    text_body = (message.get("text") or {}).get("body")
    if isinstance(text_body, str) and text_body.strip():
        return text_body.strip()

    button_text = (message.get("button") or {}).get("text")
    if isinstance(button_text, str) and button_text.strip():
        return button_text.strip()

    interactive = message.get("interactive") or {}
    interactive_button = (interactive.get("button_reply") or {}).get("title")
    if isinstance(interactive_button, str) and interactive_button.strip():
        return interactive_button.strip()

    interactive_list = (interactive.get("list_reply") or {}).get("title")
    if isinstance(interactive_list, str) and interactive_list.strip():
        return interactive_list.strip()

    return ""
