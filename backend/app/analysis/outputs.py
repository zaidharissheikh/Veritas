"""Pydantic shapes of what Gemini must return; anything else counts as an invalid answer.

Ranges are clamped later in scoring.py instead of rejected, so a 101 does not cost a retry.
"""

from typing import Literal

from pydantic import BaseModel, Field


class ModelHighlight(BaseModel):
    token: str
    # Kept as plain text: scoring.py drops unknown kinds instead of failing the whole answer.
    kind: str
    weight: float = 0.5


class ArticleModelOutput(BaseModel):
    stanceLabel: Literal["Agrees", "Disagrees", "Discusses", "Unrelated"]
    stanceConfidence: float
    sensationalismScore: float
    summary: str = Field(min_length=1)
    highlights: list[ModelHighlight] = []


class VideoModelOutput(BaseModel):
    baitSwitchScore: float
    titleHype: float
    summary: str = Field(min_length=1)
    highlights: list[ModelHighlight] = []
