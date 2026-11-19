"""Test setup: a throwaway SQLite file, fake API keys and fast bcrypt.

The environment is set before anything imports `app`, so the real backend/.env keys
and the real veritas.db are never touched by tests (environment beats .env).
"""
import os
import shutil
from pathlib import Path
from uuid import uuid4
from types import SimpleNamespace

# Use an isolated workspace directory with inherited ACLs. On Windows, mkdtemp's
# restrictive ACL can prevent a sandboxed SQLite connection from opening its files.
_TEST_DIR = Path(__file__).resolve().parents[1] / '.test-tmp' / f'run-{uuid4().hex}'
_TEST_DIR.mkdir(parents=True, exist_ok=True)
os.environ.update(
    {
        "DATABASE_URL": f"sqlite:///{(_TEST_DIR / 'test.db').as_posix()}",
        "GEMINI_API_KEY": "test-gemini-key",
        "YOUTUBE_API_KEY": "test-youtube-key",
        "JWT_SECRET": "test-only-jwt-secret-0123456789-abcdefghijklmnop",
        "BCRYPT_ROUNDS": "4",
        "SEED_DEMO": "false",
        "BREVO_API_KEY": "test-brevo-key",
        "EMAIL_FROM": "test@veritas.example",
        "FRONTEND_URL": "http://localhost:5173",
    }
)

import pytest  # noqa: E402

from app.db import Base, SessionLocal, create_tables, engine  # noqa: E402


@pytest.fixture(autouse=True)
def email_dns(monkeypatch):
    from app import validators

    # Never perform live DNS lookups in tests. Individual deliverability tests replace this resolver.
    resolver = SimpleNamespace(resolve=lambda domain, kind: [SimpleNamespace(preference=10, exchange='mail.example.com.')])
    monkeypatch.setattr(validators, 'email_dns_resolver', lambda: resolver)
    return resolver


@pytest.fixture(autouse=True)
def reset_mail(monkeypatch):
    from app import password_reset

    messages = []
    monkeypatch.setattr(password_reset, 'send_reset_email', lambda email, token: messages.append((email, token)))
    return messages


@pytest.fixture(autouse=True)
def verification_mail(monkeypatch):
    from app import email_verification
    from app.email_rate_limit import _attempts

    _attempts.clear()
    messages = []
    monkeypatch.setattr(email_verification, "send_verification_email", lambda email, token: messages.append((email, token)))
    yield messages


@pytest.fixture(autouse=True)
def fresh_database():
    Base.metadata.drop_all(engine)
    create_tables()
    yield


@pytest.fixture
def session():
    with SessionLocal() as db_session:
        yield db_session


@pytest.fixture
def client():
    # Imported lazily so the pure-function tests do not depend on every router importing.
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def pytest_sessionfinish(session, exitstatus):
    engine.dispose()
    shutil.rmtree(_TEST_DIR, ignore_errors=True)
