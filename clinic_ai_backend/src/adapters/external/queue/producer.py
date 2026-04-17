"""Queue producer for transcription jobs."""
from __future__ import annotations

from asyncio import Queue
from datetime import datetime, timezone

from src.adapters.db.mongo.client import get_database
from src.adapters.external.queue.azure_queue import AzureQueueAdapter
from src.core.config import get_settings


LOCAL_TRANSCRIPTION_QUEUE: Queue[str] = Queue()


class TranscriptionQueueProducer:
    """Persist queue messages for worker consumption."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.queue = get_database().transcription_queue
        self.azure_queue = None
        self.use_azure_queue = False
        if (
            not self.settings.use_local_adapters
            and self.settings.azure_storage_account_name
            and self.settings.azure_storage_account_key
            and self.settings.azure_queue_name
        ):
            self.azure_queue = AzureQueueAdapter()
            self.use_azure_queue = True

    def enqueue(self, job_id: str) -> None:
        if self.settings.use_local_adapters:
            LOCAL_TRANSCRIPTION_QUEUE.put_nowait(job_id)
            return
        if self.use_azure_queue and self.azure_queue is not None:
            self.azure_queue.enqueue(job_id)
            return
        self.queue.insert_one(
            {
                "job_id": job_id,
                "queued_at": datetime.now(timezone.utc),
            }
        )
