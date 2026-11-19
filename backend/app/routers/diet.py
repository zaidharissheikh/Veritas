"""GET /diet: the signed-in user's information-diet summary for a period."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import repository
from app.db import get_db
from app.diet_summary import summarize_diet
from app.models import User
from app.periods import period_start, previous_period_range
from app.schemas import DietSummary, Period
from app.security import required_user
from app.timeutil import utc_now

router = APIRouter(tags=["diet"])


@router.get("/diet", response_model=DietSummary)
def get_diet(
    period: Period = Query("30d"),
    user: User = Depends(required_user),
    session: Session = Depends(get_db),
) -> dict:
    now = utc_now()
    current = repository.analyses_between(session, user.id, period_start(period, now))
    window = previous_period_range(period, now)
    previous = repository.analyses_between(session, user.id, *window) if window else None
    return summarize_diet(current, previous, period, now)
