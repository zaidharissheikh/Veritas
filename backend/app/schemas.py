"""API shapes (CONTRACTS sections 5 and 6). Python names are snake_case; JSON is camelCase."""
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_serializer, model_validator
from pydantic.alias_generators import to_camel

from app.timeutil import iso_z

ContentType = Literal["article", "video"]
RiskLevel = Literal["low", "medium", "high"]
HighlightKind = Literal["hyperbole", "emotional", "clickbait"]
StanceLabel = Literal["Agrees", "Disagrees", "Discusses", "Unrelated"]
Period = Literal["7d", "30d", "90d", "all"]
TypeFilter = Literal["all", "article", "video"]

Score = Annotated[int, Field(ge=0, le=100)]
Fraction = Annotated[float, Field(ge=0, le=1)]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class User(CamelModel):
    id: str
    email: str
    created_at: datetime

    @field_serializer("created_at")
    def _created_at_iso(self, value: datetime) -> str:
        return iso_z(value)


class Highlight(CamelModel):
    token_index: int = Field(ge=0)
    token: str
    weight: Fraction
    kind: HighlightKind


class Gauge(CamelModel):
    key: str
    label: str
    value: Score


class ArticleDetail(CamelModel):
    stance_label: StanceLabel
    stance_confidence: Fraction
    sensationalism_score: Score


class VideoDetail(CamelModel):
    video_id: str
    thumbnail_url: str
    bait_switch_score: Score


# Keys that are left out of the JSON when empty, so an article never shows "video": null.
_OMIT_WHEN_NONE = ("article", "video", "saved")


class AnalysisResult(CamelModel):
    # New results use 8 hex chars; the seeded demo rows keep the 6-char ids of the dashboard mock.
    id: str = Field(pattern=r"^res_[0-9a-f]{6,32}$")
    content_type: ContentType
    url: str
    title: str
    source: str
    analyzed_at: datetime
    risk_score: Score
    risk_level: RiskLevel
    gauges: list[Gauge] = Field(min_length=2, max_length=2)
    summary: str
    excerpt: str
    highlights: list[Highlight] = Field(default_factory=list)
    article: ArticleDetail | None = None
    video: VideoDetail | None = None
    is_mock: bool = False
    saved: bool | None = None

    @model_validator(mode="after")
    def _detail_matches_type(self) -> "AnalysisResult":
        if getattr(self, self.content_type) is None:
            raise ValueError(f"a {self.content_type} result needs its '{self.content_type}' block")
        return self

    @field_serializer("analyzed_at")
    def _analyzed_at_iso(self, value: datetime) -> str:
        return iso_z(value)

    @model_serializer(mode="wrap")
    def _omit_empty_optionals(self, handler):
        data = handler(self)
        return {key: value for key, value in data.items() if not (key in _OMIT_WHEN_NONE and value is None)}


class ArticleRequest(CamelModel):
    url: str = Field(pattern=r"^https?://", max_length=2048)
    headline: str = Field(max_length=1000)
    body: str = Field(max_length=400_000)


class VideoRequest(CamelModel):
    url: str = Field(pattern=r"^https?://", max_length=2048)
    # Restricting the character set keeps the id safe to place in YouTube URLs.
    video_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,32}$")
    title: str = Field(max_length=1000)
    thumbnail_url: str | None = Field(default=None, max_length=2048)
    channel: str | None = Field(default=None, max_length=500)


class Credentials(CamelModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)


class UserEnvelope(CamelModel):
    user: User


class VerificationRequest(CamelModel):
    token: str = Field(min_length=40, max_length=128)


class ResendVerificationRequest(CamelModel):
    email: str = Field(min_length=3, max_length=254)


class PasswordResetRequest(VerificationRequest):
    password: str = Field(max_length=200)


class MessageResponse(CamelModel):
    message: str


class LoginResponse(CamelModel):
    user: User
    token: str


class DietPoint(CamelModel):
    date: str
    avg_score: int | None
    count: int


class RiskMix(CamelModel):
    low: int = 0
    medium: int = 0
    high: int = 0


class TypeMix(CamelModel):
    article: int = 0
    video: int = 0


class TopTerm(CamelModel):
    term: str
    weight: float
    count: int
    kind: HighlightKind


class DietSummary(CamelModel):
    points: list[DietPoint]
    risk_mix: RiskMix
    by_type: TypeMix
    average_score: int
    previous_average_score: int | None
    total_analyses: int
    top_terms: list[TopTerm]


class Health(CamelModel):
    status: str
    gemini_configured: bool
    youtube_configured: bool
