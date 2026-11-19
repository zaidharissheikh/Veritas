"""POST /auth/register, POST /auth/login, GET /auth/me (BACKEND_CONTRACT section 2)."""
from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import repository
from app.db import get_db
from app.errors import ApiError
from app.email_verification import RESEND_MESSAGE, ensure_email_configured, issue_verification, verify_email
from app.email_rate_limit import email_request_limit
from app.models import User as UserRow
from app.schemas import Credentials, LoginResponse, User, UserEnvelope, MessageResponse, VerificationRequest, ResendVerificationRequest
from app.security import burn_password_check, create_access_token, hash_password, required_user, verify_password
from app.validators import email_problem, password_problem

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_TAKEN_MESSAGE = "An account with this email already exists. Try signing in instead."
INVALID_CREDENTIALS_MESSAGE = "That email and password don't match. Check them and try again."


def public_user(user: UserRow) -> User:
    return User(id=user.id, email=user.email, created_at=user.created_at)


def email_taken() -> ApiError:
    return ApiError("EMAIL_TAKEN", EMAIL_TAKEN_MESSAGE, 409)


@router.post("/register", status_code=201, response_model=UserEnvelope, dependencies=[Depends(email_request_limit)])
def register(body: Credentials, session: Session = Depends(get_db)) -> dict:
    problem = email_problem(body.email) or password_problem(body.password)
    if problem:
        raise ApiError("INVALID_INPUT", problem, 422)
    if repository.find_user_by_email(session, body.email):
        raise email_taken()
    problem = email_problem(body.email, check_deliverability=True)
    if problem:
        raise ApiError("INVALID_INPUT", problem, 422)
    ensure_email_configured()
    try:
        user = repository.create_user(session, body.email, hash_password(body.password))
    except IntegrityError:
        # Lost a race with a concurrent registration of the same email.
        session.rollback()
        raise email_taken() from None
    issue_verification(session, user)
    return {"user": public_user(user)}


@router.post("/verify-email", response_model=MessageResponse)
def confirm_email(body: VerificationRequest, session: Session = Depends(get_db)) -> dict:
    verify_email(session, body.token)
    return {"message": "Email verified. You can now sign in."}


@router.post("/resend-verification", response_model=MessageResponse, dependencies=[Depends(email_request_limit)])
def resend_verification(body: ResendVerificationRequest, session: Session = Depends(get_db)) -> dict:
    if email_problem(body.email):
        raise ApiError("INVALID_INPUT", "Enter a valid email address.", 422)
    user = repository.find_user_by_email(session, body.email)
    if user is not None and not user.email_verified:
        issue_verification(session, user)
    return {"message": RESEND_MESSAGE}


@router.post("/login", response_model=LoginResponse)
def login(body: Credentials, session: Session = Depends(get_db)) -> dict:
    user = repository.find_user_by_email(session, body.email)
    if user is None:
        burn_password_check(body.password)
    if user is None or not verify_password(body.password, user.password_hash):
        raise ApiError("INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE, 401)
    if not user.email_verified:
        raise ApiError("EMAIL_NOT_VERIFIED", "Verify your email before signing in. Request a new link from the sign-in page if needed.", 403)
    return {"user": public_user(user), "token": create_access_token(user)}


@router.get("/me", response_model=UserEnvelope)
def me(user: UserRow = Depends(required_user)) -> dict:
    return {"user": public_user(user)}
