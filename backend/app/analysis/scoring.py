"""Pure scoring: turns validated model output into an AnalysisResult dict (CONTRACTS §5).

Formulas and thresholds come from BACKEND_CONTRACT §3; nothing here talks to the network.
"""

import math
import re
from urllib.parse import urlparse

from app.ids import new_result_id
from app.timeutil import iso_z, utc_now

EXCERPT_MAX_WORDS = 60
MAX_HIGHLIGHTS = 12
HIGHLIGHT_KINDS = ("hyperbole", "emotional", "clickbait")
STANCE_BASE_MISMATCH = {"Agrees": 5, "Discusses": 35, "Unrelated": 80, "Disagrees": 95}
UNCERTAIN_MISMATCH = 30
LOW_RISK_BELOW = 34
MEDIUM_RISK_BELOW = 67
GAUGE_LABELS = {
    "sensationalism": "Sensationalism",
    "mismatch": "Headline mismatch",
    "baitSwitch": "Bait-and-switch",
    "titleHype": "Title hype",
}

_NON_WORD = re.compile(r"[\W_]+")
_EDGE_PUNCTUATION = re.compile(r"^[\W_]+|[\W_]+$")


def round_half_up(value: float) -> int:
    # Python's round() is banker's rounding; the dashboard uses Math.round (half up).
    return int(math.floor(value + 0.5))


def clamp_score(value: float) -> int:
    return max(0, min(100, round_half_up(float(value))))


def clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def risk_level(score: int) -> str:
    if score < LOW_RISK_BELOW:
        return "low"
    return "medium" if score < MEDIUM_RISK_BELOW else "high"


def mismatch_score(stance_label: str, confidence: float) -> int:
    base = STANCE_BASE_MISMATCH.get(stance_label, STANCE_BASE_MISMATCH["Discusses"])
    certainty = clamp_unit(confidence)
    return clamp_score(base * certainty + UNCERTAIN_MISMATCH * (1 - certainty))


def article_risk_score(sensationalism: int, mismatch: int) -> int:
    return clamp_score(0.6 * max(sensationalism, mismatch) + 0.4 * min(sensationalism, mismatch))


def video_risk_score(bait_switch: int, title_hype: int) -> int:
    return clamp_score(0.65 * bait_switch + 0.35 * title_hype)


def build_excerpt(headline: str, body: str = "") -> str:
    words = f"{headline or ''} {body or ''}".split()
    return " ".join(words[:EXCERPT_MAX_WORDS])


def match_highlights(excerpt: str, raw_highlights: list[dict]) -> list[dict]:
    """Attach tokenIndex (index into excerpt.split(/\\s+/)); highlights not in the excerpt are dropped."""
    words = excerpt.split()
    word_keys = [_match_key(word) for word in words]
    used_indexes: set[int] = set()
    matched: list[dict] = []
    for raw in raw_highlights:
        if raw.get("kind") not in HIGHLIGHT_KINDS:
            continue
        for index in _find_unused_phrase(word_keys, _phrase_keys(raw.get("token", "")), used_indexes):
            used_indexes.add(index)
            matched.append(_highlight(words[index], index, raw))
    matched.sort(key=lambda highlight: (-highlight["weight"], highlight["tokenIndex"]))
    return sorted(matched[:MAX_HIGHLIGHTS], key=lambda highlight: highlight["tokenIndex"])


def _match_key(word: str) -> str:
    return _NON_WORD.sub("", word.casefold())


def _phrase_keys(token: str) -> list[str]:
    return [key for key in (_match_key(word) for word in str(token).split()) if key]


def _find_unused_phrase(word_keys: list[str], phrase: list[str], used: set[int]) -> list[int]:
    if not phrase:
        return []
    for start in range(len(word_keys) - len(phrase) + 1):
        span = range(start, start + len(phrase))
        if word_keys[start : start + len(phrase)] == phrase and not used.intersection(span):
            return list(span)
    return []


def _highlight(word: str, index: int, raw: dict) -> dict:
    return {
        "tokenIndex": index,
        "token": _EDGE_PUNCTUATION.sub("", word) or word,
        "weight": round(clamp_unit(raw.get("weight", 0.5)), 2),
        "kind": raw["kind"],
    }


def utc_now_iso() -> str:
    return iso_z(utc_now())


def source_hostname(url: str) -> str:
    hostname = (urlparse(url or "").hostname or "").lower()
    return hostname.removeprefix("www.")


def gauge(key: str, value: int) -> dict:
    return {"key": key, "label": GAUGE_LABELS[key], "value": value}


def build_article_result(url: str, headline: str, body: str, output: dict) -> dict:
    sensationalism = clamp_score(output["sensationalismScore"])
    confidence = round(clamp_unit(output["stanceConfidence"]), 2)
    mismatch = mismatch_score(output["stanceLabel"], confidence)
    excerpt = build_excerpt(headline, body)
    return {
        **_base_result("article", url, headline, article_risk_score(sensationalism, mismatch)),
        "gauges": [gauge("sensationalism", sensationalism), gauge("mismatch", mismatch)],
        "summary": _clean_summary(output["summary"]),
        "excerpt": excerpt,
        "highlights": match_highlights(excerpt, output.get("highlights", [])),
        "article": {
            "stanceLabel": output["stanceLabel"],
            "stanceConfidence": confidence,
            "sensationalismScore": sensationalism,
        },
        "isMock": False,
    }


def build_video_result(url: str, video_id: str, title: str, thumbnail_url: str, output: dict) -> dict:
    bait_switch = clamp_score(output["baitSwitchScore"])
    title_hype = clamp_score(output["titleHype"])
    excerpt = build_excerpt(title)
    return {
        **_base_result("video", url, title, video_risk_score(bait_switch, title_hype)),
        "gauges": [gauge("baitSwitch", bait_switch), gauge("titleHype", title_hype)],
        "summary": _clean_summary(output["summary"]),
        "excerpt": excerpt,
        "highlights": match_highlights(excerpt, output.get("highlights", [])),
        "video": {"videoId": video_id, "thumbnailUrl": thumbnail_url, "baitSwitchScore": bait_switch},
        "isMock": False,
    }


def _base_result(content_type: str, url: str, title: str, score: int) -> dict:
    return {
        "id": new_result_id(),
        "contentType": content_type,
        "url": url,
        "title": " ".join((title or "").split()) or "Untitled",
        "source": source_hostname(url),
        "analyzedAt": utc_now_iso(),
        "riskScore": score,
        "riskLevel": risk_level(score),
    }


def _clean_summary(summary: str) -> str:
    return " ".join(str(summary).split())
