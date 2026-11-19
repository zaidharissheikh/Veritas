import asyncio

import httpx
import pytest
from youtube_transcript_api import NoTranscriptFound, TranscriptsDisabled

from app.analysis import transcript, youtube
from app.errors import ApiError

VIDEO_ID = "dQw4w9WgXcQ"
THUMBS = {
    "high": {"url": f"https://i.ytimg.com/vi/{VIDEO_ID}/hqdefault.jpg"},
    "maxres": {"url": f"https://i.ytimg.com/vi/{VIDEO_ID}/maxresdefault.jpg"},
}


def _with_client(handler, coroutine_factory):
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await coroutine_factory(client)

    return asyncio.run(go())


def test_pick_thumbnail_prefers_maxres_then_high_then_default():
    assert youtube.pick_thumbnail_url(VIDEO_ID, THUMBS).endswith("maxresdefault.jpg")
    assert youtube.pick_thumbnail_url(VIDEO_ID, {"high": THUMBS["high"]}).endswith("hqdefault.jpg")
    assert youtube.pick_thumbnail_url(VIDEO_ID, {"maxres": {"url": "https://evil.example/x.jpg"}}) == (
        f"https://i.ytimg.com/vi/{VIDEO_ID}/hqdefault.jpg"
    )


def test_snippet_is_fetched_with_key_header():
    seen = []

    def handler(request):
        seen.append(request)
        snippet = {"title": "Rick  Astley", "channelTitle": "Rick", "description": "d", "thumbnails": THUMBS}
        return httpx.Response(200, json={"items": [{"snippet": snippet}]})

    result = _with_client(handler, lambda c: youtube.fetch_video_snippet(VIDEO_ID, api_key="yt-test", client=c))

    assert result.title == "Rick Astley"
    assert result.thumbnail_url.endswith("maxresdefault.jpg")
    assert seen[0].headers["x-goog-api-key"] == "yt-test"
    assert "key=" not in str(seen[0].url) and seen[0].url.params["id"] == VIDEO_ID


def test_unknown_video_is_video_not_found():
    def handler(request):
        return httpx.Response(200, json={"items": []})

    with pytest.raises(ApiError) as error:
        _with_client(handler, lambda c: youtube.fetch_video_snippet(VIDEO_ID, api_key="yt-test", client=c))
    assert (error.value.code, error.value.status_code) == ("VIDEO_NOT_FOUND", 404)


def test_thumbnail_falls_back_to_hq_and_respects_size_cap(monkeypatch):
    snippet = youtube.VideoSnippet(VIDEO_ID, "t", "c", "d", THUMBS["maxres"]["url"])

    def handler(request):
        if "maxres" in request.url.path:
            return httpx.Response(404)
        return httpx.Response(200, content=b"jpeg", headers={"content-type": "image/jpeg"})

    image = _with_client(handler, lambda c: youtube.download_thumbnail(snippet, client=c))
    assert image.data == b"jpeg" and image.mime_type == "image/jpeg"

    monkeypatch.setattr(youtube, "MAX_THUMBNAIL_BYTES", 2)
    assert _with_client(handler, lambda c: youtube.download_thumbnail(snippet, client=c)) is None


class FakeTranscriptApi:
    error: Exception | None = None
    lines = ["never gonna", "give you up"]

    def list(self, video_id):
        if self.error:
            raise self.error
        return self

    def find_transcript(self, codes):
        assert "en" in codes
        return self

    def fetch(self):
        return [type("Snippet", (), {"text": line})() for line in self.lines]


def test_transcript_is_joined(monkeypatch):
    monkeypatch.setattr(transcript, "YouTubeTranscriptApi", FakeTranscriptApi)
    assert asyncio.run(transcript.fetch_transcript_sample(VIDEO_ID)) == "never gonna give you up"


@pytest.mark.parametrize("library_error", [TranscriptsDisabled(VIDEO_ID), NoTranscriptFound(VIDEO_ID, ["en"], [])])
def test_missing_captions_raise_no_captions(monkeypatch, library_error):
    fake = type("Failing", (FakeTranscriptApi,), {"error": library_error})
    monkeypatch.setattr(transcript, "YouTubeTranscriptApi", fake)

    with pytest.raises(ApiError) as error:
        asyncio.run(transcript.fetch_transcript_sample(VIDEO_ID))
    assert error.value.code == "NO_CAPTIONS"
    assert error.value.message == "This video has no captions, so Veritas can't check it"
