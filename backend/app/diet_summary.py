"""Information-diet aggregation (CONTRACTS section 6 getDiet), mirroring dashboard dietAggregate.js.

Works on stored AnalysisResult dicts so it can be tested without a database.
Buckets use UTC calendar days; the dashboard mock used the browser's local time.
"""
import math
import re
from datetime import datetime, timedelta

from app.periods import period_start
from app.timeutil import as_utc, parse_iso

WEEKLY_PERIODS = {"90d", "all"}
MAX_TERMS = 30
RISK_LEVELS = ("low", "medium", "high")
CONTENT_TYPES = ("article", "video")


def js_round(value: float) -> int:
    """Math.round semantics (halves go up), unlike Python's banker's rounding."""
    return math.floor(value + 0.5)


def average(values: list[float]) -> int | None:
    return js_round(sum(values) / len(values)) if values else None


def day_key(moment: datetime) -> str:
    return as_utc(moment).date().isoformat()


def week_key(moment: datetime) -> str:
    """The Monday of the ISO week containing the moment."""
    day = as_utc(moment).date()
    return (day - timedelta(days=day.weekday())).isoformat()


def _analyzed_at(result: dict) -> datetime:
    return parse_iso(result["analyzedAt"])


def bucket_keys(period: str, results: list[dict], now: datetime) -> list[str]:
    """Every bucket key from the window start to now, oldest first."""
    weekly = period in WEEKLY_PERIODS
    key_for = week_key if weekly else day_key
    step = timedelta(days=7 if weekly else 1)
    oldest = min((_analyzed_at(r) for r in results), default=now)
    moment = period_start(period, now) or oldest
    keys = []
    while moment <= now:
        keys.append(key_for(moment))
        moment += step
    keys.append(key_for(now))
    return list(dict.fromkeys(keys))


def build_points(period: str, results: list[dict], now: datetime) -> list[dict]:
    key_for = week_key if period in WEEKLY_PERIODS else day_key
    scores: dict[str, list[int]] = {key: [] for key in bucket_keys(period, results, now)}
    for result in results:
        scores.get(key_for(_analyzed_at(result)), []).append(result["riskScore"])
    return [{"date": key, "avgScore": average(values), "count": len(values)} for key, values in scores.items()]


def count_by(results: list[dict], field: str, keys: tuple[str, ...]) -> dict[str, int]:
    counts = dict.fromkeys(keys, 0)
    for result in results:
        counts[result[field]] = counts.get(result[field], 0) + 1
    return counts


def normalise_token(token: str) -> str:
    """Same rule as dashboard mock/terms.js normaliseToken."""
    stripped = re.sub(r"^[^a-z0-9-]+|[^a-z0-9-]+$", "", token.lower())
    return stripped.replace("'", "").replace("’", "")


def top_terms(results: list[dict]) -> list[dict]:
    """One row per normalised term: count = occurrences, weight = mean weight."""
    rows: dict[str, dict] = {}
    for result in results:
        for highlight in result.get("highlights", []):
            term = normalise_token(highlight["token"])
            if not term:
                continue
            row = rows.setdefault(term, {"term": term, "kind": highlight["kind"], "count": 0, "total": 0.0})
            row["count"] += 1
            row["total"] += highlight["weight"]
    terms = [
        {"term": r["term"], "kind": r["kind"], "count": r["count"], "weight": round(r["total"] / r["count"], 2)}
        for r in rows.values()
    ]
    terms.sort(key=lambda t: (-t["count"] * t["weight"], t["term"]))
    return terms[:MAX_TERMS]


def summarize_diet(current: list[dict], previous: list[dict] | None, period: str, now: datetime) -> dict:
    """`current` = results inside the period; `previous` = the prior equal window, or None for 'all'."""
    has_data = bool(current)
    return {
        "points": build_points(period, current, now) if has_data else [],
        "riskMix": count_by(current, "riskLevel", RISK_LEVELS),
        "byType": count_by(current, "contentType", CONTENT_TYPES),
        "averageScore": average([r["riskScore"] for r in current]) or 0,
        "previousAverageScore": average([r["riskScore"] for r in previous]) if previous is not None else None,
        "totalAnalyses": len(current),
        "topTerms": top_terms(current) if has_data else [],
    }
