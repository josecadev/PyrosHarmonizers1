from fastapi import APIRouter, Depends, Query

from backend.app.db import Database, get_db
from backend.app.errors import ApiError
from backend.app.services import queries

router = APIRouter(prefix="/calendar", tags=["calendar"])

AGGREGATIONS = {"day", "week", "month", "year"}


def _aggregation(value: str) -> str:
    if value not in AGGREGATIONS:
        raise ApiError(400, "Bad Request", "aggregation debe ser day, week, month o year.")
    return value


@router.get("/heatmap")
def heatmap(
    region_id: str | None = None,
    year_start: int = Query(default=2000, ge=2000, le=2027),
    year_end: int = Query(default=2026, ge=2000, le=2027),
    aggregation: str = "month",
    db: Database = Depends(get_db),
) -> list[dict]:
    if year_start > year_end:
        raise ApiError(400, "Bad Request", "year_start no puede ser posterior a year_end.")
    return queries.calendar_heatmap(db, region_id, year_start, year_end, _aggregation(aggregation))


@router.get("/timeline")
def timeline(
    region_id: str | None = None,
    aggregation: str = "month",
    db: Database = Depends(get_db),
) -> list[dict]:
    return queries.calendar_timeline(db, region_id, _aggregation(aggregation))


@router.get("/anomalies")
def anomalies(
    region_id: str | None = None,
    threshold_zscore: float = 2.0,
    db: Database = Depends(get_db),
) -> list[dict]:
    return queries.calendar_anomalies(db, region_id, threshold_zscore)
