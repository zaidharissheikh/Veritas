"""Single-use verification tokens and Brevo delivery. Never log tokens or provider responses."""
import hashlib
import secrets
from datetime import timedelta
from sqlalchemy import or_, update
from sqlalchemy.orm import Session

from app.config import settings
from app.email_delivery import ensure_email_configured, send_action_email
from app.errors import ApiError
from app.models import User
from app.timeutil import to_naive_utc, utc_now

RESEND_MESSAGE = "If this email belongs to an unverified account, a verification link will be sent. Check your inbox and spam folder."


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def send_verification_email(email: str, token: str) -> None:
    send_action_email(email, token, path="/verify-email", subject="Verify your Veritas email address",
                      introduction="Confirm your email address to finish creating your Veritas account.",
                      action="Verify email address", ttl_minutes=settings.verification_ttl_minutes)


def issue_verification(session: Session, user: User) -> bool:
    """Atomically reserve a send slot. Old links are invalidated on every successful reservation."""
    ensure_email_configured()
    now = to_naive_utc(utc_now())
    token = secrets.token_urlsafe(32)
    digest = token_hash(token)
    result = session.execute(
        update(User).where(
            User.id == user.id, User.email_verified.is_(False),
            or_(User.verification_sent_at.is_(None), User.verification_sent_at <= now - timedelta(seconds=60)),
        ).values(
            verification_token_hash=digest,
            verification_expires_at=now + timedelta(minutes=settings.verification_ttl_minutes),
            verification_sent_at=now,
        ), execution_options={"synchronize_session": False},
    )
    session.commit()
    if not result.rowcount:
        return False
    try:
        send_verification_email(user.email, token)
    except ApiError:
        # Allow retry after delivery failure, without overwriting a concurrently verified account.
        session.execute(update(User).where(User.id == user.id, User.verification_token_hash == digest).values(
            verification_token_hash=None, verification_expires_at=None, verification_sent_at=None,
        ))
        session.commit()
        raise
    return True


def verify_email(session: Session, token: str) -> None:
    now = to_naive_utc(utc_now())
    result = session.execute(update(User).where(
        User.verification_token_hash == token_hash(token),
        User.email_verified.is_(False), User.verification_expires_at > now,
    ).values(email_verified=True, verification_token_hash=None, verification_expires_at=None))
    session.commit()
    if not result.rowcount:
        raise ApiError("INVALID_VERIFICATION_TOKEN", "This verification link is invalid, expired, or already used. Request a new link.", 400)
