"""One error shape for every failure: HTTP status + {"code", "message"}."""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("veritas")


class ApiError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"code": code, "message": message})


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


def describe_validation_error(exc: RequestValidationError) -> str:
    """Turn pydantic's error list into one plain sentence about the first problem."""
    errors = exc.errors()
    if not errors:
        return "The request is not valid."
    first = errors[0]
    field_path = [str(part) for part in first.get("loc", ()) if part not in ("body", "query", "path")]
    field = ".".join(field_path)
    reason = str(first.get("msg", "is not valid")).rstrip(".")
    return f"Check '{field}': {reason}." if field else f"The request is not valid: {reason}."


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(422, "INVALID_INPUT", describe_validation_error(exc))


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return error_response(404, "NOT_FOUND", "This page or resource does not exist.")
    if exc.status_code == 405:
        return error_response(405, "METHOD_NOT_ALLOWED", "This method is not allowed here.")
    return error_response(exc.status_code, "REQUEST_FAILED", str(exc.detail))


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Log the type only: exception text could carry request data we do not want in logs.
    logger.error("Unhandled %s on %s %s", type(exc).__name__, request.method, request.url.path)
    return error_response(500, "SERVER_ERROR", "Something went wrong on our side. Please try again.")


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
