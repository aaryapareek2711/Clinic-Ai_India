"""MongoDB client module."""
from contextvars import ContextVar
from functools import lru_cache
from pymongo import MongoClient, monitoring
from pymongo.database import Database

from src.core.config import get_settings

_request_db_stats: ContextVar[dict[str, float | int] | None] = ContextVar("request_db_stats", default=None)


class _MongoTimingListener(monitoring.CommandListener):
    """Collect lightweight per-request Mongo timings via contextvar."""

    def started(self, event) -> None:  # pragma: no cover - noop hook
        return

    def succeeded(self, event) -> None:
        stats = _request_db_stats.get()
        if stats is None:
            return
        stats["calls"] = int(stats.get("calls", 0)) + 1
        stats["duration_ms"] = float(stats.get("duration_ms", 0.0)) + float(event.duration_micros) / 1000.0

    def failed(self, event) -> None:
        stats = _request_db_stats.get()
        if stats is None:
            return
        stats["calls"] = int(stats.get("calls", 0)) + 1
        stats["duration_ms"] = float(stats.get("duration_ms", 0.0)) + float(event.duration_micros) / 1000.0


_TIMING_LISTENER = _MongoTimingListener()


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    """Return cached Mongo client."""
    settings = get_settings()
    return MongoClient(settings.mongodb_url, event_listeners=[_TIMING_LISTENER])


def get_database() -> Database:
    """Return active Mongo database."""
    settings = get_settings()
    return get_mongo_client()[settings.mongodb_db_name]


def begin_request_db_stats() -> object:
    """Initialize per-request DB metrics and return context token."""
    return _request_db_stats.set({"calls": 0, "duration_ms": 0.0})


def end_request_db_stats(token: object) -> dict[str, float | int]:
    """Finalize per-request DB metrics and restore previous context."""
    stats = _request_db_stats.get() or {"calls": 0, "duration_ms": 0.0}
    _request_db_stats.reset(token)
    return {
        "calls": int(stats.get("calls", 0)),
        "duration_ms": round(float(stats.get("duration_ms", 0.0)), 2),
    }
