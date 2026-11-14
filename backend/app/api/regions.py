from fastapi import APIRouter, Depends, Query

from backend.app.db import Database, get_db
from backend.app.errors import ApiError
from backend.app.services import queries

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("")
def list_regions(
    limit: int = Query(default=100, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    db: Database = Depends(get_db),
) -> list[dict]:
    return queries.list_regions(db, limit, offset)


@router.get("/{region_id}")
def get_region(region_id: str, db: Database = Depends(get_db)) -> dict:
    region = queries.get_region(db, region_id)
    if region is None:
        raise ApiError(404, "Not Found", "Región no encontrada.", {"region_id": region_id})
    return region


@router.get("/{region_id}/stats")
def region_stats(region_id: str, db: Database = Depends(get_db)) -> dict:
    stats = queries.region_stats(db, region_id)
    if stats is None:
        raise ApiError(404, "Not Found", "Región no encontrada.", {"region_id": region_id})
    return stats
