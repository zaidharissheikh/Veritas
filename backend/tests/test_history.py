"""GET /history filters, per-user isolation and the save_analysis upsert."""
from datetime import timedelta

import pytest

from app.repository import list_analyses, save_analysis
from app.timeutil import utc_now
from tests.helpers import make_result, sign_in


@pytest.fixture
def alice(client, session):
    headers, user_id = sign_in(client, "alice@example.com")
    now = utc_now()
    save_analysis(session, user_id, make_result("res_0000000a", now - timedelta(days=2), 20, source="bbc.com"))
    save_analysis(
        session,
        user_id,
        make_result("res_0000000b", now - timedelta(days=10), 80, "video", title="SHOCKING trick", source="youtube.com"),
    )
    save_analysis(session, user_id, make_result("res_0000000c", now - timedelta(days=100), 50, title="Old news 100%"))
    return headers


def ids(response) -> list[str]:
    assert response.status_code == 200
    return [r["id"] for r in response.json()]


def test_lists_everything_newest_first(client, alice):
    assert ids(client.get("/history", headers=alice)) == ["res_0000000a", "res_0000000b", "res_0000000c"]


@pytest.mark.parametrize(
    "params, expected",
    [
        ({"type": "video"}, ["res_0000000b"]),
        ({"type": "article"}, ["res_0000000a", "res_0000000c"]),
        ({"period": "7d"}, ["res_0000000a"]),
        ({"period": "30d"}, ["res_0000000a", "res_0000000b"]),
        ({"period": "90d", "type": "article"}, ["res_0000000a"]),
        ({"query": "shocking"}, ["res_0000000b"]),
        ({"query": "BBC"}, ["res_0000000a"]),
        ({"query": "100%"}, ["res_0000000c"]),
        ({"query": "%"}, ["res_0000000c"]),
        ({"query": "_"}, []),
        ({"query": "   "}, ["res_0000000a", "res_0000000b", "res_0000000c"]),
    ],
)
def test_filters(client, alice, params, expected):
    assert ids(client.get("/history", params=params, headers=alice)) == expected


def test_detail_returns_the_full_result(client, alice):
    response = client.get("/history/res_0000000b", headers=alice)
    assert response.status_code == 200
    body = response.json()
    assert body["contentType"] == "video"
    assert "video" in body and "article" not in body and "saved" not in body


def test_other_users_cannot_see_the_history(client, alice):
    bob, _ = sign_in(client, "bob@example.com")
    assert ids(client.get("/history", headers=bob)) == []
    response = client.get("/history/res_0000000a", headers=bob)
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"


@pytest.mark.parametrize("path", ["/history", "/history/res_0000000a", "/diet"])
def test_history_requires_a_session(client, path):
    assert client.get(path).json()["code"] == "SESSION_EXPIRED"


@pytest.mark.parametrize("params", [{"type": "podcast"}, {"period": "1y"}])
def test_invalid_filters_are_invalid_input(client, alice, params):
    response = client.get("/history", params=params, headers=alice)
    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_INPUT"


def test_reanalysing_a_url_updates_instead_of_duplicating(client, session):
    _, user_id = sign_in(client, "carl@example.com")
    url = "https://news.example/story"
    earlier = utc_now() - timedelta(days=3)
    save_analysis(session, user_id, make_result("res_000000a1", earlier, 30, url=url))
    stored = save_analysis(session, user_id, {**make_result("res_000000a2", utc_now(), 70, url=url), "saved": True})

    rows = list_analyses(session, user_id)
    assert len(rows) == 1
    assert rows[0]["riskScore"] == 70
    assert rows[0]["id"] == stored["id"] == "res_000000a2"
    assert "saved" not in rows[0]


def test_taken_result_id_gets_a_fresh_one(client, session):
    _, first_user = sign_in(client, "dina@example.com")
    _, second_user = sign_in(client, "eli@example.com")
    shared = make_result("res_000000ff", utc_now(), 40)
    save_analysis(session, first_user, shared)
    stored = save_analysis(session, second_user, shared)

    assert stored["id"] != "res_000000ff"
    assert [r["id"] for r in list_analyses(session, first_user)] == ["res_000000ff"]
    assert [r["id"] for r in list_analyses(session, second_user)] == [stored["id"]]


def test_save_rejects_results_that_break_the_contract(client, session):
    _, user_id = sign_in(client, "finn@example.com")
    broken = make_result("res_000000b0", utc_now(), 40)
    del broken["article"]
    with pytest.raises(ValueError):
        save_analysis(session, user_id, broken)
