"""YouTube Data API v3 lookups (authoritative title/channel/thumbnail) and thumbnail download."""

import logging
from dataclasses import dataclass

import httpx

from app.analysis.gemini_payload import InlineImage
from app.analysis.http import http_client_scope
from app.config import settings
from app.errors import ApiError

THUMBNAIL_PREFERENCE = ("maxres", "high")
# Only YouTube's own image host is fetched, so a crafted URL can never make us call elsewhere.
THUMBNAIL_HOST_PREFIX = "https://i.ytimg.com/"
MAX_THUMBNAIL_BYTES = 2_000_000
TIMEOUT_SECONDS = 15.0
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class VideoSnippet:
    video_id: str
    title: str
    channel: str
    description: str
    thumbnail_url: str


def fallback_thumbnail_url(video_id: str) -> str:
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def pick_thumbnail_url(video_id: str, thumbnails: dict) -> str:
    for size in THUMBNAIL_PREFERENCE:
        url = (thumbnails.get(size) or {}).get("url")
        if url and url.startswith(THUMBNAIL_HOST_PREFIX):
            return url
    return fallback_thumbnail_url(video_id)


async def fetch_video_snippet(
    video_id: str, *, api_key: str | None = None, client: httpx.AsyncClient | None = None
) -> VideoSnippet:
    api_key = api_key or settings.youtube_api_key
    if not api_key:
        raise ApiError("MODEL_UNAVAILABLE", "YouTube lookups are not configured on the server.", 502)
    async with http_client_scope(client, TIMEOUT_SECONDS) as http:
        response = await _get_snippet_response(http, video_id, api_key)
    try:
        items = response.json().get("items") or []
    except ValueError:
        raise _youtube_unavailable() from None
    if not items:
        raise ApiError("VIDEO_NOT_FOUND", "We couldn't find this YouTube video. It may be private or removed.", 404)
    return _snippet_from_item(video_id, items[0].get("snippet") or {})


async def _get_snippet_response(http: httpx.AsyncClient, video_id: str, api_key: str) -> httpx.Response:
    try:
        response = await http.get(
            f"{settings.youtube_api_base_url.rstrip('/')}/videos",
            params={"part": "snippet", "id": video_id},
            headers={"x-goog-api-key": api_key},
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.HTTPError as error:
        raise _youtube_unavailable() from error
    if response.status_code == 403 and "quota" in response.text.lower():
        raise ApiError("RATE_LIMITED", "The YouTube lookup quota is used up for today. Please try again later.", 429)
    if response.status_code >= 400:
        logger.warning("YouTube Data API returned HTTP %d", response.status_code)
        raise _youtube_unavailable()
    return response


def _youtube_unavailable() -> ApiError:
    return ApiError("MODEL_UNAVAILABLE", "YouTube isn't responding right now. Please try again shortly.", 502)


def _snippet_from_item(video_id: str, snippet: dict) -> VideoSnippet:
    return VideoSnippet(
        video_id=video_id,
        title=" ".join(str(snippet.get("title", "")).split()),
        channel=str(snippet.get("channelTitle", "")),
        description=str(snippet.get("description", "")),
        thumbnail_url=pick_thumbnail_url(video_id, snippet.get("thumbnails") or {}),
    )


async def download_thumbnail(
    snippet: VideoSnippet, *, client: httpx.AsyncClient | None = None
) -> InlineImage | None:
    """Best-effort: the analysis still runs on title + transcript if no image can be fetched."""
    candidates = dict.fromkeys([snippet.thumbnail_url, fallback_thumbnail_url(snippet.video_id)])
    async with http_client_scope(client, TIMEOUT_SECONDS) as http:
        for url in candidates:
            image = await _download_capped(http, url)
            if image is not None:
                return image
    return None


async def _download_capped(http: httpx.AsyncClient, url: str) -> InlineImage | None:
    if not url.startswith(THUMBNAIL_HOST_PREFIX):
        return None
    try:
        async with http.stream("GET", url, timeout=TIMEOUT_SECONDS) as response:
            if response.status_code != 200:
                return None
            data = bytearray()
            async for chunk in response.aiter_bytes():
                data.extend(chunk)
                if len(data) > MAX_THUMBNAIL_BYTES:
                    return None
            mime_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
    except httpx.HTTPError:
        return None
    return InlineImage(bytes(data), mime_type if mime_type.startswith("image/") else "image/jpeg")
