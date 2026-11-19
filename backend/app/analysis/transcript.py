"""English captions via youtube-transcript-api 1.x (instance API: list → find_transcript → fetch)."""

import asyncio
import logging

import requests
from youtube_transcript_api import (
    CouldNotRetrieveTranscript,
    InvalidVideoId,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
)

from app.analysis.text import sample_head_middle_tail
from app.errors import ApiError

# find_transcript prefers manually created captions over auto-generated ones for each code.
ENGLISH_CODES = ("en", "en-US", "en-GB", "en-CA", "en-AU", "en-IE", "en-IN", "en-NZ")
TRANSCRIPT_MAX_CHARS = 12_000
NO_CAPTIONS_MESSAGE = "This video has no captions, so Veritas can't check it"
logger = logging.getLogger(__name__)


async def fetch_transcript_sample(video_id: str, max_chars: int = TRANSCRIPT_MAX_CHARS) -> str:
    """Head + middle + tail sample of the English captions, or ApiError NO_CAPTIONS."""
    text = await asyncio.to_thread(_fetch_english_text, video_id)
    if not text.strip():
        raise ApiError("NO_CAPTIONS", NO_CAPTIONS_MESSAGE, 422)
    return sample_head_middle_tail(text, max_chars)


def _fetch_english_text(video_id: str) -> str:
    # A fresh instance per call: the library's requests.Session is not thread-safe.
    api = YouTubeTranscriptApi()
    try:
        transcript = api.list(video_id).find_transcript(ENGLISH_CODES)
        return " ".join(snippet.text for snippet in transcript.fetch())
    except (NoTranscriptFound, TranscriptsDisabled) as error:
        raise ApiError("NO_CAPTIONS", NO_CAPTIONS_MESSAGE, 422) from error
    except (VideoUnavailable, InvalidVideoId) as error:
        raise ApiError("VIDEO_NOT_FOUND", "We couldn't find this YouTube video. It may be private or removed.", 404) from error
    except (CouldNotRetrieveTranscript, requests.RequestException) as error:
        logger.warning("Caption fetch failed for a video: %s", type(error).__name__)
        raise ApiError("MODEL_UNAVAILABLE", "YouTube didn't return the captions right now. Please try again shortly.", 502) from error
