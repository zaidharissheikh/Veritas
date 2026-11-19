"""In-memory cooldown registry for Gemini models (BACKEND_CONTRACT section 3).

A model that answered 429/5xx or timed out is "cooling" for a while, so later requests skip it
instead of spending seconds (and free-tier quota) on a model known to be overloaded. A success
clears the mark. Thread-safe: uvicorn may run request code on worker threads.
"""

import threading
import time
from typing import Callable, Iterable

DEFAULT_COOLDOWN_SECONDS = 60.0
MAX_COOLDOWN_SECONDS = 300.0
MIN_COOLDOWN_SECONDS = 1.0


def clamp_cooldown(seconds: float | None) -> float:
    """Default when unknown; otherwise kept within [1 s, 5 min]."""
    if seconds is None:
        return DEFAULT_COOLDOWN_SECONDS
    return min(max(float(seconds), MIN_COOLDOWN_SECONDS), MAX_COOLDOWN_SECONDS)


class ModelHealth:
    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._clock = clock
        self._cooling_until: dict[str, float] = {}
        self._lock = threading.Lock()

    def mark_cooling(self, model: str, seconds: float | None = None) -> float:
        """Cool `model` for `seconds` (default 60 s, capped at 5 min). Returns the cooldown used."""
        cooldown = clamp_cooldown(seconds)
        with self._lock:
            self._cooling_until[model] = self._clock() + cooldown
        return cooldown

    def mark_healthy(self, model: str) -> None:
        with self._lock:
            self._cooling_until.pop(model, None)

    def is_cooling(self, model: str) -> bool:
        with self._lock:
            return self._cooling_until_locked(model) is not None

    def order(self, models: Iterable[str]) -> list[str]:
        """Models to try now, in chain order, skipping cooling ones.

        If every model is cooling, all of them are returned anyway, the one whose cooldown ends
        soonest first (with the default cooldown that is the oldest mark).
        """
        chain = list(dict.fromkeys(models))
        with self._lock:
            until = {model: self._cooling_until_locked(model) for model in chain}
        ready = [model for model in chain if until[model] is None]
        if ready:
            return ready
        return sorted(chain, key=lambda model: until[model])

    def reset(self) -> None:
        with self._lock:
            self._cooling_until.clear()

    def _cooling_until_locked(self, model: str) -> float | None:
        until = self._cooling_until.get(model)
        if until is None:
            return None
        if self._clock() >= until:
            del self._cooling_until[model]
            return None
        return until


model_health = ModelHealth()
