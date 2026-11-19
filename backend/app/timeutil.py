"""UTC helpers. The database stores naive UTC datetimes; the API speaks ISO 8601 with 'Z'."""
from datetime import UTC, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    """Treat naive datetimes (SQLite drops tzinfo) as UTC."""
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def to_naive_utc(value: datetime) -> datetime:
    return as_utc(value).replace(tzinfo=None)


def iso_z(value: datetime) -> str:
    """Same format as JavaScript's Date.toISOString(): 2026-03-04T10:15:00.000Z."""
    return as_utc(value).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_iso(text: str) -> datetime:
    return as_utc(datetime.fromisoformat(text.replace("Z", "+00:00")))
