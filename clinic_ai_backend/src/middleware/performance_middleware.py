"""Request performance middleware with endpoint and DB timing."""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from src.adapters.db.mongo.client import begin_request_db_stats, end_request_db_stats

_HISTOGRAM_BUCKETS_MS = [50, 100, 250, 500, 1000, 2000, 5000]
_request_histogram: dict[str, int] = defaultdict(int)
_histogram_lock = Lock()


def _bucket_key(latency_ms: float) -> str:
    for bucket in _HISTOGRAM_BUCKETS_MS:
        if latency_ms <= bucket:
            return f"le_{bucket}ms"
    return "gt_5000ms"


def _record_histogram(method: str, route: str, latency_ms: float) -> None:
    bucket = _bucket_key(latency_ms)
    key = f"{method} {route} {bucket}"
    with _histogram_lock:
        _request_histogram[key] += 1


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Adds request latency + DB timing headers for observability."""

    async def dispatch(self, request: Request, call_next):
        token = begin_request_db_stats()
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            endpoint_latency_ms = (time.perf_counter() - start) * 1000.0
            db_stats = end_request_db_stats(token)
            route = request.url.path
            _record_histogram(request.method, route, endpoint_latency_ms)
        # Server-Timing is standards-based and visible in browser devtools.
        response.headers["Server-Timing"] = (
            f'app;dur={endpoint_latency_ms:.2f},db;dur={float(db_stats["duration_ms"]):.2f}'
        )
        response.headers["X-Endpoint-Latency-Ms"] = f"{endpoint_latency_ms:.2f}"
        response.headers["X-DB-Latency-Ms"] = f'{float(db_stats["duration_ms"]):.2f}'
        response.headers["X-DB-Calls"] = str(int(db_stats["calls"]))
        return response
