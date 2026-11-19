"""Demo seed: idempotent, recent dates, and rows that match CONTRACTS section 5 exactly."""
from datetime import timedelta

from app.config import settings
from app.repository import find_user_by_email, list_analyses
from app.seed.seed import DEMO_EMAIL, DEMO_PASSWORD, load_demo_history, seed_demo_data
from app.timeutil import parse_iso, utc_now

SHARED_KEYS = {
    "id", "contentType", "url", "title", "source", "analyzedAt", "riskScore", "riskLevel",
    "gauges", "summary", "excerpt", "highlights", "isMock",
}
GAUGE_KEYS = {"article": ["sensationalism", "mismatch"], "video": ["baitSwitch", "titleHype"]}
DETAIL_KEYS = {
    "article": {"stanceLabel", "stanceConfidence", "sensationalismScore"},
    "video": {"videoId", "thumbnailUrl", "baitSwitchScore"},
}


def test_seed_runs_once(session):
    assert seed_demo_data(session) is True
    assert seed_demo_data(session) is False
    demo = find_user_by_email(session, DEMO_EMAIL)
    assert len(list_analyses(session, demo.id)) == len(load_demo_history()) == 60


def test_startup_seed_is_idempotent(client, monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app

    monkeypatch.setattr(settings, "seed_demo", True)
    for _ in range(2):
        with TestClient(app):
            pass
    login = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['token']}"}
    assert len(client.get("/history", headers=headers).json()) == 60


def test_seeded_dates_are_shifted_to_recent(session):
    now = utc_now() + timedelta(days=45)
    seed_demo_data(session, now=now)
    rows = list_analyses(session, find_user_by_email(session, DEMO_EMAIL).id, now=now)
    newest = parse_iso(rows[0]["analyzedAt"])
    assert timedelta(0) <= now - newest < timedelta(days=1)


def test_seed_rows_match_the_dashboard_contract():
    for row in load_demo_history():
        kind = row["contentType"]
        assert set(row) == SHARED_KEYS | {kind}, row["id"]
        assert row["isMock"] is True
        assert row["id"].startswith("res_")
        assert [g["key"] for g in row["gauges"]] == GAUGE_KEYS[kind]
        assert set(row[kind]) == DETAIL_KEYS[kind]
        assert row["riskLevel"] == ("low" if row["riskScore"] < 34 else "medium" if row["riskScore"] < 67 else "high")
        words = row["excerpt"].split()
        for item in row["highlights"]:
            assert set(item) == {"tokenIndex", "token", "weight", "kind"}
            assert words[item["tokenIndex"]] == item["token"]


def test_api_returns_seed_rows_unchanged_apart_from_dates(client, session):
    seed_demo_data(session)
    login = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}).json()
    served = client.get("/history", headers={"Authorization": f"Bearer {login['token']}"}).json()
    originals = {row["id"]: row for row in load_demo_history()}
    for row in served:
        original = originals[row["id"]]
        assert {**row, "analyzedAt": None} == {**original, "analyzedAt": None}
