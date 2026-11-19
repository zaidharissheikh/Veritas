"""SQLAlchemy engine, declarative base and the per-request session dependency."""
from collections.abc import Iterator
from datetime import datetime, UTC
from pathlib import Path
import sqlite3

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


def _connect_args(url: str) -> dict:
    # FastAPI may run a request's sync dependencies on a different thread than the handler.
    return {"check_same_thread": False} if url.startswith("sqlite") else {}


engine = create_engine(settings.database_url, connect_args=_connect_args(settings.database_url))
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


def create_tables() -> None:
    import app.models  # noqa: F401  (registers the tables on Base.metadata)

    Base.metadata.create_all(engine)
    # Additive upgrade for existing installations. No accounts or analyses are removed.
    columns = {column["name"] for column in inspect(engine).get_columns("users")}
    additions = {
        "email_verified": "BOOLEAN NOT NULL DEFAULT FALSE",
        "verification_token_hash": "VARCHAR(64)",
        "verification_expires_at": "TIMESTAMP",
        "verification_sent_at": "TIMESTAMP",
        "reset_token_hash": "VARCHAR(64)",
        "reset_expires_at": "TIMESTAMP",
        "reset_sent_at": "TIMESTAMP",
        "session_version": "INTEGER NOT NULL DEFAULT 0",
    }
    if engine.dialect.name == "sqlite" and set(additions) - columns:
        database = engine.url.database
        if database and database != ":memory:":
            # SQLite's backup API includes committed WAL data and leaves the original intact.
            backup = Path(database).with_suffix(f'.pre-auth-upgrade-{datetime.now(UTC):%Y%m%d%H%M%S%f}.bak')
            raw = engine.raw_connection()
            try:
                with sqlite3.connect(backup) as destination:
                    raw.driver_connection.backup(destination)
            finally:
                raw.close()
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {definition}"))
