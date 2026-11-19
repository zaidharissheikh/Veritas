"""JWT contents, expiry and tampering."""
from datetime import timedelta

import jwt

from app.config import settings
from app.repository import create_user
from app.security import create_access_token, decode_access_token, hash_password
from app.timeutil import utc_now
from tests.helpers import DEFAULT_PASSWORD, sign_in


def login_token(client, email: str) -> str:
    headers, _ = sign_in(client, email)
    return headers['Authorization'].removeprefix('Bearer ')


def test_token_payload_is_sub_email_exp_30_minutes(client):
    before = utc_now()
    token = login_token(client, "ivy@example.com")
    payload = jwt.decode(token, options={"verify_signature": False})
    assert set(payload) == {"sub", "email", "exp", "ver"}
    assert payload["ver"] == 0
    assert payload["sub"].startswith("usr_")
    assert payload["email"] == "ivy@example.com"
    assert jwt.get_unverified_header(token)["alg"] == "HS256"
    lifetime = payload["exp"] - before.timestamp()
    assert 30 * 60 - 5 <= lifetime <= 30 * 60 + 5


def test_expired_token_is_session_expired(client, session):
    user = create_user(session, "jack@example.com", hash_password(DEFAULT_PASSWORD))
    expired = create_access_token(user, now=utc_now() - timedelta(minutes=31))
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401
    assert response.json()["code"] == "SESSION_EXPIRED"


def test_token_still_valid_just_before_expiry(client, session):
    user = create_user(session, "kate@example.com", hash_password(DEFAULT_PASSWORD))
    user.email_verified = True
    session.commit()
    almost = create_access_token(user, now=utc_now() - timedelta(minutes=29))
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {almost}"})
    assert response.status_code == 200


def test_token_signed_with_another_secret_is_rejected(client):
    token = login_token(client, "liam@example.com")
    payload = jwt.decode(token, options={"verify_signature": False})
    forged = jwt.encode(payload, "some-other-secret-that-is-long-enough-1234", algorithm="HS256")
    assert decode_access_token(forged) is None
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_unsigned_token_is_rejected(client):
    token = login_token(client, "mia@example.com")
    payload = jwt.decode(token, options={"verify_signature": False})
    unsigned = jwt.encode(payload, None, algorithm="none")
    assert decode_access_token(unsigned) is None


def test_token_for_deleted_user_is_session_expired(client, session):
    user = create_user(session, "noah@example.com", hash_password(DEFAULT_PASSWORD))
    token = create_access_token(user)
    session.delete(user)
    session.commit()
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.json()["code"] == "SESSION_EXPIRED"


def test_tests_never_see_the_real_keys():
    # conftest replaces the keys; this guards against a test accidentally using .env values.
    assert settings.gemini_api_key == "test-gemini-key"
    assert settings.youtube_api_key == "test-youtube-key"
