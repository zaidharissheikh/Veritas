"""A bounded, per-process abuse limit for registration, resend, and password recovery.

For multiple server workers, also configure a shared rate limit at the reverse proxy.
"""
from collections import OrderedDict, deque
from threading import Lock
from time import monotonic

from fastapi import Request

from app.errors import ApiError

_attempts: OrderedDict[str, deque] = OrderedDict()
_lock = Lock()


def email_request_limit(request: Request) -> None:
    address = request.client.host if request.client else "unknown"
    now = monotonic()
    with _lock:
        attempts = _attempts.setdefault(address, deque())
        _attempts.move_to_end(address)
        while attempts and attempts[0] <= now - 3600:
            attempts.popleft()
        if len(attempts) >= 30:
            raise ApiError("RATE_LIMITED", "Too many email requests. Please try again in an hour.", 429)
        attempts.append(now)
        while len(_attempts) > 10000:
            _attempts.popitem(last=False)
