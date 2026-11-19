"""CORS for the extension and dashboard origins, the error shape, and /health."""
import pytest

from app import repository
from tests.helpers import sign_in

EXTENSION_ORIGIN = "chrome-extension://" + "abcdefghijklmnop" * 2


def preflight(client, origin: str):
    return client.options(
        "/history",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )


@pytest.mark.parametrize("origin", [EXTENSION_ORIGIN, "http://localhost:5173", "http://127.0.0.1:8123"])
def test_preflight_allows_extension_and_local_origins(client, origin):
    response = preflight(client, origin)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
    assert "POST" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.example",
        "http://localhost.evil.example",
        "chrome-extension://" + "z" * 32,
        "https://localhost:5173",
    ],
)
def test_preflight_rejects_other_origins(client, origin):
    response = preflight(client, origin)
    assert "access-control-allow-origin" not in response.headers


def test_simple_request_from_dashboard_gets_cors_header(client):
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_health_reports_configuration_without_secrets(client):
    response = client.get("/health")
    assert response.json() == {"status": "ok", "geminiConfigured": True, "youtubeConfigured": True}
    assert "test-gemini-key" not in response.text and "test-youtube-key" not in response.text


def test_unknown_route_uses_the_error_shape(client):
    response = client.get("/nope")
    assert response.status_code == 404
    assert response.json() == {"code": "NOT_FOUND", "message": "This page or resource does not exist."}


def test_malformed_json_is_invalid_input(client):
    response = client.post("/auth/login", content="{not json", headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert set(response.json()) == {"code", "message"}
    assert response.json()["code"] == "INVALID_INPUT"


def test_unexpected_errors_hide_internal_details(client, monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app

    headers, _ = sign_in(client, "rhea@example.com")

    def explode(*args, **kwargs):
        raise RuntimeError("internal detail that must not leak")

    monkeypatch.setattr(repository, "list_analyses", explode)
    with TestClient(app, raise_server_exceptions=False) as quiet_client:
        response = quiet_client.get("/history", headers=headers)
    assert response.status_code == 500
    assert response.json()["code"] == "SERVER_ERROR"
    assert "internal detail" not in response.text
