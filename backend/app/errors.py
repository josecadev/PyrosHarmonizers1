from datetime import datetime, timezone

from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    def __init__(self, status_code: int, error: str, message: str, details: dict | None = None):
        self.status_code = status_code
        self.error = error
        self.message = message
        self.details = details


def error_body(status_code: int, error: str, message: str, path: str, details: dict | None = None) -> dict:
    return {
        "status_code": status_code,
        "error": error,
        "message": message,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "path": path,
    }


async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code, exc.error, exc.message, request.url.path, exc.details),
    )
