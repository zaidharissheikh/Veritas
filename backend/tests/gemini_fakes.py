"""Scripted Gemini endpoint for the chain tests: no network, no real key, optional fake clock."""

import asyncio
import inspect
import json
import time

import httpx

from app.analysis.gemini import GeminiConfig, generate_json
from app.analysis.gemini_payload import GeminiRequest, InlineImage
from app.analysis.model_health import ModelHealth
from app.analysis.outputs import VideoModelOutput

KEY = "test-key-NEVER-LOGGED-0123456789"
PROMPT = "UNTRUSTED PROMPT TEXT that must never be logged"
CHAIN = ("m1", "m2", "m3")
CONFIG = GeminiConfig(api_key=KEY, models=CHAIN)
ANSWER = {"baitSwitchScore": 40, "titleHype": 70, "summary": "Mostly delivers.", "highlights": []}
REQUEST = GeminiRequest(
    system_instruction="system",
    prompt=PROMPT,
    response_schema={"type": "OBJECT"},
    output_model=VideoModelOutput,
    image=InlineImage(b"\x89PNG", "image/png"),
)


class FakeClock:
    def __init__(self, now: float = 1_000.0):
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def answer(text: str | None = None, thought: str | None = None) -> httpx.Response:
    text = json.dumps(ANSWER) if text is None else text
    parts = ([{"text": thought, "thought": True}] if thought else []) + [{"text": text}]
    return httpx.Response(200, json={"candidates": [{"content": {"role": "model", "parts": parts}}]})


def status(code: int, google_status: str = "", message: str = "", **extra) -> httpx.Response:
    error = {"code": code, "message": message, "status": google_status, **extra}
    return httpx.Response(code, json={"error": error})


def model_of(request: httpx.Request) -> str:
    return request.url.path.rsplit("/", 1)[-1].split(":")[0]


def run_chain(responses: list, calls: list, *, config: GeminiConfig = CONFIG,
              health: ModelHealth | None = None, clock=time.monotonic) -> dict:
    """Serve scripted responses in order, recording the model of each call.

    A scripted item may be an httpx.Response, an exception to raise, or a callable
    (sync or async) taking the request and returning a response.
    """
    health = health if health is not None else ModelHealth()

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append(model_of(request))
        scripted = responses[len(calls) - 1]
        if isinstance(scripted, Exception):
            raise scripted
        if callable(scripted):
            result = scripted(request)
            return await result if inspect.isawaitable(result) else result
        return scripted

    async def go() -> dict:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await generate_json(REQUEST, config=config, client=client, health=health, clock=clock)

    return asyncio.run(go())
