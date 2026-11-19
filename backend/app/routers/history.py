"""GET /history and GET /history/{id}, always scoped to the signed-in user."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import repository
from app.db import get_db
from app.errors import ApiError
from app.models import User
from app.schemas import AnalysisResult, Period, TypeFilter
from app.security import required_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=list[AnalysisResult])
def list_history(
    content_type: TypeFilter = Query("all", alias="type"),
    period: Period = Query("all"),
    query: str = Query("", max_length=200),
    user: User = Depends(required_user),
    session: Session = Depends(get_db),
) -> list[dict]:
    return repository.list_analyses(session, user.id, content_type, period, query)


@router.get("/{result_id}", response_model=AnalysisResult)
def get_history_item(
    result_id: str,
    user: User = Depends(required_user),
    session: Session = Depends(get_db),
) -> dict:
    # Another user's id is reported as NOT_FOUND too, so ids cannot be probed.
    result = repository.get_analysis(session, user.id, result_id)
    if result is None:
        raise ApiError("NOT_FOUND", "This analysis could not be found.", 404)
    return result
