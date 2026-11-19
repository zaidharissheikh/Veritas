"""Time windows for the history filter and the diet comparison (mirrors dashboard lib/dates.js)."""
from datetime import datetime, timedelta

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def period_start(period: str, now: datetime) -> datetime | None:
    """Start of the period, or None for 'all'."""
    days = PERIOD_DAYS.get(period)
    return now - timedelta(days=days) if days else None


def previous_period_range(period: str, now: datetime) -> tuple[datetime, datetime] | None:
    """The equally long window right before the period, or None for 'all'."""
    days = PERIOD_DAYS.get(period)
    if not days:
        return None
    return now - timedelta(days=2 * days), now - timedelta(days=days)
