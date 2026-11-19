"""Small builders shared by the backend-core tests."""
from datetime import datetime

from app.timeutil import iso_z

DEFAULT_PASSWORD = "Passw0rd!"

ARTICLE_GAUGES = [("sensationalism", "Sensationalism"), ("mismatch", "Headline mismatch")]
VIDEO_GAUGES = [("baitSwitch", "Bait-and-switch"), ("titleHype", "Title hype")]


def risk_level(score: int) -> str:
    if score < 34:
        return "low"
    return "medium" if score < 67 else "high"


def make_result(
    result_id: str,
    analyzed_at: datetime,
    risk_score: int = 20,
    content_type: str = "article",
    url: str | None = None,
    title: str = "Council publishes budget report",
    source: str = "example.com",
    highlights: list[dict] | None = None,
) -> dict:
    """A valid AnalysisResult dict (camelCase), as the analysis code would hand to save_analysis."""
    gauges = ARTICLE_GAUGES if content_type == "article" else VIDEO_GAUGES
    result = {
        "id": result_id,
        "contentType": content_type,
        "url": url or f"https://{source}/{result_id}",
        "title": title,
        "source": source,
        "analyzedAt": iso_z(analyzed_at),
        "riskScore": risk_score,
        "riskLevel": risk_level(risk_score),
        "gauges": [{"key": key, "label": label, "value": risk_score} for key, label in gauges],
        "summary": "Plain-language explanation.",
        "excerpt": title,
        "highlights": highlights or [],
        "isMock": False,
    }
    if content_type == "article":
        result["article"] = {"stanceLabel": "Agrees", "stanceConfidence": 0.9, "sensationalismScore": risk_score}
    else:
        result["video"] = {
            "videoId": "dQw4w9WgXcQ",
            "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
            "baitSwitchScore": risk_score,
        }
    return result


def highlight(token: str, weight: float, kind: str = "hyperbole", token_index: int = 0) -> dict:
    return {"tokenIndex": token_index, "token": token, "weight": weight, "kind": kind}


def register(client, email: str, password: str = DEFAULT_PASSWORD):
    return client.post("/auth/register", json={"email": email, "password": password})


def sign_in(client, email: str, password: str = DEFAULT_PASSWORD) -> tuple[dict, str]:
    """Register + log in. Returns (Authorization headers, user id)."""
    register(client, email, password)
    # Unrelated history/analysis tests use a verified fixture account.
    from app.db import SessionLocal
    from app.repository import find_user_by_email
    with SessionLocal() as session:
        user = find_user_by_email(session, email)
        user.email_verified = True
        session.commit()
    body = client.post("/auth/login", json={"email": email, "password": password}).json()
    return {"Authorization": f"Bearer {body['token']}"}, body["user"]["id"]
