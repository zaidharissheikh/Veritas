"""Video analysis: cache first, then YouTube metadata + captions + thumbnail, one Gemini call,
then pure scoring (BACKEND_CONTRACT §3)."""

import re

from app.analysis.cache import analysis_cache, make_key
from app.analysis.gemini import generate_json
from app.analysis.gemini_payload import GeminiRequest, InlineImage
from app.analysis.outputs import VideoModelOutput
from app.analysis.prompts import VIDEO_RESPONSE_SCHEMA, VIDEO_SYSTEM_INSTRUCTION, build_video_prompt
from app.analysis.scoring import build_video_result
from app.analysis.transcript import fetch_transcript_sample
from app.analysis.youtube import VideoSnippet, download_thumbnail, fetch_video_snippet
from app.errors import ApiError

VIDEO_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{11}")


async def analyze_video(url: str, video_id: str, title: str) -> dict:
    """Return an AnalysisResult dict for one YouTube video (without the 'saved' flag)."""
    if not VIDEO_ID_PATTERN.fullmatch(video_id or ""):
        raise ApiError("INVALID_INPUT", "That doesn't look like a YouTube video ID.", 422)
    cache_key = make_key("video", video_id, title)
    cached = analysis_cache.get(cache_key)
    if cached is None:
        cached = await _analyse_uncached(video_id)
        analysis_cache.set(cache_key, cached)
    return build_video_result(url, video_id, cached["title"], cached["thumbnailUrl"], cached["analysis"])


async def _analyse_uncached(video_id: str) -> dict:
    snippet = await fetch_video_snippet(video_id)
    transcript = await fetch_transcript_sample(video_id)
    thumbnail = await download_thumbnail(snippet)
    analysis = await generate_json(_gemini_request(snippet, transcript, thumbnail))
    return {"title": snippet.title, "thumbnailUrl": snippet.thumbnail_url, "analysis": analysis}


def _gemini_request(snippet: VideoSnippet, transcript: str, thumbnail: InlineImage | None) -> GeminiRequest:
    prompt = build_video_prompt(
        title=snippet.title,
        channel=snippet.channel,
        description=snippet.description,
        transcript=transcript,
        has_image=thumbnail is not None,
    )
    return GeminiRequest(
        system_instruction=VIDEO_SYSTEM_INSTRUCTION,
        prompt=prompt,
        response_schema=VIDEO_RESPONSE_SCHEMA,
        output_model=VideoModelOutput,
        image=thumbnail,
    )
