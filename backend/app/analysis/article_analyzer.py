"""Article analysis: cache first, then one Gemini call, then pure scoring (BACKEND_CONTRACT §3)."""

from app.analysis.cache import analysis_cache, make_key
from app.analysis.gemini import generate_json
from app.analysis.gemini_payload import GeminiRequest
from app.analysis.outputs import ArticleModelOutput
from app.analysis.prompts import ARTICLE_RESPONSE_SCHEMA, ARTICLE_SYSTEM_INSTRUCTION, build_article_prompt
from app.analysis.scoring import build_article_result, build_excerpt
from app.analysis.text import normalise_whitespace, truncate_words_head_tail, word_count
from app.errors import ApiError

MIN_BODY_WORDS = 80
MAX_BODY_WORDS = 6_000


async def analyze_article(url: str, headline: str, body: str) -> dict:
    """Return an AnalysisResult dict for one article (without the 'saved' flag)."""
    headline = normalise_whitespace(headline)
    if word_count(body) < MIN_BODY_WORDS:
        raise ApiError(
            "CONTENT_TOO_SHORT",
            f"This page doesn't have enough text to check (Veritas needs at least {MIN_BODY_WORDS} words).",
            422,
        )
    cache_key = make_key("article", url, headline, body)
    model_output = analysis_cache.get(cache_key)
    if model_output is None:
        model_output = await generate_json(_gemini_request(headline, body))
        analysis_cache.set(cache_key, model_output)
    return build_article_result(url, headline, body, model_output)


def _gemini_request(headline: str, body: str) -> GeminiRequest:
    prompt = build_article_prompt(
        headline=headline,
        body=truncate_words_head_tail(body, MAX_BODY_WORDS),
        highlight_source=build_excerpt(headline, body),
    )
    return GeminiRequest(
        system_instruction=ARTICLE_SYSTEM_INSTRUCTION,
        prompt=prompt,
        response_schema=ARTICLE_RESPONSE_SCHEMA,
        output_model=ArticleModelOutput,
    )
