from fastapi import APIRouter

from backend.app.api import calendar, export, harmonized, health, hotspots, regions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(regions.router)
api_router.include_router(hotspots.router)
api_router.include_router(harmonized.router)
api_router.include_router(calendar.router)
api_router.include_router(export.router)
