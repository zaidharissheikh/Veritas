"""Password recovery lifecycle, account privacy, link isolation, and session invalidation."""
from datetime import timedelta

import jwt
import pytest
from sqlalchemy import select

from app.config import settings
from app.models import User
from app.password_reset import RESET_MESSAGE
from app.security import verify_password
from app.timeutil import to_naive_utc, utc_now
from tests.helpers import DEFAULT_PASSWORD, register, sign_in

EMAIL = 'reset@example.com'
NEW_PASSWORD = 'NewPassw0rd!'


def request(client, email=EMAIL):
    return client.post('/auth/forgot-password', json={'email': email})


def reset(client, token, password=NEW_PASSWORD):
    return client.post('/auth/reset-password', json={'token': token, 'password': password})


def account(session):
    session.expire_all()
    return session.scalar(select(User).where(User.email == EMAIL))


def test_reset_changes_only_password_and_revokes_existing_sessions(client, session, reset_mail):
    old_headers, user_id = sign_in(client, EMAIL)
    assert request(client).json() == {'message': RESET_MESSAGE}
    email, token = reset_mail[-1]
    assert email == EMAIL
    user = account(session)
    assert len(token) == 43 and token != user.reset_token_hash
    assert len(user.reset_token_hash) == 64
    assert verify_password(DEFAULT_PASSWORD, user.password_hash)
    assert client.get('/auth/me', headers=old_headers).status_code == 200
    assert reset(client, token).status_code == 200
    user = account(session)
    assert user.id == user_id and user.email_verified
    assert user.reset_token_hash is None and user.reset_expires_at is None
    assert user.session_version == 1
    assert verify_password(NEW_PASSWORD, user.password_hash)
    assert client.post('/auth/login', json={'email': EMAIL, 'password': DEFAULT_PASSWORD}).status_code == 401
    fresh = client.post('/auth/login', json={'email': EMAIL.upper(), 'password': NEW_PASSWORD})
    assert fresh.status_code == 200
    assert client.get('/auth/me', headers={'Authorization': 'Bearer ' + fresh.json()['token']}).status_code == 200
    for path in ['/auth/me', '/history', '/diet']:
        assert client.get(path, headers=old_headers).status_code == 401
    assert reset(client, token).json()['code'] == 'INVALID_RESET_TOKEN'


def test_unknown_unverified_and_known_accounts_get_same_response(client, reset_mail):
    unknown = request(client)
    register(client, EMAIL)
    pending = request(client)
    assert not reset_mail
    sign_in(client, 'verified@example.com')
    verified = request(client, 'verified@example.com')
    assert unknown.status_code == pending.status_code == verified.status_code == 200
    assert unknown.json() == pending.json() == verified.json()
    assert len(reset_mail) == 1


def test_expired_unknown_and_verification_tokens_cannot_reset(client, session, reset_mail, verification_mail):
    sign_in(client, EMAIL)
    request(client)
    token = reset_mail[-1][1]
    user = account(session)
    user.reset_expires_at = to_naive_utc(utc_now() - timedelta(seconds=1))
    session.commit()
    for invalid in [token, 'x' * 43, verification_mail[-1][1]]:
        assert reset(client, invalid).json()['code'] == 'INVALID_RESET_TOKEN'
    assert verify_password(DEFAULT_PASSWORD, account(session).password_hash)


def test_cooldown_and_replacement_invalidate_only_old_reset_links(client, session, reset_mail):
    sign_in(client, EMAIL)
    request(client)
    old = reset_mail[-1][1]
    request(client)
    assert len(reset_mail) == 1
    user = account(session)
    user.reset_sent_at = to_naive_utc(utc_now() - timedelta(minutes=2))
    session.commit()
    request(client, EMAIL.upper())
    assert len(reset_mail) == 2
    assert reset(client, old).status_code == 400
    assert client.post('/auth/verify-email', json={'token': reset_mail[-1][1]}).status_code == 400
    assert reset(client, reset_mail[-1][1]).status_code == 200


@pytest.mark.parametrize('password', ['short1', 'lettersonly', '12345678', 'Pass word1', ' Passw0rd!', 'Passw0rd! ', 'a1' * 40])
def test_invalid_password_does_not_consume_reset_link(client, password, reset_mail):
    sign_in(client, EMAIL)
    request(client)
    token = reset_mail[-1][1]
    assert reset(client, token, password).status_code == 422
    assert reset(client, token).status_code == 200


def test_legacy_tokens_work_until_password_is_reset(client, session, reset_mail):
    headers, _ = sign_in(client, EMAIL)
    payload = jwt.decode(headers['Authorization'].split()[1], options={'verify_signature': False})
    payload.pop('ver')
    legacy = {'Authorization': 'Bearer ' + jwt.encode(payload, settings.jwt_signing_key, algorithm='HS256')}
    assert client.get('/auth/me', headers=legacy).status_code == 200
    request(client)
    reset(client, reset_mail[-1][1])
    assert client.get('/auth/me', headers=legacy).status_code == 401


def test_reset_request_is_rate_limited(client):
    for _ in range(30):
        assert request(client).status_code == 200
    assert request(client).status_code == 429
    assert reset(client, 'x' * 43).status_code == 429
