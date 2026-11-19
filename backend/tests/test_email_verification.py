"""Verification lifecycle, API enforcement, delivery errors, and additive upgrades."""
from datetime import timedelta
import sqlite3

import httpx
import pytest
from sqlalchemy import create_engine, inspect, text, update

from app import email_verification
from app.config import settings
from app.db import SessionLocal
from app.errors import ApiError
from app.models import User
from app.repository import find_user_by_email
from app.security import create_access_token
from app.timeutil import to_naive_utc, utc_now
from tests.helpers import DEFAULT_PASSWORD, register

# Capture the real sender before the autouse fixture replaces it.
real_sender = email_verification.send_verification_email
EMAIL = 'verify@example.com'


def login(client):
    return client.post('/auth/login', json={'email': EMAIL, 'password': DEFAULT_PASSWORD})


def confirm(client, token):
    return client.post('/auth/verify-email', json={'token': token})


def allow_resend():
    with SessionLocal() as session:
        session.execute(update(User).where(User.email == EMAIL).values(
            verification_sent_at=to_naive_utc(utc_now() - timedelta(minutes=2))))
        session.commit()


def test_registration_is_pending_until_confirmed(client, verification_mail):
    assert register(client, EMAIL).status_code == 201
    assert login(client).status_code == 403
    assert login(client).json()['code'] == 'EMAIL_NOT_VERIFIED'
    email, token = verification_mail[-1]
    assert email == EMAIL
    with SessionLocal() as session:
        user = find_user_by_email(session, EMAIL)
        assert not user.email_verified
        assert user.verification_token_hash == email_verification.token_hash(token)
        assert token not in user.verification_token_hash
    assert confirm(client, token).status_code == 200
    response = login(client)
    assert response.status_code == 200
    headers = {'Authorization': 'Bearer ' + response.json()['token']}
    assert client.get('/auth/me', headers=headers).status_code == 200
    assert confirm(client, token).status_code == 400


def test_unverified_user_cannot_use_even_a_signed_access_token(client):
    register(client, EMAIL)
    with SessionLocal() as session:
        token = create_access_token(find_user_by_email(session, EMAIL))
    headers = {'Authorization': 'Bearer ' + token}
    for path in ['/auth/me', '/history', '/diet']:
        assert client.get(path, headers=headers).status_code == 401


def test_expired_and_unknown_links_are_rejected(client, verification_mail):
    register(client, EMAIL)
    with SessionLocal() as session:
        user = find_user_by_email(session, EMAIL)
        user.verification_expires_at = to_naive_utc(utc_now() - timedelta(seconds=1))
        session.commit()
    for token in [verification_mail[-1][1], 'x' * 43]:
        assert confirm(client, token).json()['code'] == 'INVALID_VERIFICATION_TOKEN'
    assert login(client).status_code == 403


def test_resend_cooldown_and_old_link_invalidation(client, verification_mail):
    register(client, EMAIL)
    old = verification_mail[-1][1]
    assert client.post('/auth/resend-verification', json={'email': EMAIL}).status_code == 200
    assert len(verification_mail) == 1
    allow_resend()
    assert client.post('/auth/resend-verification', json={'email': EMAIL.upper()}).status_code == 200
    assert len(verification_mail) == 2
    assert confirm(client, old).status_code == 400
    assert confirm(client, verification_mail[-1][1]).status_code == 200


def test_resend_does_not_disclose_unknown_or_verified_accounts(client, verification_mail):
    unknown = client.post('/auth/resend-verification', json={'email': 'unknown@example.com'})
    register(client, EMAIL)
    confirm(client, verification_mail[-1][1])
    verified = client.post('/auth/resend-verification', json={'email': EMAIL})
    assert unknown.json() == verified.json()
    assert len(verification_mail) == 1


def test_missing_sender_does_not_create_account(client, monkeypatch):
    monkeypatch.setattr(settings, 'email_from', '')
    assert register(client, EMAIL).json()['code'] == 'EMAIL_DELIVERY_FAILED'
    with SessionLocal() as session:
        assert find_user_by_email(session, EMAIL) is None


