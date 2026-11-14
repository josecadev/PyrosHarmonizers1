import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response

from backend.app.config import get_settings
from backend.app.db import Database, get_db
from backend.app.errors import error_body

router = APIRouter(tags=["health"])
STARTED_AT = time.time()


def _uptime() -> str:
    seconds = int(time.time() - STARTED_AT)
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    return f"{hours}h {minutes}m {secs}s"


@router.get("/health")
def health(response: Response, db: Database = Depends(get_db)) -> dict:
    info = db.health()
    if not info.get("ok"):
        response.status_code = 503
        return error_body(
            503,
            "Service Unavailable",
            "No hay conexión con PostgreSQL/PostGIS.",
            "/api/v1/health",
            {"reason": info.get("error")},
        )
    last = info.get("last_ingestion")
    last_text = None
    if last is not None and hasattr(last, "isoformat"):
        last_text = last.isoformat().replace("+00:00", "Z")
    return {
        "status": "healthy",
        "version": get_settings().api_version,
        "uptime": _uptime(),
        "db_connected": True,
        "postgis_version": info.get("postgis_version"),
        "last_ingestion": last_text,
        "checked_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
