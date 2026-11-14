from datetime import date

from fastapi import APIRouter, Depends, Query

from backend.app.db import Database, get_db
from backend.app.errors import ApiError
from backend.app.services.filters import check_dates, parse_bbox
from backend.app.services import queries

router = APIRouter(prefix="/harmonized", tags=["harmonized"])


@router.get("/events")
def events(
    bbox: str | None = None,
    date_start: date | None = None,
    date_end: date | None = None,
    hfii_min: float | None = None,
    hfii_max: float | None = None,
    limit: int = Query(default=100, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Database = Depends(get_db),
) -> dict:
    check_dates(date_start, date_end)
    return queries.list_events(db, parse_bbox(bbox), date_start, date_end, hfii_min, hfii_max, limit, offset)


@router.get("/events/{event_id}")
def event_detail(event_id: str, db: Database = Depends(get_db)) -> dict:
    event = queries.get_event(db, event_id)
    if event is None:
        raise ApiError(404, "Not Found", "Evento armonizado no encontrado.", {"event_id": event_id})
    return event


@router.get("/h3")
def h3_cells(
    resolution: int = Query(default=8, ge=5, le=10),
    date: date | None = None,
    region_id: str | None = None,
    db: Database = Depends(get_db),
) -> list[dict]:
    return queries.list_h3(db, resolution, date, region_id)


@router.get("/statistics")
def statistics(
    region_id: str | None = None,
    date_start: date | None = None,
    date_end: date | None = None,
    db: Database = Depends(get_db),
) -> dict:
    check_dates(date_start, date_end)
    return queries.harmonized_statistics(db, region_id, date_start, date_end)
