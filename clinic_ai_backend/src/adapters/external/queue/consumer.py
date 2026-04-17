"""Queue consumer for transcription jobs."""
from __future__ import annotations

from asyncio import QueueEmpty
from pymongo import ASCENDING

from src.adapters.db.mongo.client import get_database
from src.adapters.external.queue.azure_queue import AzureQueueAdapter, QueueMessage
from src.adapters.external.queue.producer import LOCAL_TRANSCRIPTION_QUEUE
from src.core.config import get_settings


class TranscriptionQueueConsumer:
    """Read queue messages in FIFO order."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.queue = get_database().transcription_queue
        self.queue.create_index([("queued_at", ASCENDING)])
        self.azure_queue = None
        self.use_azure_queue = False
        self._last_message: QueueMessage | None = None
        if (
            not self.settings.use_local_adapters
            and self.settings.azure_storage_account_name
            and self.settings.azure_storage_account_key
            and self.settings.azure_queue_name
        ):
            self.azure_queue = AzureQueueAdapter()
            self.use_azure_queue = True

    def pop_next_job_id(self) -> str | None:
        if self.settings.use_local_adapters:
            try:
                return LOCAL_TRANSCRIPTION_QUEUE.get_nowait()
            except QueueEmpty:
                return None
        if self.use_azure_queue and self.azure_queue is not None:
            message = self.azure_queue.pop_next()
            if not message:
                return None
            self._last_message = message
            return message.content
        doc = self.queue.find_one(sort=[("queued_at", ASCENDING)])
        if not doc:
            return None
        self.queue.delete_one({"_id": doc["_id"]})
        return doc["job_id"]

    def ack_last(self) -> None:
        if self.use_azure_queue and self.azure_queue is not None and self._last_message is not None:
            self.azure_queue.ack(self._last_message)
            self._last_message = None
