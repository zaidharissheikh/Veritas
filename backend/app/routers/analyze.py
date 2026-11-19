"""POST /analyze/article and /analyze/video. Anyone may analyse; signed-in users also get it saved."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.analysis.article_analyzer import analyze_article
from app.analysis.video_analyzer import analyze_video
from app.db import get_db
from app.models import User
from app.repository import save_analysis
from app.schemas import AnalysisResult, ArticleRequest, VideoRequest
from app.security import optional_user

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/article", response_model=AnalysisResult)
async def analyze_article_route(
    payload: ArticleRequest,
    user: User | None = Depends(optional_user),
    session: Session = Depends(get_db),
) -> dict:
    result = await analyze_article(payload.url, payload.headline, payload.body)
    return _save_for_user(result, user, session)


@router.post("/video", response_model=AnalysisResult)
async def analyze_video_route(
    payload: VideoRequest,
    user: User | None = Depends(optional_user),
    session: Session = Depends(get_db),
) -> dict:
    result = await analyze_video(payload.url, payload.video_id, payload.title)
    return _save_for_user(result, user, session)


def _save_for_user(result: dict, user: User | None, session: Session) -> dict:
    if user is None:
        return {**result, "saved": False}
    # The stored copy may carry a different id (if this one was taken), so return that one.
    stored = save_analysis(session, user.id, result)
    return {**stored, "saved": True}
