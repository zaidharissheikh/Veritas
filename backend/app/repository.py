"""All database reads and writes. Routers and the analysis code never build queries themselves."""
from datetime import datetime

from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.ids import new_result_id, new_user_id
from app.models import Analysis, User
from app.periods import period_start
from app.schemas import AnalysisResult
from app.timeutil import to_naive_utc, utc_now
from app.validators import normalize_email


# ---- users -----------------------------------------------------------------

def find_user_by_email(session: Session, email: str) -> User | None:
    return session.scalar(select(User).where(User.email == normalize_email(email)))


def create_user(
    session: Session,
    email: str,
    password_hash: str,
    user_id: str | None = None,
    created_at: datetime | None = None,
) -> User:
    """Insert and commit. A duplicate email raises sqlalchemy.exc.IntegrityError."""
    user = User(
        id=user_id or new_user_id(),
        email=normalize_email(email),
        password_hash=password_hash,
        created_at=to_naive_utc(created_at or utc_now()),
    )
    session.add(user)
    session.commit()
    return user


# ---- analyses: writes -------------------------------------------------------

def _as_result(result: dict | BaseModel) -> AnalysisResult:
    data = result.model_dump(by_alias=True) if isinstance(result, BaseModel) else result
    # 'saved' describes one API response, not the stored row.
    return AnalysisResult.model_validate(data).model_copy(update={"saved": None})


def _unclaimed_result_id(session: Session, wanted: str, row: Analysis | None) -> str:
    """Keep the result's id unless another row already uses it (e.g. a cached result saved by a second user)."""
    owner = session.scalar(select(Analysis).where(Analysis.result_id == wanted))
    return wanted if owner is None or owner is row else new_result_id()


def _fill_row(row: Analysis, result: AnalysisResult) -> None:
    row.result_id = result.id
    row.url = result.url
    row.content_type = result.content_type
    row.title = result.title
    row.source = result.source
    row.risk_score = result.risk_score
    row.analyzed_at = to_naive_utc(result.analyzed_at)
    row.is_mock = result.is_mock
    row.result = result.model_dump(by_alias=True, mode="json")


def save_analysis(session: Session, user_id: str, result: dict | BaseModel) -> dict:
    """Upsert by (user_id, url) and commit. Returns the stored AnalysisResult JSON.

    Use the returned dict: its id differs from the input only when that id was taken.
    """
    validated = _as_result(result)
    row = session.scalar(select(Analysis).where(Analysis.user_id == user_id, Analysis.url == validated.url))
    validated = validated.model_copy(update={"id": _unclaimed_result_id(session, validated.id, row)})
    if row is None:
        row = Analysis(user_id=user_id)
        session.add(row)
    _fill_row(row, validated)
    session.commit()
    return row.result


# ---- analyses: reads --------------------------------------------------------

def _newest_first(stmt):
    return stmt.order_by(Analysis.analyzed_at.desc(), Analysis.row_id.desc())


def list_analyses(
    session: Session,
    user_id: str,
    content_type: str = "all",
    period: str = "all",
    query: str = "",
    now: datetime | None = None,
) -> list[dict]:
    """History filtered by type, time period and a title/source search, newest first."""
    stmt = select(Analysis.result).where(Analysis.user_id == user_id)
    if content_type != "all":
        stmt = stmt.where(Analysis.content_type == content_type)
    start = period_start(period, now or utc_now())
    if start is not None:
        stmt = stmt.where(Analysis.analyzed_at >= to_naive_utc(start))
    text = (query or "").strip()
    if text:
        stmt = stmt.where(
            or_(Analysis.title.icontains(text, autoescape=True), Analysis.source.icontains(text, autoescape=True))
        )
    return list(session.scalars(_newest_first(stmt)))


def get_analysis(session: Session, user_id: str, result_id: str) -> dict | None:
    """One result, only if it belongs to this user."""
    stmt = select(Analysis.result).where(Analysis.user_id == user_id, Analysis.result_id == result_id)
    return session.scalar(stmt)


def analyses_between(
    session: Session,
    user_id: str,
    start: datetime | None,
    end: datetime | None = None,
) -> list[dict]:
    """Results with start <= analyzedAt < end (either bound may be open), newest first."""
    stmt = select(Analysis.result).where(Analysis.user_id == user_id)
    if start is not None:
        stmt = stmt.where(Analysis.analyzed_at >= to_naive_utc(start))
    if end is not None:
        stmt = stmt.where(Analysis.analyzed_at < to_naive_utc(end))
    return list(session.scalars(_newest_first(stmt)))
