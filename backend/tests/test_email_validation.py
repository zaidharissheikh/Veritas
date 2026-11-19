"""Syntax fixtures shared with the dashboard, plus server-only mail-domain checks."""
import json
from pathlib import Path
from types import SimpleNamespace

import dns.exception
import dns.resolver
import pytest

from app.validators import email_problem, normalize_email
from tests.helpers import register

CASES = json.loads((Path(__file__).resolve().parents[2] / 'shared/email-validation-cases.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('email', CASES['valid'])
def test_valid_email_formats(email):
    assert email_problem(email) is None


@pytest.mark.parametrize('email', CASES['invalid'])
def test_invalid_email_formats(email):
    assert email_problem(email) is not None


@pytest.mark.parametrize('email', ['a' * 65 + '@example.com', 'a@' + 'b' * 64 + '.com',
                                  'a' * 64 + '@' + '.'.join(['b' * 63] * 3) + '.com'])
def test_email_length_limits(email):
    assert email_problem(email) is not None


def test_email_normalization_preserves_aliases_and_normalizes_idn():
    assert normalize_email('  User+Tag@BÜCHER.DE  ') == 'user+tag@xn--bcher-kva.de'
    assert normalize_email('First.Last@Gmail.com') == 'first.last@gmail.com'


@pytest.mark.parametrize('failure', [dns.resolver.NXDOMAIN, dns.resolver.NoAnswer])
def test_registration_rejects_nonexistent_or_non_mail_domain(client, email_dns, failure, verification_mail):
    def fail(*args):
        raise failure()
    email_dns.resolve = fail
    response = register(client, 'person@no-mail-domain.com')
    assert response.status_code == 422
    assert response.json()['code'] == 'INVALID_INPUT'
    assert verification_mail == []


def test_registration_rejects_null_mx_domain(client, email_dns):
    email_dns.resolve = lambda *args: [SimpleNamespace(preference=0, exchange='.')]
    assert register(client, 'person@no-mail-domain.com').status_code == 422


def test_temporary_dns_timeout_still_requires_mailbox_verification(client, email_dns):
    def timeout(*args):
        raise dns.exception.Timeout()
    email_dns.resolve = timeout
    assert register(client, 'person@mail-domain.com').status_code == 201
    response = client.post('/auth/login', json={'email': 'person@mail-domain.com', 'password': 'Passw0rd!'})
    assert response.json()['code'] == 'EMAIL_NOT_VERIFIED'


def test_login_and_reset_request_never_need_dns(client, email_dns):
    def unexpected(*args):
        raise AssertionError('Login/recovery must not perform DNS lookups')
    email_dns.resolve = unexpected
    assert client.post('/auth/login', json={'email': 'person@example.com', 'password': 'Passw0rd!'}).status_code == 401
    assert client.post('/auth/forgot-password', json={'email': 'person@example.com'}).status_code == 200
