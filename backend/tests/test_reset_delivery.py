"""Transactional delivery failures stay private and permit a safe retry."""
import httpx
import pytest

from app import password_reset
from app.config import settings
from app.db import SessionLocal
from app.errors import ApiError
from app.repository import find_user_by_email
from tests.helpers import sign_in

real_sender = password_reset.send_reset_email
EMAIL = 'reset@example.com'


def test_reset_sender_uses_configured_dashboard_and_ttl(monkeypatch):
    calls = []
    def post(url, **kwargs):
        calls.append((url, kwargs))
        return httpx.Response(201, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx, 'post', post)
    real_sender(EMAIL, 'private-token')
    url, kwargs = calls[0]
    assert url == 'https://api.brevo.com/v3/smtp/email'
    payload = kwargs['json']
    assert payload['to'] == [{'email': EMAIL}]
    assert 'http://localhost:5173/reset-password?token=private-token' in payload['textContent']
    assert '15 minutes' in payload['textContent']


@pytest.mark.parametrize('status', [401, 403, 429, 500])
def test_reset_delivery_provider_failures_are_sanitized(monkeypatch, status):
    monkeypatch.setattr(httpx, 'post', lambda url, **kwargs: httpx.Response(
        status, text='sensitive provider details', request=httpx.Request('POST', url)))
    with pytest.raises(ApiError) as error:
        real_sender(EMAIL, 'private-token')
    assert error.value.code == 'EMAIL_DELIVERY_FAILED'
    assert 'sensitive' not in error.value.message and 'private-token' not in error.value.message


def test_delivery_failure_does_not_reveal_account_and_allows_retry(client, monkeypatch, reset_mail):
    sign_in(client, EMAIL)
    def fail(*args):
        raise ApiError('EMAIL_DELIVERY_FAILED', 'private-provider-details', 503)
    monkeypatch.setattr(password_reset, 'send_reset_email', fail)
    failed = client.post('/auth/forgot-password', json={'email': EMAIL})
    unknown = client.post('/auth/forgot-password', json={'email': 'unknown@example.com'})
    assert failed.status_code == 200 and failed.json() == unknown.json()
    with SessionLocal() as session:
        user = find_user_by_email(session, EMAIL)
        assert user.reset_token_hash is None and user.reset_sent_at is None
    monkeypatch.setattr(password_reset, 'send_reset_email', lambda email, token: reset_mail.append((email, token)))
    assert client.post('/auth/forgot-password', json={'email': EMAIL}).status_code == 200
    assert len(reset_mail) == 1


def test_missing_delivery_config_is_identical_for_all_accounts(client, monkeypatch):
    sign_in(client, EMAIL)
    monkeypatch.setattr(settings, 'email_from', '')
    known = client.post('/auth/forgot-password', json={'email': EMAIL})
    unknown = client.post('/auth/forgot-password', json={'email': 'unknown@example.com'})
    assert known.status_code == unknown.status_code == 503
    assert known.json() == unknown.json()
