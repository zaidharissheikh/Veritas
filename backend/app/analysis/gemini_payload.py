"""Pure generateContent shapes: build the request body and read the model's JSON answer."""

import base64
import json
from dataclasses import dataclass

from pydantic import BaseModel, ValidationError

TEMPERATURE = 0.2


@dataclass(frozen=True)
class InlineImage:
    data: bytes
    mime_type: str = "image/jpeg"


@dataclass(frozen=True)
class GeminiRequest:
    system_instruction: str
    prompt: str
    response_schema: dict
    output_model: type[BaseModel]
    image: InlineImage | None = None


class InvalidAnswer(ValueError):
    """The model replied, but not with JSON that matches the expected shape."""


def build_request_body(request: GeminiRequest) -> dict:
    parts: list[dict] = []
    if request.image is not None:
        encoded = base64.b64encode(request.image.data).decode("ascii")
        parts.append({"inlineData": {"mimeType": request.image.mime_type, "data": encoded}})
    parts.append({"text": request.prompt})
    return {
        "systemInstruction": {"parts": [{"text": request.system_instruction}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": TEMPERATURE,
            "responseMimeType": "application/json",
            "responseSchema": request.response_schema,
        },
    }


def parse_answer(payload: dict, output_model: type[BaseModel]) -> dict:
    """Validated answer as a plain dict, or InvalidAnswer."""
    try:
        data = json.loads(_strip_code_fence(_final_answer_text(payload)))
        return output_model.model_validate(data).model_dump()
    except (ValueError, ValidationError, AttributeError, TypeError) as error:
        raise InvalidAnswer(type(error).__name__) from error


def _final_answer_text(payload: dict) -> str:
    """Thinking models may return thought parts first; the answer is the last non-thought text."""
    candidates = payload.get("candidates") or []
    if not candidates:
        raise InvalidAnswer("no candidates (the prompt may have been blocked)")
    parts = (candidates[0].get("content") or {}).get("parts") or []
    texts = [part["text"] for part in parts if isinstance(part.get("text"), str) and not part.get("thought")]
    if not texts:
        raise InvalidAnswer("no answer text")
    return texts[-1]


def _strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1].rsplit("```", 1)[0]
    return stripped
