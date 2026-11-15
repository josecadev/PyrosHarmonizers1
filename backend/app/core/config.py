import os
from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env"), extra="ignore")

    APP_NAME: str = "PyrosHarmonizer Data Engine"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # PostgreSQL 16 + PostGIS 3.4
    DATABASE_URL: str = Field(
        default="postgresql://pyros_user:pyros_password@localhost:5001/pyrosharmonizer_db",
        description="SQLAlchemy Database URL for PostGIS"
    )

    # NASA FIRMS API
    NASA_FIRMS_MAP_KEY: str = Field(
        default="",
        description="Map key token for NASA FIRMS REST API"
    )
    NASA_MAP_KEY: str = Field(
        default="",
        description="Alias for NASA_FIRMS_MAP_KEY"
    )

    # GeoSpatial Extents (min_lon, min_lat, max_lon, max_lat)
    CHIQUITANIA_BBOX: str = "-64.5,-20.5,-57.5,-13.5"
    BOLIVIA_BBOX: str = "-69.65,-22.90,-57.45,-9.67"

    # Quality Filtering Thresholds (Dev 1 Rules)
    MODIS_MIN_CONFIDENCE: int = 30
    VIIRS_MIN_CONFIDENCE: str = "nominal"  # low, nominal, high
    STATIC_ANOMALY_ANNUAL_DAYS_THRESHOLD: int = 300

    @property
    def active_map_key(self) -> str:
        return self.NASA_FIRMS_MAP_KEY or self.NASA_MAP_KEY or os.getenv("NASA_FIRMS_MAP_KEY", os.getenv("NASA_MAP_KEY", ""))

    @property
    def chiquitania_bbox_tuple(self) -> Tuple[float, float, float, float]:
        parts = [float(x.strip()) for x in self.CHIQUITANIA_BBOX.split(",")]
        return (parts[0], parts[1], parts[2], parts[3])

    @property
    def bolivia_bbox_tuple(self) -> Tuple[float, float, float, float]:
        parts = [float(x.strip()) for x in self.BOLIVIA_BBOX.split(",")]
        return (parts[0], parts[1], parts[2], parts[3])


settings = Settings()
