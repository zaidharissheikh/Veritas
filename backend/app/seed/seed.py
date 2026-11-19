"""Demo account with a populated history, so the dashboard charts have something to show."""
import json
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app import repository
from app.security import hash_password
from app.timeutil import iso_z, parse_iso, utc_now

SEED_FILE = Path(__file__).with_name("demo_history.json")
DEMO_EMAIL = "demo@veritas.app"
DEMO_PASSWORD = "Veritas123!"
DEMO_USER_ID = "usr_demo"


def load_demo_history() -> list[dict]:
    return json.loads(SEED_FILE.read_text(encoding="utf-8"))


def shift_to_recent(results: list[dict], now: datetime) -> list[dict]:
    """Move every date forward by whole days so the newest row lands within the last day.

    The JSON was generated once on a fixed date; without this the 7- and 30-day views
    of the demo would go empty a few weeks later.
    """
    newest = max(parse_iso(r["analyzedAt"]) for r in results)
    shift = timedelta(days=max(0, (now - newest).days))
    return [{**r, "analyzedAt": iso_z(parse_iso(r["analyzedAt"]) + shift)} for r in results]


def seed_demo_data(session: Session, now: datetime | None = None) -> bool:
    """Create the demo user and its history unless the user already exists. True if it seeded."""
    existing = repository.find_user_by_email(session, DEMO_EMAIL)
    if existing:
        # Only the known seed identity is exempt from mailbox verification.
        if existing.id == DEMO_USER_ID:
            existing.email_verified = True
            session.commit()
        return False
    user = repository.create_user(session, DEMO_EMAIL, hash_password(DEMO_PASSWORD), user_id=DEMO_USER_ID)
    user.email_verified = True
    session.commit()
    for result in shift_to_recent(load_demo_history(), now or utc_now()):
        repository.save_analysis(session, user.id, result)
    return True
