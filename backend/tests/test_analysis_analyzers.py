import asyncio

import pytest

from app.analysis import article_analyzer, video_analyzer
from app.analysis.cache import analysis_cache
from app.analysis.gemini_payload import InlineImage
from app.analysis.youtube import VideoSnippet
from app.errors import ApiError
from app.schemas import AnalysisResult

HEADLINE = "SHOCKING: council closes libraries"
BODY = "The council voted on Monday to close three branch libraries to save money. " * 10
ARTICLE_ANSWER = {
    "stanceLabel": "Agrees",
    "stanceConfidence": 0.9,
    "sensationalismScore": 60,
    "summary": "The headline is louder than the report.",
    "highlights": [{"token": "SHOCKING", "kind": "hyperbole", "weight": 0.8}],
}
VIDEO_ANSWER = {"baitSwitchScore": 20, "titleHype": 30, "summary": "Delivers.", "highlights": []}
SNIPPET = VideoSnippet("dQw4w9WgXcQ", "Official video", "Channel", "desc", "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg")


@pytest.fixture(autouse=True)
def empty_cache():
    analysis_cache.clear()
    yield
    analysis_cache.clear()


class FakeGemini:
    def __init__(self, answer: dict):
        self.answer = answer
        self.requests = []

    async def __call__(self, request, **kwargs):
        self.requests.append(request)
        return dict(self.answer)


def test_article_is_scored_and_cached(monkeypatch):
    gemini = FakeGemini(ARTICLE_ANSWER)
    monkeypatch.setattr(article_analyzer, "generate_json", gemini)

    first = asyncio.run(article_analyzer.analyze_article("https://example.com/a", HEADLINE, BODY))
    second = asyncio.run(article_analyzer.analyze_article("https://example.com/a", HEADLINE, BODY))

    assert len(gemini.requests) == 1
    assert first["riskScore"] == second["riskScore"]
    assert first["id"] != second["id"]  # each response is a fresh result
    assert first["highlights"][0]["tokenIndex"] == 0
    assert "<<<CONTENT" in gemini.requests[0].prompt
    AnalysisResult.model_validate(first)


def test_short_article_is_rejected_before_any_model_call(monkeypatch):
    gemini = FakeGemini(ARTICLE_ANSWER)
    monkeypatch.setattr(article_analyzer, "generate_json", gemini)

    with pytest.raises(ApiError) as error:
        asyncio.run(article_analyzer.analyze_article("https://example.com/a", HEADLINE, "Too short. " * 30))
    assert (error.value.code, error.value.status_code) == ("CONTENT_TOO_SHORT", 422)
    assert gemini.requests == []


def test_long_article_body_is_truncated(monkeypatch):
    gemini = FakeGemini(ARTICLE_ANSWER)
    monkeypatch.setattr(article_analyzer, "generate_json", gemini)
    long_body = " ".join(f"w{i}" for i in range(9000))

    asyncio.run(article_analyzer.analyze_article("https://example.com/long", HEADLINE, long_body))

    prompt = gemini.requests[0].prompt
    assert "w8999" in prompt and "w5000" not in prompt


def _patch_video_layers(monkeypatch, gemini, transcript_error=None):
    calls = {"snippet": 0}

    async def fake_snippet(video_id):
        calls["snippet"] += 1
        return SNIPPET

    async def fake_transcript(video_id):
        if transcript_error:
            raise transcript_error
        return "never gonna give you up"

    async def fake_thumbnail(snippet):
        return InlineImage(b"jpeg-bytes")

    monkeypatch.setattr(video_analyzer, "fetch_video_snippet", fake_snippet)
    monkeypatch.setattr(video_analyzer, "fetch_transcript_sample", fake_transcript)
    monkeypatch.setattr(video_analyzer, "download_thumbnail", fake_thumbnail)
    monkeypatch.setattr(video_analyzer, "generate_json", gemini)
    return calls


def test_video_uses_authoritative_metadata_and_cache(monkeypatch):
    gemini = FakeGemini(VIDEO_ANSWER)
    calls = _patch_video_layers(monkeypatch, gemini)
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

    result = asyncio.run(video_analyzer.analyze_video(url, "dQw4w9WgXcQ", "stale DOM title"))
    asyncio.run(video_analyzer.analyze_video(url, "dQw4w9WgXcQ", "stale DOM title"))

    assert calls["snippet"] == 1 and len(gemini.requests) == 1
    assert gemini.requests[0].image == InlineImage(b"jpeg-bytes")
    assert result["title"] == "Official video"
    assert result["video"]["thumbnailUrl"] == SNIPPET.thumbnail_url
    assert result["riskScore"] == 24  # 0.65*20 + 0.35*30 = 23.5 -> 24
    assert result["source"] == "youtube.com"
    AnalysisResult.model_validate(result)


def test_video_without_captions_raises_no_captions(monkeypatch):
    gemini = FakeGemini(VIDEO_ANSWER)
    no_captions = ApiError("NO_CAPTIONS", "This video has no captions, so Veritas can't check it", 422)
    _patch_video_layers(monkeypatch, gemini, transcript_error=no_captions)

    with pytest.raises(ApiError) as error:
        asyncio.run(video_analyzer.analyze_video("https://youtu.be/x", "dQw4w9WgXcQ", "t"))
    assert error.value.code == "NO_CAPTIONS"
    assert gemini.requests == []


def test_malformed_video_id_is_invalid_input():
    with pytest.raises(ApiError) as error:
        asyncio.run(video_analyzer.analyze_video("https://youtu.be/x", "bad id!", "t"))
    assert error.value.code == "INVALID_INPUT"
