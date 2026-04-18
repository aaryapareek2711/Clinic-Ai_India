"""Dedicated worker entrypoint (no HTTP). Use with Dockerfile.worker / a second Render service.

Requires ``USE_LOCAL_ADAPTERS=false`` so the web tier enqueues to Mongo ``transcription_queue``
and this process consumes the same collection.
"""
from __future__ import annotations

import asyncio

from src.core.config import get_settings
from src.workers.transcription_worker import _worker_loop


async def _main() -> None:
    settings = get_settings()
    stop = asyncio.Event()
    concurrency = max(1, int(settings.transcription_worker_concurrency))
    poll_interval = max(0.2, float(settings.transcription_worker_poll_interval_sec))
    await asyncio.gather(
        *[_worker_loop(i + 1, stop, poll_interval) for i in range(concurrency)],
    )


if __name__ == "__main__":
    asyncio.run(_main())
