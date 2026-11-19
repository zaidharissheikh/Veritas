"""POST /analyze/* through the real app, with an in-memory database and the AI layers faked."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers the tables)
from app.analysis import article_analyzer, video_analyzer
from app.analysis.cache import analysis_cache
from app.analysis.youtube import VideoSnippet
from app.config import settings
from app.db import Base, get_db
from app.errors import ApiError
from app.main import create_app

ARTICLE = {
    "url": "https://www.example.com/news/1",
    "headline": "SHOCKING: council closes libraries",
    "body": "The council voted on Monday to close three branch libraries to save money. " * 10,
}
VIDEO = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "videoId": "dQw4w9WgXcQ", "title": "Rick"}
ARTICLE_ANSWER = {
    "stanceLabel": "Agrees",
    "stanceConfidence": 0.9,
    "sensationalismScore": 60,
    "summary": "The headline is louder than the report.",
    "highlights": [{"token": "shocking", "kind": "hyperbole", "weight": 0.8}],
}


@pytest.fixture
def client(monkeypatch, verification_mail):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_get_db():
        with test_session() as session:
            yield session

    async def fake_gemini(request, **kwargs):
        return dict(ARTICLE_ANSWER)

    monkeypatch.setattr(settings, "bcrypt_rounds", 4)
    monkeypatch.setattr(article_analyzer, "generate_json", fake_gemini)
    analysis_cache.clear()
    application = create_app()
    application.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager, so the startup seed never touches the real database.
    test_client = TestClient(application)
    test_client.verification_mail = verification_mail
    yield test_client
    analysis_cache.clear()


def _auth_header(client: TestClient) -> dict:
    credentials = {"email": "reader@example.com", "password": "Reading123"}
    assert client.post("/auth/register", json=credentials).status_code == 201
    assert client.post('/auth/verify-email', json={'token': client.verification_mail[-1][1]}).status_code == 200
    token = client.post("/auth/login", json=credentials).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_anonymous_article_is_analysed_but_not_saved(client):
    response = client.post("/analyze/article", json=ARTICLE)

    assert response.status_code == 200
    body = response.json()
    assert body["saved"] is False
    assert body["contentType"] == "article" and body["isMock"] is False
    assert body["source"] == "example.com"
    assert [g["key"] for g in body["gauges"]] == ["sensationalism", "mismatch"]
    assert body["highlights"] == [{"tokenIndex": 0, "token": "SHOCKING", "weight": 0.8, "kind": "hyperbole"}]
    assert "video" not in body and "stance_label" not in str(body)


def test_signed_in_article_is_saved_once_and_listed_in_history(client):
    headers = _auth_header(client)
    first = client.post("/analyze/article", json=ARTICLE, headers=headers).json()
    second = client.post("/analyze/article", json=ARTICLE, headers=headers).json()

    assert first["saved"] is True and second["saved"] is True
    history = client.get("/history", headers=headers).json()
    assert [item["id"] for item in history] == [second["id"]]  # upsert by url, no duplicate
    detail = client.get(f"/history/{second['id']}", headers=headers).json()
    assert detail["riskScore"] == second["riskScore"]


def test_invalid_token_still_analyses_without_saving(client):
    response = client.post("/analyze/article", json=ARTICLE, headers={"Authorization": "Bearer nonsense"})
    assert response.status_code == 200 and response.json()["saved"] is False


def test_short_article_is_content_too_short(client):
    response = client.post("/analyze/article", json={**ARTICLE, "body": "Too short."})
    assert response.status_code == 422
    assert response.json()["code"] == "CONTENT_TOO_SHORT"
    assert set(response.json()) == {"code", "message"}


def test_missing_fields_are_invalid_input(client):
    response = client.post("/analyze/article", json={"headline": "x"})
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_INPUT"


def test_rate_limit_from_the_model_is_reported(client, monkeypatch):
    async def busy_gemini(request, **kwargs):
        raise ApiError("RATE_LIMITED", "The analysis service is busy right now.", 429)

    monkeypatch.setattr(article_analyzer, "generate_json", busy_gemini)
    response = client.post("/analyze/article", json=ARTICLE)
    assert response.status_code == 429 and response.json()["code"] == "RATE_LIMITED"


def _fake_video_layers(monkeypatch, transcript_error=None):
    async def snippet(video_id):
        return VideoSnippet(video_id, "Official video", "Channel", "", f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg")

    async def transcript(video_id):
        if transcript_error:
            raise transcript_error
        return "never gonna give you up"

    async def thumbnail(snippet):
        return None

    async def gemini(request, **kwargs):
        return {"baitSwitchScore": 10, "titleHype": 20, "summary": "Delivers.", "highlights": []}

    for name, fake in [("fetch_video_snippet", snippet), ("fetch_transcript_sample", transcript),
                       ("download_thumbnail", thumbnail), ("generate_json", gemini)]:
        monkeypatch.setattr(video_analyzer, name, fake)


def test_video_analysis_returns_video_block(client, monkeypatch):
    _fake_video_layers(monkeypatch)
    body = client.post("/analyze/video", json=VIDEO).json()

    assert body["contentType"] == "video" and body["saved"] is False
    assert body["title"] == "Official video"
    assert body["video"]["videoId"] == "dQw4w9WgXcQ"
    assert [g["key"] for g in body["gauges"]] == ["baitSwitch", "titleHype"]
    assert "article" not in body


def test_video_without_captions_is_no_captions(client, monkeypatch):
    message = "This video has no captions, so Veritas can't check it"
    _fake_video_layers(monkeypatch, transcript_error=ApiError("NO_CAPTIONS", message, 422))
    response = client.post("/analyze/video", json=VIDEO)

    assert response.status_code == 422
    assert response.json() == {"code": "NO_CAPTIONS", "message": message}
