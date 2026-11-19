"""Credential rules, worded like the dashboard's lib/validators.js so users see one voice."""
import re
from functools import cache

from email_validator import EmailNotValidError, EmailUndeliverableError, caching_resolver, validate_email

PASSWORD_MIN_LENGTH = 8
# bcrypt only reads the first 72 bytes; longer passwords would be silently truncated.
PASSWORD_MAX_BYTES = 72


def normalize_email(email: str) -> str:
    value = email.strip().lower()
    try:
        return validate_email(value, check_deliverability=False, allow_smtputf8=False, strict=True).ascii_email.lower()
    except EmailNotValidError:
        # Existing accounts can still be looked up, even if their address predates these rules.
        return value


@cache
def email_dns_resolver():
    return caching_resolver(timeout=3)


def email_problem(email: str, *, check_deliverability: bool = False) -> str | None:
    value = email.strip()
    if not value:
        return "Enter your email address."
    try:
        validate_email(value, check_deliverability=check_deliverability, allow_smtputf8=False,
                       strict=True, dns_resolver=email_dns_resolver() if check_deliverability else None)
    except EmailUndeliverableError:
        return "This email domain cannot receive email. Check your email address."
    except EmailNotValidError:
        return "Enter a valid email address, like name@example.com."
    return None


def password_problem(password: str) -> str | None:
    if not password:
        return "Enter a password."
    if re.search(r"[\s\ufeff]", password):
        return "Passwords cannot contain spaces or other whitespace."
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Use at least {PASSWORD_MIN_LENGTH} characters."
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        return f"Use at most {PASSWORD_MAX_BYTES} bytes (some characters use more than one)."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Include at least one letter and one number."
    return None
