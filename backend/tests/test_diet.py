"""Diet aggregation numbers on a small hand-made dataset, plus the GET /diet endpoint."""
from datetime import UTC, date, datetime, timedelta

from app.diet_summary import summarize_diet
from app.periods import period_start, previous_period_range
from app.repository import save_analysis
from app.timeutil import parse_iso, utc_now
from tests.helpers import highlight, make_result, sign_in

NOW = datetime(2026, 10, 22, 12, 0, tzinfo=UTC)  # a Thursday


def at(month: int, day: int, hour: int = 12) -> datetime:
    return datetime(2026, month, day, hour, 0, tzinfo=UTC)


DATASET = [
    make_result("res_00000001", at(10, 22, 9), 80, highlights=[highlight("SHOCKING", 0.9), highlight("outrage!", 0.7, "emotional")]),
    make_result("res_00000002", at(10, 22, 10), 40, "video", highlights=[highlight("Shocking,", 0.5)]),
    make_result("res_00000003", at(10, 20, 8), 15),
    make_result("res_00000004", at(10, 16), 25),
    make_result("res_00000005", at(10, 10), 60),  # previous 7-day window
    make_result("res_00000006", at(10, 14), 69),  # previous 7-day window
    make_result("res_00000007", at(8, 1), 90),
]


def window(start: datetime | None, end: datetime | None = None) -> list[dict]:
    def inside(result: dict) -> bool:
        moment = parse_iso(result["analyzedAt"])
        return (start is None or moment >= start) and (end is None or moment < end)

    return [r for r in DATASET if inside(r)]


def diet_for(period: str) -> dict:
    previous_range = previous_period_range(period, NOW)
    previous = window(*previous_range) if previous_range else None
    return summarize_diet(window(period_start(period, NOW)), previous, period, NOW)


def test_seven_day_numbers():
    diet = diet_for("7d")
    assert diet["totalAnalyses"] == 4
    assert diet["averageScore"] == 40  # (80 + 40 + 15 + 25) / 4
    assert diet["previousAverageScore"] == 65  # 64.5 rounds half up, like Math.round
    assert diet["riskMix"] == {"low": 2, "medium": 1, "high": 1}
    assert diet["byType"] == {"article": 3, "video": 1}


def test_seven_day_points_are_daily_and_complete():
    points = diet_for("7d")["points"]
    assert [p["date"] for p in points] == [f"2026-10-{d}" for d in range(15, 23)]
    by_date = {p["date"]: p for p in points}
    assert by_date["2026-10-22"] == {"date": "2026-10-22", "avgScore": 60, "count": 2}
    assert by_date["2026-10-20"] == {"date": "2026-10-20", "avgScore": 15, "count": 1}
    assert by_date["2026-10-18"] == {"date": "2026-10-18", "avgScore": None, "count": 0}


def test_top_terms_merge_tokens_with_count_and_mean_weight():
    terms = diet_for("7d")["topTerms"]
    assert terms == [
        {"term": "shocking", "kind": "hyperbole", "count": 2, "weight": 0.7},
        {"term": "outrage", "kind": "emotional", "count": 1, "weight": 0.7},
    ]


def test_ninety_days_uses_monday_week_buckets():
    diet = diet_for("90d")
    dates = [date.fromisoformat(p["date"]) for p in diet["points"]]
    assert all(d.weekday() == 0 for d in dates)
    assert dates[-1] == date(2026, 10, 19)
    assert dates == sorted(dates) and len(dates) == len(set(dates))
    assert sum(p["count"] for p in diet["points"]) == diet["totalAnalyses"] == 7


def test_all_time_has_no_previous_period_and_starts_at_the_oldest_week():
    diet = diet_for("all")
    assert diet["previousAverageScore"] is None
    assert diet["points"][0]["date"] == "2026-07-27"  # Monday of the week holding Aug 1
    assert diet["totalAnalyses"] == len(DATASET)


def test_previous_average_is_null_when_the_previous_window_is_empty():
    assert diet_for("30d")["previousAverageScore"] is None


def test_no_analyses_gives_zero_totals_and_empty_arrays():
    diet = summarize_diet([], [], "7d", NOW)
    assert diet == {
        "points": [],
        "riskMix": {"low": 0, "medium": 0, "high": 0},
        "byType": {"article": 0, "video": 0},
        "averageScore": 0,
        "previousAverageScore": None,
        "totalAnalyses": 0,
        "topTerms": [],
    }


def test_diet_endpoint_returns_the_contract_shape(client, session):
    headers, user_id = sign_in(client, "olga@example.com")
    now = utc_now()
    save_analysis(session, user_id, make_result("res_000000d1", now - timedelta(hours=1), 70))
    save_analysis(session, user_id, make_result("res_000000d2", now - timedelta(days=9), 30, "video"))

    diet = client.get("/diet", params={"period": "7d"}, headers=headers).json()
    assert set(diet) == {
        "points", "riskMix", "byType", "averageScore", "previousAverageScore", "totalAnalyses", "topTerms",
    }
    assert diet["totalAnalyses"] == 1
    assert diet["averageScore"] == 70
    assert diet["previousAverageScore"] == 30
    assert diet["byType"] == {"article": 1, "video": 0}


def test_diet_endpoint_for_a_new_account_is_empty(client):
    headers, _ = sign_in(client, "pia@example.com")
    diet = client.get("/diet", params={"period": "all"}, headers=headers).json()
    assert diet["totalAnalyses"] == 0 and diet["points"] == [] and diet["topTerms"] == []


def test_diet_endpoint_rejects_unknown_period(client):
    headers, _ = sign_in(client, "quinn@example.com")
    response = client.get("/diet", params={"period": "2w"}, headers=headers)
    assert response.status_code == 422 and response.json()["code"] == "INVALID_INPUT"
