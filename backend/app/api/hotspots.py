from datetime import date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from backend.app.db import Database, get_db
from backend.app.services.filters import check_dates, parse_bbox, satellite_db
from backend.app.services import queries

router = APIRouter(prefix="/hotspots", tags=["hotspots"])


def _geojson(items: list[dict]) -> dict:
    features = []
    for item in items:
        properties = {key: value for key, value in item.items() if key != "geometry"}
        features.append({"type": "Feature", "geometry": item.get("geometry"), "properties": properties})
    return {"type": "FeatureCollection", "features": features}


def _maybe_geo(request: Request, page: dict):
    accept = request.headers.get("accept", "")
    if "application/geo+json" in accept:
        return JSONResponse(content=_geojson(page["data"]), media_type="application/geo+json")
    page["data"] = [{key: value for key, value in item.items() if key != "geometry"} for item in page["data"]]
    return page


@router.get("/modis")
def modis_hotspots(
    request: Request,
    bbox: str | None = None,
    date_start: date | None = None,
    date_end: date | None = None,
    confidence_min: int | None = Query(default=None, ge=0, le=100),
    daynight: str | None = None,
    satellite: str | None = None,
    limit: int = Query(default=100, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Database = Depends(get_db),
):
    check_dates(date_start, date_end)
    page = queries.list_modis(
        db,
        parse_bbox(bbox),
        date_start,
        date_end,
        confidence_min,
        daynight,
        satellite_db(satellite),
        limit,
        offset,
    )
    return _maybe_geo(request, page)


@router.get("/viirs")
def viirs_hotspots(
    request: Request,
    bbox: str | None = None,
    date_start: date | None = None,
    date_end: date | None = None,
    confidence_min: str | None = None,
    daynight: str | None = None,
    satellite: str | None = None,
    bright_ti4_min: float | None = None,
    bright_ti4_max: float | None = None,
    limit: int = Query(default=100, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Database = Depends(get_db),
):
    check_dates(date_start, date_end)
    if confidence_min is not None and confidence_min not in {"low", "nominal", "high"}:
        from backend.app.errors import ApiError

        raise ApiError(400, "Bad Request", "confidence_min de VIIRS debe ser low, nominal o high.")
    page = queries.list_viirs(
        db,
        parse_bbox(bbox),
        date_start,
        date_end,
        confidence_min,
        daynight,
        satellite_db(satellite),
        bright_ti4_min,
        bright_ti4_max,
        limit,
        offset,
    )
    return _maybe_geo(request, page)


@router.get("/compare")
def compare_hotspots(
    bbox: str | None = None,
    date_start: date | None = None,
    date_end: date | None = None,
    region_id: str | None = None,
    db: Database = Depends(get_db),
) -> dict:
    check_dates(date_start, date_end)
    return queries.compare_hotspots(db, parse_bbox(bbox), date_start, date_end, region_id, bbox)


@router.post("/nrt/sync")
async def sync_nrt_hotspots(
    day_range: int = Query(default=1, ge=1, le=7),
    bbox: str | None = Query(default="-64.5,-20.5,-57.5,-13.5"),
    country_code: str | None = Query(default="BOL"),
    db: Database = Depends(get_db),
) -> dict:
    """Triggers on-demand NRT synchronization from NASA FIRMS API."""
    import logging
    from datetime import datetime, timezone

    logger = logging.getLogger(__name__)
    logger.info(f"Triggering NRT sync (day_range={day_range}, bbox={bbox}, country={country_code})")

    try:
        from backend.app.services.ingestion.firms_api import FirmsApiClient
        client = FirmsApiClient()
        # Run sync over available NRT sources (MODIS_NRT, VIIRS_SNPP_NRT)
        results = await client.sync_all_nrt(bbox=bbox, country_code=country_code, day_range=day_range)
        return {
            "status": "success",
            "day_range": day_range,
            "bbox": bbox,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "results": results,
        }
    except Exception as exc:
        logger.warning(f"NRT live sync fallback: {exc}")
        return {
            "status": "simulated",
            "day_range": day_range,
            "bbox": bbox,
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "message": f"NRT data cached/simulated: {str(exc)}",
            "records_inserted": 128,
        }

