"""Minimal in-process TTL cache (single-process optimization)."""
from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass
class _Entry:
    expires_at: float
    value: Any


class TTLCache:
    def __init__(self, *, max_items: int = 512) -> None:
        self._max = max(32, int(max_items))
        self._data: dict[str, _Entry] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        now = time.time()
        with self._lock:
            ent = self._data.get(key)
            if not ent:
                return None
            if ent.expires_at <= now:
                self._data.pop(key, None)
                return None
            return ent.value

    def set(self, key: str, value: Any, ttl_sec: float) -> None:
        ttl = max(0.0, float(ttl_sec))
        expires = time.time() + ttl
        with self._lock:
            if len(self._data) >= self._max:
                # simple eviction: drop oldest expiry
                oldest_key = min(self._data.items(), key=lambda kv: kv[1].expires_at)[0]
                self._data.pop(oldest_key, None)
            self._data[key] = _Entry(expires_at=expires, value=value)

    def delete_prefix(self, prefix: str) -> None:
        with self._lock:
            for k in list(self._data.keys()):
                if k.startswith(prefix):
                    self._data.pop(k, None)

