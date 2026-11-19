"""Password hashing, JWT tokens and the auth dependencies used by the routers."""
from datetime import datetime, timedelta
from functools import cache

import bcrypt
import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import ApiError
from app.models import User
from app.timeutil import utc_now

JWT_ALGORITHM = "HS256"
SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again."


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=settings.bcrypt_rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        # bcrypt 5 refuses inputs over 72 bytes; such a password can never match.
        return False


@cache
def _decoy_hash() -> str:
    return hash_password("veritas-decoy-password-1")


def burn_password_check(password: str) -> None:
    """Spend the same time as a real check so unknown emails are not revealed by timing."""
    verify_password(password, _decoy_hash())


def create_access_token(user: User, now: datetime | None = None) -> str:
    issued_at = now or utc_now()
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": issued_at + timedelta(minutes=settings.jwt_ttl_minutes),
        "ver": user.session_version,
    }
    return jwt.encode(payload, settings.jwt_signing_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """The token's payload, or None when it is malformed, tampered with or expired."""
    try:
        return jwt.decode(
            token,
            settings.jwt_signing_key,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
    except jwt.PyJWTError:
        return None


def bearer_token(authorization: str | None) -> str | None:
    scheme, _, token = (authorization or "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def user_from_authorization(authorization: str | None, session: Session) -> User | None:
    token = bearer_token(authorization)
    payload = decode_access_token(token) if token else None
    user_id = payload.get("sub") if payload else None
    user = session.get(User, user_id) if isinstance(user_id, str) else None
    if user is None or not user.email_verified or payload.get("ver", 0) != user.session_version:
        return None
    return user


def optional_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_db),
) -> User | None:
    """The signed-in user, or None for anonymous/invalid/expired tokens. Never raises."""
    return user_from_authorization(authorization, session)


def required_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_db),
) -> User:
    user = user_from_authorization(authorization, session)
    if user is None:
        raise ApiError("SESSION_EXPIRED", SESSION_EXPIRED_MESSAGE, 401)
    return user
