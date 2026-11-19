"""Database tables. Analysis keeps the full AnalysisResult JSON plus the columns we filter on."""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Stored lower-cased, so the unique index makes emails case-insensitively unique.
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    verification_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verification_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verification_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reset_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reset_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    session_version: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (UniqueConstraint("user_id", "url", name="uq_analysis_user_url"),)

    row_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    result_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(String(2048), index=True)
    content_type: Mapped[str] = mapped_column(String(10), index=True)
    title: Mapped[str] = mapped_column(String(1000))
    source: Mapped[str] = mapped_column(String(300))
    risk_score: Mapped[int] = mapped_column(Integer, index=True)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    result: Mapped[dict] = mapped_column(JSON)
