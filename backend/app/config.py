"""Settings read from environment variables and backend/.env.

Keys are plain strings marked repr=False so printing or logging the settings
object never reveals them.
"""
import re
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Development-only signing secret. Anyone who reads this file can forge tokens,
# so a real deployment must set JWT_SECRET (main.py warns at startup).
DEV_JWT_SECRET = "veritas-DEV-ONLY-insecure-jwt-secret-set-JWT_SECRET"

CORS_ORIGIN_REGEX = r"^(chrome-extension://[a-p]{32}|http://localhost:\d+|http://127\.0\.0\.1:\d+)$"

# Ordered Gemini model chain (BACKEND_CONTRACT section 3). Free-tier quotas are per model, so
# spreading requests over several models keeps analyses working when one model is overloaded.
DEFAULT_GEMINI_MODELS = "gemini-3.6-flash,gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash"
# Model names go into the request URL path, so only plain model ids are accepted.
_MODEL_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")


def build_model_chain(models_csv: str, *overrides: str) -> tuple[str, ...]:
    """Overrides first (legacy GEMINI_MODEL, GEMINI_FALLBACK_MODEL), then GEMINI_MODELS.

    Names are trimmed, an optional "models/" prefix is dropped, invalid names and duplicates are
    skipped. An empty result falls back to DEFAULT_GEMINI_MODELS.
    """
    chain: list[str] = []
    for raw in [*overrides, *(models_csv or "").split(",")]:
        name = (raw or "").strip().removeprefix("models/")
        if _MODEL_NAME.match(name) and name not in chain:
            chain.append(name)
    return tuple(chain) if chain else build_model_chain(DEFAULT_GEMINI_MODELS)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = Field(default="", repr=False)
    youtube_api_key: str = Field(default="", repr=False)
    gemini_models: str = DEFAULT_GEMINI_MODELS
    # Legacy single-model settings: optional, and when set they are tried before GEMINI_MODELS.
    gemini_model: str = ""
    gemini_fallback_model: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    youtube_api_base_url: str = "https://www.googleapis.com/youtube/v3"

    jwt_secret: str = Field(default="", repr=False)
    jwt_ttl_minutes: int = 30
    bcrypt_rounds: int = 12

    brevo_api_key: str = Field(default="", repr=False)
    email_from: str = ""
    frontend_url: str = "http://localhost:5173"
    verification_ttl_minutes: int = Field(default=30, ge=1, le=1440)
    password_reset_ttl_minutes: int = Field(default=15, ge=1, le=60)

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'veritas.db').as_posix()}"
    cors_origin_regex: str = CORS_ORIGIN_REGEX
    seed_demo: bool = True

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def gemini_model_chain(self) -> tuple[str, ...]:
        return build_model_chain(self.gemini_models, self.gemini_model, self.gemini_fallback_model)

    @property
    def youtube_configured(self) -> bool:
        return bool(self.youtube_api_key.strip())

    @property
    def using_dev_jwt_secret(self) -> bool:
        return not self.jwt_secret.strip()

    @property
    def jwt_signing_key(self) -> str:
        return DEV_JWT_SECRET if self.using_dev_jwt_secret else self.jwt_secret


settings = Settings()
