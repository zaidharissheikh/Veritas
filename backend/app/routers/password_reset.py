"""Public password recovery endpoints. Never disclose whether an account exists."""
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.email_delivery import ensure_email_configured
from app.email_rate_limit import email_request_limit
from app.errors import ApiError
from app.password_reset import RESET_MESSAGE, request_reset, reset_password
from app.schemas import MessageResponse, PasswordResetRequest, ResendVerificationRequest
from app.validators import email_problem, password_problem

router = APIRouter(prefix="/auth", tags=["auth"], dependencies=[Depends(email_request_limit)])


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ResendVerificationRequest, background_tasks: BackgroundTasks) -> dict:
    problem = email_problem(body.email)
    if problem:
        raise ApiError("INVALID_INPUT", problem, 422)
    ensure_email_configured()
    background_tasks.add_task(request_reset, body.email)
    return {"message": RESET_MESSAGE}


@router.post("/reset-password", response_model=MessageResponse)
def confirm_reset(body: PasswordResetRequest, session: Session = Depends(get_db)) -> dict:
    problem = password_problem(body.password)
    if problem:
        raise ApiError("INVALID_INPUT", problem, 422)
    reset_password(session, body.token, body.password)
    return {"message": "Password reset. Sign in with your new password."}
