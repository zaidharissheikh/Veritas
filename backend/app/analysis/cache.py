"""In-memory TTL cache for analysis results.

The get/set interface is deliberately tiny so Redis can replace it later (SRS FR-10).
"""

import copy
import hashlib
import threading
import time
from collections import OrderedDict
from typing import Any, Callable

DAY_SECONDS = 24 * 60 * 60
DEFAULT_MAX_ENTRIES = 500


class TtlCache:
    def __init__(
        self,
        ttl_seconds: float = DAY_SECONDS,
        max_entries: int = DEFAULT_MAX_ENTRIES,
        clock: Callable[[], float] = time.monotonic,
    ):
        self._ttl_seconds = ttl_seconds
        self._max_entries = max_entries
        self._clock = clock
        self._entries: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        # uvicorn may serve requests from worker threads (sync dependencies), so guard the dict.
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if self._clock() >= expires_at:
                del self._entries[key]
                return None
            self._entries.move_to_end(key)
            return copy.deepcopy(value)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._entries[key] = (self._clock() + self._ttl_seconds, copy.deepcopy(value))
            self._entries.move_to_end(key)
            while len(self._entries) > self._max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)


def make_key(*parts: str) -> str:
    """SHA-256 of the whitespace-normalised parts, so trivial spacing changes still hit."""
    normalised = "\x1f".join(" ".join((part or "").split()) for part in parts)
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


analysis_cache = TtlCache()
