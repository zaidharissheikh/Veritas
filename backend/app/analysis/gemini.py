"""Async Gemini generateContent client over an ordered model chain (BACKEND_CONTRACT section 3).

Models are tried in chain order, skipping models that are cooling down after a 429/5xx/timeout
(unless every model is cooling). A busy, missing or slow model moves straight on to the next one:
no sleep and no same-model retry, because retrying a rate-limited model only burns quota. Only an
answer that is not valid JSON for the schema earns one retry on the same model. A rejected request
(400/403...) stops the chain. The whole chain has a ~75 s deadline so the popup never waits minutes.

Logs only model names, reasons, status codes and timings; never the API key or prompt text.
"""

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Callable

import httpx

from app.analysis import gemini_errors as errors
from app.analysis.gemini_errors import CallFailure, api_error_for, failure_from_response
from app.analysis.gemini_payload import GeminiRequest, InvalidAnswer, build_request_body, parse_answer
from app.analysis.http import http_client_scope
from app.analysis.model_health import ModelHealth, model_health
from app.config import settings
from app.errors import ApiError

REQUEST_TIMEOUT_SECONDS = 30.0
CHAIN_DEADLINE_SECONDS = 75.0
INVALID_OUTPUT_ATTEMPTS = 2  # the same model is asked again once, only after a malformed answer
MIN_ATTEMPT_SECONDS = 1.0  # an attempt is not started with less time than this left
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GeminiConfig:
    api_key: str
    models: tuple[str, ...]
    base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    timeout_seconds: float = REQUEST_TIMEOUT_SECONDS
    deadline_seconds: float = CHAIN_DEADLINE_SECONDS


@dataclass
class _Run:
    """State for one generate_json call: the shared client and the chain deadline."""

    http: httpx.AsyncClient
    request: GeminiRequest
    config: GeminiConfig
    clock: Callable[[], float]
    deadline: float

    def remaining(self) -> float:
        return self.deadline - self.clock()


def config_from_settings() -> GeminiConfig:
    return GeminiConfig(
        api_key=settings.gemini_api_key.strip(),
        models=settings.gemini_model_chain,
        base_url=settings.gemini_base_url.rstrip("/"),
    )


async def generate_json(
    request: GeminiRequest,
    *,
    config: GeminiConfig | None = None,
    client: httpx.AsyncClient | None = None,
    health: ModelHealth | None = None,
    clock: Callable[[], float] = time.monotonic,
) -> dict:
    """Return the model's JSON answer validated against request.output_model, or raise ApiError."""
    config = config or config_from_settings()
    health = health or model_health
    if not config.api_key or not config.models:
        raise ApiError("MODEL_UNAVAILABLE", "The analysis model is not configured on the server.", 502)
    failures: list[CallFailure] = []
    async with http_client_scope(client, config.timeout_seconds) as http:
        run = _Run(http, request, config, clock, clock() + config.deadline_seconds)
        for model in _plan(health, config.models):
            if run.remaining() < MIN_ATTEMPT_SECONDS:
                logger.warning("Gemini chain deadline (%.0fs) reached before trying %s", config.deadline_seconds, model)
                failures.append(CallFailure(errors.DEADLINE))
                break
            try:
                answer = await _try_model(run, model)
            except CallFailure as failure:
                failures.append(failure)
                _note_failure(health, model, failure)
                if failure.reason == errors.REJECTED:
                    break
                continue
            health.mark_healthy(model)
            return answer
    raise api_error_for(failures)


def _plan(health: ModelHealth, models: tuple[str, ...]) -> list[str]:
    order = health.order(models)
    skipped = [model for model in models if model not in order]
    if skipped:
        logger.info("Gemini skipping cooling models: %s", ", ".join(skipped))
    elif all(health.is_cooling(model) for model in order):
        logger.info("All Gemini models are cooling; trying them anyway: %s", ", ".join(order))
    return order


async def _try_model(run: _Run, model: str) -> dict:
    for attempt in range(1, INVALID_OUTPUT_ATTEMPTS + 1):
        started = run.clock()
        try:
            answer = parse_answer(await _post_generate(run, model), run.request.output_model)
        except InvalidAnswer:
            failure = CallFailure(errors.INVALID_OUTPUT)
        except CallFailure as error:
            failure = error
        else:
            logger.info("Gemini model %s answered in %.1fs (attempt %d)", model, run.clock() - started, attempt)
            return answer
        logger.warning("Gemini model %s attempt %d failed: %s", model, attempt, failure.describe())
        last_try = attempt == INVALID_OUTPUT_ATTEMPTS or run.remaining() < MIN_ATTEMPT_SECONDS
        if failure.reason != errors.INVALID_OUTPUT or last_try:
            raise failure
    raise CallFailure(errors.UNAVAILABLE)  # unreachable: the loop always returns or raises


async def _post_generate(run: _Run, model: str) -> dict:
    budget = min(run.config.timeout_seconds, run.remaining())
    cut_short = budget < run.config.timeout_seconds
    try:
        async with asyncio.timeout(budget):
            response = await run.http.post(
                f"{run.config.base_url}/models/{model}:generateContent",
                headers={"x-goog-api-key": run.config.api_key},
                json=build_request_body(run.request),
                timeout=budget,
            )
    except (TimeoutError, httpx.TimeoutException):
        # Cut short by the chain deadline is not the model's fault, so it is not cooled.
        raise CallFailure(errors.DEADLINE if cut_short else errors.TIMEOUT, cool=not cut_short) from None
    except httpx.TransportError as error:
        raise CallFailure(errors.UNAVAILABLE, detail=type(error).__name__) from None
    failure = failure_from_response(response)
    if failure is not None:
        raise failure
    try:
        return response.json()
    except ValueError:
        raise CallFailure(errors.INVALID_OUTPUT) from None


def _note_failure(health: ModelHealth, model: str, failure: CallFailure) -> None:
    if failure.cool:
        seconds = health.mark_cooling(model, failure.cooldown)
        logger.info("Gemini model %s cooling for %.0fs after %s", model, seconds, failure.reason)