def test_delivery_failure_leaves_recoverable_pending_account(client, monkeypatch, verification_mail):
    def fail(*args):
        raise ApiError('EMAIL_DELIVERY_FAILED', 'Delivery failed', 503)
    monkeypatch.setattr(email_verification, 'send_verification_email', fail)
    assert register(client, EMAIL).status_code == 503
    assert login(client).status_code == 403
    with SessionLocal() as session:
        user = find_user_by_email(session, EMAIL)
        assert user.verification_token_hash is None
        assert user.verification_sent_at is None
    monkeypatch.setattr(email_verification, 'send_verification_email', lambda email, token: verification_mail.append((email, token)))
    assert client.post('/auth/resend-verification', json={'email': EMAIL}).status_code == 200
    assert confirm(client, verification_mail[-1][1]).status_code == 200


def test_email_request_limit(client):
    for _ in range(30):
        assert client.post('/auth/resend-verification', json={'email': EMAIL}).status_code == 200
    assert client.post('/auth/resend-verification', json={'email': EMAIL}).status_code == 429
    assert register(client, EMAIL).status_code == 429


def test_real_sender_uses_brevo_and_configured_frontend(monkeypatch):
    calls = []
    def post(url, **kwargs):
        calls.append((url, kwargs))
        return httpx.Response(201, json={'messageId': 'fake'}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx, 'post', post)
    real_sender(EMAIL, 'test-token')
    url, kwargs = calls[0]
    assert url == 'https://api.brevo.com/v3/smtp/email'
    assert kwargs['headers']['api-key'] == 'test-brevo-key'
    payload = kwargs['json']
    assert payload['sender']['email'] == 'test@veritas.example'
    assert payload['to'] == [{'email': EMAIL}]
    assert 'http://localhost:5173/verify-email?token=test-token' in payload['textContent']


@pytest.mark.parametrize('status', [401, 403, 429, 500])
def test_provider_errors_are_sanitized(monkeypatch, status):
    monkeypatch.setattr(httpx, 'post', lambda url, **kwargs: httpx.Response(
        status, text='sensitive provider details', request=httpx.Request('POST', url)))
    with pytest.raises(ApiError) as caught:
        real_sender(EMAIL, 'private-token')
    assert caught.value.code == 'EMAIL_DELIVERY_FAILED'
    assert 'sensitive' not in caught.value.message
    assert 'private-token' not in caught.value.message


def test_provider_timeout_is_sanitized(monkeypatch):
    def timeout(*args, **kwargs):
        raise httpx.ConnectTimeout('private provider details')
    monkeypatch.setattr(httpx, 'post', timeout)
    with pytest.raises(ApiError) as caught:
        real_sender(EMAIL, 'token')
    assert caught.value.code == 'EMAIL_DELIVERY_FAILED'


def test_existing_database_upgrade_preserves_accounts(monkeypatch):
    from app import db
    from tests.conftest import _TEST_DIR
    legacy = create_engine(f'sqlite:///{(_TEST_DIR / "legacy.db").as_posix()}')
    with legacy.begin() as connection:
        connection.execute(text('CREATE TABLE users (id VARCHAR(32) PRIMARY KEY, email VARCHAR(254), password_hash VARCHAR(100), created_at TIMESTAMP)'))
        connection.execute(text("INSERT INTO users VALUES ('usr_old', 'old@example.com', 'original-hash', '2026-01-01')"))
    monkeypatch.setattr(db, 'engine', legacy)
    db.create_tables()
    db.create_tables()  # Upgrade is idempotent.
    backups = list(_TEST_DIR.glob('legacy.pre-auth-upgrade-*.bak'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as backup:
        assert backup.execute('SELECT password_hash FROM users').fetchone()[0] == 'original-hash'
        assert 'email_verified' not in {row[1] for row in backup.execute('PRAGMA table_info(users)')}
    with legacy.connect() as connection:
        row = connection.execute(text('SELECT id, password_hash, email_verified FROM users')).one()
        assert tuple(row) == ('usr_old', 'original-hash', 0)
    assert 'verification_token_hash' in {c['name'] for c in inspect(legacy).get_columns('users')}
    legacy.dispose()
