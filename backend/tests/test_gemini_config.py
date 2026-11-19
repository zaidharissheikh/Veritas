"""Model-chain settings (GEMINI_MODELS + legacy overrides), Retry-After parsing and the registry."""

import threading

import httpx
import pytest

from app.analysis.gemini import config_from_settings
from app.analysis.gemini_errors import RATE_LIMITED, REJECTED, UNAVAILABLE, failure_from_response, retry_delay_seconds
from app.analysis.model_health import DEFAULT_COOLDOWN_SECONDS, MAX_COOLDOWN_SECONDS, ModelHealth, clamp_cooldown
from app.config import DEFAULT_GEMINI_MODELS, Settings, build_model_chain
from tests.gemini_fakes import FakeClock

DEFAULT_CHAIN = ("gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash")
GEMINI_ENV = ("GEMINI_MODELS", "GEMINI_MODEL", "GEMINI_FALLBACK_MODEL")


def _settings(monkeypatch, **env) -> Settings:
    for name in GEMINI_ENV:
        monkeypatch.delenv(name, raising=False)
    for name, value in env.items():
        monkeypatch.setenv(name, value)
    return Settings(_env_file=None)


def test_default_chain(monkeypatch):
    assert _settings(monkeypatch).gemini_model_chain == DEFAULT_CHAIN
    assert build_model_chain(DEFAULT_GEMINI_MODELS) == DEFAULT_CHAIN


def test_gemini_models_env_is_comma_separated_and_trimmed(monkeypatch):
    settings = _settings(monkeypatch, GEMINI_MODELS=" a-1 , models/b.2,,a-1 ")
    assert settings.gemini_model_chain == ("a-1", "b.2")


def test_legacy_overrides_go_first_without_duplicates(monkeypatch):
    settings = _settings(monkeypatch, GEMINI_MODELS="x,y,z", GEMINI_MODEL="y", GEMINI_FALLBACK_MODEL="w")
    assert settings.gemini_model_chain == ("y", "w", "x", "z")
    only_legacy = _settings(monkeypatch, GEMINI_MODEL="old-flash")
    assert only_legacy.gemini_model_chain == ("old-flash", *DEFAULT_CHAIN)


def test_unsafe_names_are_dropped_and_empty_falls_back_to_default(monkeypatch):
    assert build_model_chain("../evil,ok?x=1,good") == ("good",)
    assert _settings(monkeypatch, GEMINI_MODELS=" , ").gemini_model_chain == DEFAULT_CHAIN


def test_config_from_settings_uses_the_chain(monkeypatch):
    from app.analysis import gemini

    monkeypatch.setattr(gemini, "settings", _settings(monkeypatch, GEMINI_MODELS="p,q", GEMINI_API_KEY=" k "))
    config = config_from_settings()
    assert config.models == ("p", "q") and config.api_key == "k"
    assert config.timeout_seconds == 30 and config.deadline_seconds == 75
    assert "gemini_api_key" not in repr(gemini.settings)  # repr=False keeps keys out of logs


@pytest.mark.parametrize(
    ("response", "expected"),
    [
        (httpx.Response(429, headers={"Retry-After": "12"}), 12.0),
        (httpx.Response(503, json={"error": {"details": [{"retryDelay": "37.5s"}]}}), 37.5),
        (httpx.Response(429, json={"error": {"details": [{"retryDelay": "soon"}]}}), None),
        (httpx.Response(503, text="not json"), None),
    ],
)
def test_retry_delay_parsing(response, expected):
    assert retry_delay_seconds(response) == expected


def test_status_classification():
    assert failure_from_response(httpx.Response(200)) is None
    assert failure_from_response(httpx.Response(429)).reason == RATE_LIMITED
    not_found = failure_from_response(httpx.Response(404))
    assert (not_found.reason, not_found.cool, not_found.cooldown) == (UNAVAILABLE, True, MAX_COOLDOWN_SECONDS)
    rejected = failure_from_response(httpx.Response(403, json={"error": {"status": "PERMISSION_DENIED"}}))
    assert (rejected.reason, rejected.cool, rejected.detail) == (REJECTED, False, "PERMISSION_DENIED")
    odd = failure_from_response(httpx.Response(400, json={"error": {"status": "free text, not an enum"}}))
    assert odd.detail == ""


def test_cooldown_default_cap_and_expiry():
    assert clamp_cooldown(None) == DEFAULT_COOLDOWN_SECONDS
    assert clamp_cooldown(3600) == MAX_COOLDOWN_SECONDS
    clock = FakeClock()
    health = ModelHealth(clock=clock)
    assert health.mark_cooling("a", 3600) == MAX_COOLDOWN_SECONDS
    health.mark_cooling("b")
    assert health.order(["a", "b", "c"]) == ["c"]
    clock.advance(DEFAULT_COOLDOWN_SECONDS)
    assert health.order(["a", "b", "c"]) == ["b", "c"]
    health.mark_healthy("a")
    assert health.order(["a", "b"]) == ["a", "b"]


def test_registry_is_thread_safe():
    health = ModelHealth()

    def churn(name):
        for _ in range(500):
            health.mark_cooling(name)
            health.order(["a", "b", "c"])
            health.mark_healthy(name)

    threads = [threading.Thread(target=churn, args=(name,)) for name in "abc"]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert health.order(["a", "b", "c"]) == ["a", "b", "c"]
