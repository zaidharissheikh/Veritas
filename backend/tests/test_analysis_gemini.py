"""Gemini model chain: order, move-on rules, same-model retry only for malformed answers."""

import asyncio
import base64
import json
import time

import httpx
import pytest

from app.analysis.gemini import GeminiConfig, generate_json
from app.errors import ApiError
from tests.gemini_fakes import ANSWER, KEY, PROMPT, REQUEST, answer, run_chain, status


def test_success_sends_key_in_header_and_json_mode_body():
    seen = []

    def capture(request):
        seen.append(request)
        return answer()

    calls = []
    assert run_chain([capture], calls) == ANSWER
    assert calls == ["m1"]
    request = seen[0]
    assert request.headers["x-goog-api-key"] == KEY
    assert "key=" not in str(request.url)
    body = json.loads(request.content)
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert body["generationConfig"]["temperature"] <= 0.2
    assert body["systemInstruction"]["parts"][0]["text"] == "system"
    image_part, text_part = body["contents"][0]["parts"]
    assert base64.b64decode(image_part["inlineData"]["data"]) == b"\x89PNG"
    assert text_part == {"text": PROMPT}


def test_thought_parts_are_skipped():
    assert run_chain([answer(thought="thinking about {not json")], []) == ANSWER


def test_503_moves_to_next_model_in_order_without_sleeping(monkeypatch):
    slept = []

    async def no_sleep(seconds, *args):
        slept.append(seconds)

    monkeypatch.setattr(asyncio, "sleep", no_sleep)
    calls = []
    started = time.monotonic()
    result = run_chain([status(503, "UNAVAILABLE"), status(503, "UNAVAILABLE"), answer()], calls)

    assert result == ANSWER
    assert calls == ["m1", "m2", "m3"]
    assert slept == [] and time.monotonic() - started < 2


@pytest.mark.parametrize(
    "failure",
    [
        status(429, "RESOURCE_EXHAUSTED"),
        status(404, "NOT_FOUND"),
        status(500, "INTERNAL"),
        status(504, "DEADLINE_EXCEEDED"),
        httpx.ReadTimeout("slow"),
        httpx.ConnectError("refused"),
    ],
    ids=["429", "404", "500", "504", "timeout", "transport"],
)
def test_busy_missing_or_unreachable_model_is_not_retried(failure):
    calls = []
    assert run_chain([failure, answer()], calls) == ANSWER
    assert calls == ["m1", "m2"]


def test_rate_limited_everywhere_raises_rate_limited():
    calls = []
    with pytest.raises(ApiError) as error:
        run_chain([status(429, "RESOURCE_EXHAUSTED")] * 3, calls)
    assert (error.value.code, error.value.status_code) == ("RATE_LIMITED", 429)
    assert calls == ["m1", "m2", "m3"]


def test_mixed_failures_are_model_unavailable():
    with pytest.raises(ApiError) as error:
        run_chain([status(429), status(503), httpx.ReadTimeout("slow")], [])
    assert (error.value.code, error.value.status_code) == ("MODEL_UNAVAILABLE", 502)


def test_invalid_json_retries_the_same_model_once():
    calls = []
    fenced = answer(f"```json\n{json.dumps(ANSWER)}\n```")
    assert run_chain([answer("not json at all"), fenced], calls) == ANSWER
    assert calls == ["m1", "m1"]


def test_invalid_answer_twice_moves_to_next_model():
    calls = []
    wrong_shape = answer(json.dumps({"baitSwitchScore": 1}))
    assert run_chain([wrong_shape, httpx.Response(200, text="<html>"), answer()], calls) == ANSWER
    assert calls == ["m1", "m1", "m2"]


def test_wrong_shape_everywhere_is_model_unavailable():
    calls = []
    wrong = answer(json.dumps({"baitSwitchScore": 1}))
    with pytest.raises(ApiError) as error:
        run_chain([wrong] * 6, calls)
    assert error.value.code == "MODEL_UNAVAILABLE"
    assert calls == ["m1", "m1", "m2", "m2", "m3", "m3"]


@pytest.mark.parametrize("code", [400, 401, 403])
def test_rejected_request_stops_the_chain(code):
    calls = []
    with pytest.raises(ApiError) as error:
        run_chain([status(code, "INVALID_ARGUMENT", "bad schema"), answer()], calls)
    assert error.value.code == "MODEL_UNAVAILABLE"
    assert calls == ["m1"]


def test_duplicate_models_are_tried_once():
    calls = []
    config = GeminiConfig(api_key=KEY, models=("m1", "m1", "m2"))
    run_chain([status(503), answer()], calls, config=config)
    assert calls == ["m1", "m2"]


@pytest.mark.parametrize("config", [GeminiConfig(api_key="", models=("m1",)), GeminiConfig(api_key=KEY, models=())])
def test_missing_key_or_models_fails_without_calling(config):
    with pytest.raises(ApiError) as error:
        asyncio.run(generate_json(REQUEST, config=config))
    assert error.value.code == "MODEL_UNAVAILABLE"
