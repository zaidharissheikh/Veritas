"""Transactional account emails. Links use the configured dashboard, never request headers."""
from html import escape
from urllib.parse import urlencode, urlsplit

import httpx

from app.config import settings
from app.errors import ApiError

DELIVERY_ERROR = "We couldn't send the email. Please try again later."


def ensure_email_configured() -> None:
    url = urlsplit(settings.frontend_url)
    if (not settings.brevo_api_key.strip() or "@" not in settings.email_from
            or url.scheme not in {"http", "https"} or not url.netloc or url.query or url.fragment):
        raise ApiError("EMAIL_DELIVERY_FAILED", DELIVERY_ERROR, 503)


def send_action_email(email: str, token: str, *, path: str, subject: str,
                      introduction: str, action: str, ttl_minutes: int) -> None:
    ensure_email_configured()
    link = f"{settings.frontend_url.rstrip('/')}{path}?{urlencode({'token': token})}"
    expiry = f"This link expires in {ttl_minutes} minutes and can be used once."
    ignore = "If you did not request this email, ignore it. Your password has not been changed."
    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": settings.brevo_api_key, "Accept": "application/json"},
            json={
                "sender": {"name": "Veritas", "email": settings.email_from},
                "to": [{"email": email}], "subject": subject,
                "htmlContent": f'<p>{escape(introduction)}</p><p><a href="{escape(link, quote=True)}">{escape(action)}</a></p><p>{expiry}</p><p>{ignore}</p>',
                "textContent": f"{introduction}\n{action}: {link}\n{expiry}\n{ignore}",
            }, timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        raise ApiError("EMAIL_DELIVERY_FAILED", DELIVERY_ERROR, 503) from None
