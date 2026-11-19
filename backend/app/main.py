"""FastAPI app factory. Run: uvicorn app.main:app --reload --port 8000"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import SessionLocal, create_tables
from app.errors import install_error_handlers
from app.routers import analyze, auth, diet, health, history, password_reset
from app.seed.seed import seed_demo_data

logger = logging.getLogger("veritas")


def warn_about_dev_secret() -> None:
    if settings.using_dev_jwt_secret:
        logger.warning(
            "JWT_SECRET is not set: using the built-in DEV-ONLY signing secret. "
            "Set JWT_SECRET in backend/.env before running anywhere but your own machine."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    warn_about_dev_secret()
    if settings.seed_demo:
        with SessionLocal() as session:
            seed_demo_data(session)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Veritas API", version="1.0.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    install_error_handlers(app)
    for module in (health, auth, password_reset, history, diet, analyze):
        app.include_router(module.router)
    return app


app = create_app()
