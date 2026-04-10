"""WhatsApp webhook routes module."""
from fastapi import APIRouter, HTTPException, Query, Request

from src.application.services.intake_chat_service import IntakeChatService
from src.core.config import get_settings

router = APIRouter(prefix="/webhooks/whatsapp", tags=["Workflow"])


@router.get("")
def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
) -> str:
    """Verify WhatsApp webhook endpoint."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return hub_challenge
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("")
async def receive_webhook(request: Request) -> dict:
    """Receive incoming WhatsApp messages and continue intake flow."""
    body = await request.json()
    entries = body.get("entry", [])
    service = IntakeChatService()

    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                from_number = message.get("from")
                text = (message.get("text") or {}).get("body", "")
                if from_number and text:
                    service.handle_patient_reply(from_number=from_number, message_text=text)

    return {"received": True}
