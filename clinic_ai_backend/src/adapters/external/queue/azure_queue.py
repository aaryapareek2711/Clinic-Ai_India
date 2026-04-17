"""Azure Queue adapter for transcription jobs."""
from __future__ import annotations

from dataclasses import dataclass

from src.core.config import get_settings

try:
    from azure.core.exceptions import ResourceExistsError
    from azure.storage.queue import QueueClient
except Exception:  # noqa: BLE001
    QueueClient = None  # type: ignore[assignment]
    ResourceExistsError = Exception  # type: ignore[assignment]


@dataclass
class QueueMessage:
    """Simple queue message representation."""

    id: str
    pop_receipt: str
    content: str


class AzureQueueAdapter:
    """Send/receive transcription jobs through Azure Queue Storage."""

    def __init__(self) -> None:
        settings = get_settings()
        if QueueClient is None:
            raise RuntimeError("azure-storage-queue dependency is not installed")
        if not settings.azure_storage_account_name or not settings.azure_storage_account_key:
            raise RuntimeError("Azure Storage credentials are not configured")
        if not settings.azure_queue_name:
            raise RuntimeError("AZURE_QUEUE_NAME is not configured")

        account_url = f"https://{settings.azure_storage_account_name}.queue.core.windows.net"
        self.client = QueueClient(
            account_url=account_url,
            queue_name=settings.azure_queue_name,
            credential=settings.azure_storage_account_key,
        )
        try:
            self.client.create_queue()
        except ResourceExistsError:
            pass

    def enqueue(self, job_id: str) -> None:
        self.client.send_message(job_id)

    def pop_next(self) -> QueueMessage | None:
        messages = self.client.receive_messages(messages_per_page=1, visibility_timeout=60)
        page = next(messages.by_page(), [])
        items = list(page)
        if not items:
            return None
        message = items[0]
        return QueueMessage(id=message.id, pop_receipt=message.pop_receipt, content=message.content)

    def ack(self, message: QueueMessage) -> None:
        self.client.delete_message(message.id, message.pop_receipt)
