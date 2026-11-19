"""Single-use password recovery links; requesting a link never changes account access."""
import logging
import secrets
from datetime import timedelta

from sqlalchemy import or_, update
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.email_delivery import send_action_email
from app.email_verification import token_hash
from app.errors import ApiError
from app.models import User
from app.repository import find_user_by_email
from app.security import hash_password
from app.timeutil import to_naive_utc, utc_now

RESET_MESSAGE = "If an eligible account exists for this email, a password reset link will be sent. Check your inbox and spam folder."
logger = logging.getLogger("veritas")


def send_reset_email(email: str, token: str) -> None:
    send_action_email(email, token, path="/reset-password", subject="Reset your Veritas password",
                      introduction="Use this link to choose a new password for your Veritas account.",
                      action="Reset password", ttl_minutes=settings.password_reset_ttl_minutes)


def issue_reset(session: Session, user: User) -> None:
    now = to_naive_utc(utc_now())
    token = secrets.token_urlsafe(32)
    digest = token_hash(token)
    reserved = session.execute(update(User).where(
        User.id == user.id, User.email_verified.is_(True),
        or_(User.reset_sent_at.is_(None), User.reset_sent_at <= now - timedelta(seconds=60)),
    ).values(reset_token_hash=digest, reset_expires_at=now + timedelta(minutes=settings.password_reset_ttl_minutes),
             reset_sent_at=now), execution_options={"synchronize_session": False})
    session.commit()
    if not reserved.rowcount:
        return
    try:
        send_reset_email(user.email, token)
    except ApiError:
        session.execute(update(User).where(User.id == user.id, User.reset_token_hash == digest).values(
            reset_token_hash=None, reset_expires_at=None, reset_sent_at=None))
        session.commit()
        raise


def request_reset(email: str) -> None:
    # Run after responding, including for unknown addresses, to avoid revealing accounts by delivery time.
    try:
        with SessionLocal() as session:
            user = find_user_by_email(session, email)
            if user is not None and user.email_verified:
                issue_reset(session, user)
    except Exception as failure:
        # Neither token, email address, nor provider response belongs in application logs.
        logger.warning("Password reset delivery failed (%s)", type(failure).__name__)


def reset_password(session: Session, token: str, password: str) -> None:
    now = to_naive_utc(utc_now())
    changed = session.execute(update(User).where(
        User.reset_token_hash == token_hash(token), User.reset_expires_at > now, User.email_verified.is_(True),
    ).values(password_hash=hash_password(password), reset_token_hash=None, reset_expires_at=None, reset_sent_at=None,
             session_version=User.session_version + 1), execution_options={"synchronize_session": False})
    session.commit()
    if not changed.rowcount:
        raise ApiError("INVALID_RESET_TOKEN", "This reset link is invalid, expired, or already used. Request a new link.", 400)
