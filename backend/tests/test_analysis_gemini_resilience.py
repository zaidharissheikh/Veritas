"""Gemini chain resilience: cooldown skipping, the overall deadline, and keeping secrets out of logs."""

import asyncio
import logging
import time

import httpx
import pytest

from app.analysis import gemini
from app.analysis.gemini import GeminiConfig
from app.analysis.model_health import ModelHealth
from app.errors import ApiError
from tests.gemini_fakes import ANSWER, CHAIN, KEY, PROMPT, FakeClock, answer, run_chain, status


def test_failures_cool_models_and_retry_delay_is_used():
    clock = FakeClock()
    health = ModelHealth(clock=clock)
    retry_info = {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "20s"}
    run_chain([status(503), status(429, details=[retry_info]), answer()], [], health=health, clock=clock)

    assert health.is_cooling("m1") and health.is_cooling("m2") and not health.is_cooling("m3")
    clock.advance(21)  # m2 asked for 20 s, m1 got the 60 s default
    assert health.is_cooling("m1") and not health.is_cooling("m2")


def test_cooling_models_are_skipped_by_later_requests():
    health = ModelHealth()
    health.mark_cooling("m1")
    calls = []
    assert run_chain([answer()], calls, health=health) == ANSWER
    assert calls == ["m2"]


def test_all_cooling_tries_every_model_oldest_cooldown_first_and_success_clears():
    clock = FakeClock()
    health = ModelHealth(clock=clock)
    for model in ("m2", "m3", "m1"):
        health.mark_cooling(model)
        clock.advance(10)
    calls = []
    assert run_chain([status(503), status(503), answer()], calls, health=health, clock=clock) == ANSWER

    assert calls == ["m2", "m3", "m1"]
    assert not health.is_cooling("m1")
    assert health.order(CHAIN) == ["m1"]


def test_invalid_answers_and_rejections_do_not_cool_the_model():
    health = ModelHealth()
    with pytest.raises(ApiError):
        run_chain([answer("nope"), status(400, "INVALID_ARGUMENT")], [], health=health)
    assert not health.is_cooling("m1")


def test_overall_deadline_stops_the_chain():
    clock = FakeClock()

    def slow_503(request):
        clock.advance(40)  # each model takes 40 s of the 75 s budget
        return status(503)

    calls = []
    with pytest.raises(ApiError) as error:
        run_chain([slow_503, slow_503, answer()], calls, clock=clock)
    assert (error.value.code, error.value.status_code) == ("MODEL_UNAVAILABLE", 502)
    assert calls == ["m1", "m2"]


def test_hung_model_times_out_then_next_model_answers():
    async def hang(request):
        await asyncio.sleep(30)

    health = ModelHealth()
    config = GeminiConfig(api_key=KEY, models=CHAIN, timeout_seconds=0.05)
    calls = []
    started = time.monotonic()
    assert run_chain([hang, answer()], calls, config=config, health=health) == ANSWER
    assert calls == ["m1", "m2"] and time.monotonic() - started < 5
    assert health.is_cooling("m1")


def test_deadline_cuts_a_hung_request_short_and_is_model_unavailable(monkeypatch):
    async def hang(request):
        await asyncio.sleep(30)

    monkeypatch.setattr(gemini, "MIN_ATTEMPT_SECONDS", 0.01)
    health = ModelHealth()
    config = GeminiConfig(api_key=KEY, models=CHAIN, timeout_seconds=30, deadline_seconds=0.1)
    calls = []
    started = time.monotonic()
    with pytest.raises(ApiError) as error:
        run_chain([hang, hang, hang], calls, config=config, health=health)
    assert error.value.code == "MODEL_UNAVAILABLE" and time.monotonic() - started < 5
    assert calls == ["m1"]
    assert not health.is_cooling("m1")  # cut short by our deadline, not the model's fault


def test_key_and_prompt_never_reach_logs_or_errors(caplog):
    caplog.set_level(logging.DEBUG)
    echo = f"API key {KEY} rejected for prompt {PROMPT}"
    responses = [status(503, message=echo), httpx.ReadTimeout(KEY), status(400, "INVALID_ARGUMENT", echo)]
    with pytest.raises(ApiError) as error:
        run_chain(responses, [])

    texts = [caplog.text, str(error.value), error.value.message, repr(error.value)]
    assert all(KEY not in text and PROMPT not in text for text in texts)
    assert "m1" in caplog.text and "HTTP 503" in caplog.text and "INVALID_ARGUMENT" in caplog.text
