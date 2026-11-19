"""How one Gemini attempt failed, what that means for the chain, and the ApiError we finally raise.

Only model names, reasons, HTTP status codes and Google's status enum are ever logged: Google's
free-text error message and our prompt text are never logged or put into exceptions.
"""

import re

import httpx

from app.analysis.model_health import MAX_COOLDOWN_SECONDS
from app.errors import ApiError

# Reasons. Only "rejected" stops the chain; "invalid_output" earns one same-model retry.
RATE_LIMITED = "rate_limited"
UNAVAILABLE = "unavailable"  # 5xx, 404 (model not open to this key), transport error
TIMEOUT = "timeout"
DEADLINE = "deadline"  # the whole chain ran out of time
INVALID_OUTPUT = "invalid_output"
REJECTED = "rejected"  # 400/401/403...: our request or key is bad, other models won't help

_DURATION = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*s?\s*$")
_GOOGLE_STATUS = re.compile(r"^[A-Z_]{1,40}$")


class CallFailure(Exception):
    """One failed attempt. `cool` says whether to cool the model; `cooldown` is the server's
    suggested delay in seconds (None means the registry default)."""

    def __init__(self, reason: str, *, status: int | None = None, detail: str = "",
                 cool: bool = False, cooldown: float | None = None):
        super().__init__(reason)
        self.reason = reason
        self.status = status
        self.detail = detail  # Google's status enum or an exception type name, never free text
        self.cool = cool
        self.cooldown = cooldown

    def describe(self) -> str:
        parts = [self.reason]
        if self.status is not None:
            parts.append(f"HTTP {self.status}")
        if self.detail:
            parts.append(self.detail)
        return " ".join(parts)


def failure_from_response(response: httpx.Response) -> CallFailure | None:
    """None for a 2xx/3xx answer, otherwise the classified failure."""
    status = response.status_code
    if status < 400:
        return None
    detail = _google_status(response)
    if status == 429:
        return CallFailure(RATE_LIMITED, status=status, detail=detail, cool=True,
                           cooldown=retry_delay_seconds(response))
    if status == 404:
        # The model is not open to this key; that will not change soon, so cool it for the max.
        return CallFailure(UNAVAILABLE, status=status, detail=detail, cool=True,
                           cooldown=MAX_COOLDOWN_SECONDS)
    if status >= 500:
        return CallFailure(UNAVAILABLE, status=status, detail=detail, cool=True,
                           cooldown=retry_delay_seconds(response))
    return CallFailure(REJECTED, status=status, detail=detail)


def retry_delay_seconds(response: httpx.Response) -> float | None:
    """Retry-After header (seconds) or Google's RetryInfo.retryDelay ("37s"), else None."""
    header = _parse_duration(response.headers.get("retry-after", ""))
    if header is not None:
        return header
    for detail in _error_body(response).get("details") or []:
        if isinstance(detail, dict) and "retryDelay" in detail:
            parsed = _parse_duration(str(detail["retryDelay"]))
            if parsed is not None:
                return parsed
    return None


def api_error_for(failures: list[CallFailure]) -> ApiError:
    """RATE_LIMITED only when every attempted model said 429; anything else is MODEL_UNAVAILABLE."""
    if failures and all(failure.reason == RATE_LIMITED for failure in failures):
        return ApiError("RATE_LIMITED", "The analysis service is busy right now. Please try again in a minute.", 429)
    return model_unavailable()


def model_unavailable() -> ApiError:
    return ApiError("MODEL_UNAVAILABLE", "The analysis model is unavailable right now. Please try again shortly.", 502)


def _parse_duration(text: str) -> float | None:
    match = _DURATION.match(text or "")
    return float(match.group(1)) if match else None


def _error_body(response: httpx.Response) -> dict:
    try:
        error = response.json().get("error")
    except (ValueError, AttributeError):
        return {}
    return error if isinstance(error, dict) else {}


def _google_status(response: httpx.Response) -> str:
    status = str(_error_body(response).get("status", ""))
    return status if _GOOGLE_STATUS.match(status) else ""
