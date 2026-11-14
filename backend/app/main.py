"""PyrosHarmonizer — FastAPI Application Entry Point.

Reto #8: Harmonization of MODIS and VIIRS Hot Spots
NASA International Space Apps Challenge 2026 — Sede UCB Santa Cruz
"""

import sys
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db, check_db_connection

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

# Open CORS configuration for Frontend consumption (Localhost, Vercel, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    return {
        "project": "PyrosHarmonizer — Unified Fire Regimes & Burning Activity Calendar",
        "challenge": "NASA Space Apps 2026 #8 — Harmonization of MODIS and VIIRS Hot Spots",
        "case_study": "El Efecto 2012 en la Chiquitanía (Santa Cruz, Bolivia)",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["System"])
@app.get("/api/v1/health", tags=["System"])
def health_check() -> Dict[str, Any]:
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "nasa_firms_key_configured": bool(settings.active_map_key),
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=5000, reload=True)
