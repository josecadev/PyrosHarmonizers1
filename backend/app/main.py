"""PyrosHarmonizer — FastAPI Application Entry Point.

Reto #8: Harmonization of MODIS and VIIRS Hot Spots
NASA International Space Apps Challenge 2026 — Sede UCB Santa Cruz
"""

import sys
from pathlib import Path

# Add backend directory and repo root to sys.path
backend_dir = Path(__file__).resolve().parent.parent
repo_root = backend_dir.parent
for p in [str(backend_dir), str(repo_root)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.app.api import api_router
    from backend.app.errors import ApiError, api_error_handler
except ImportError:
    from app.api import api_router
    from app.errors import ApiError, api_error_handler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PyrosHarmonizer API",
    version="1.0.0",
    description="Unified Fire Regimes & Burning Activity Calendar — NASA Space Apps Challenge 2026",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_exception_handler(ApiError, api_error_handler)

# Open CORS configuration for Frontend consumption (Localhost, Next.js, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root information endpoint
@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    return {
        "project": "PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar",
        "challenge": "NASA Space Apps 2026 #8 — Harmonization of MODIS and VIIRS Hot Spots",
        "case_study": "El Efecto 2012 en la Chiquitanía (Santa Cruz, Bolivia)",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": "/api/v1",
    }


# Top-level health check alias
@app.get("/health", tags=["System"])
def root_health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }


# Include all REST API v1 routes (regions, hotspots, harmonized, calendar, export, health)
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
