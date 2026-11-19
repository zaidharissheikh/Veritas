"""GET /health: liveness plus whether the keys are set (never the keys themselves)."""
from fastapi import APIRouter

from app.config import settings
from app.schemas import Health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health)
def health() -> Health:
    return Health(
        status="ok",
        gemini_configured=settings.gemini_configured,
        youtube_configured=settings.youtube_configured,
    )
