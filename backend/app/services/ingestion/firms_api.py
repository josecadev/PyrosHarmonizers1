"""NASA FIRMS REST API Near-Real-Time (NRT) Client & Ingestion Connector.

Implements DEV 1 Ticket #1.3:
- Async HTTP client with httpx for NASA FIRMS REST API (and synchronous fallback).
- Support for Area BBOX and Country NRT queries (MODIS_NRT, VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, VIIRS_NOAA21_NRT).
- Day ranges: 1 (24h), 2 (48h), or 7 (7 days).
- In-memory and database duplicate prevention using composite key:
  (latitude, longitude, acq_date, acq_time, satellite).
- Automatic PostGIS Point and Pixel Footprint Polygon generation.
- Audit logging into ingestion_logs.
"""

import io
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Set, Tuple
import httpx
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ingestion import IngestionLog
from app.models.modis import RawModisHotspot
from app.models.viirs import RawViirsHotspot
from app.services.ingestion.firms_csv import FirmsCsvIngestionService

logger = logging.getLogger(__name__)

BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api"

# Default NRT sources
NRT_SOURCES = [
    "MODIS_NRT",
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
]


class FirmsApiClient:
    def __init__(
        self,
        map_key: Optional[str] = None,
        db_session: Optional[Session] = None,
        timeout_seconds: float = 60.0,
    ):
        self.map_key = map_key or settings.active_map_key
        self.db = db_session
        self.timeout = timeout_seconds
        self.csv_service = FirmsCsvIngestionService(db_session=db_session)

    def _build_url(
        self,
        source: str,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
    ) -> str:
        if not self.map_key:
            raise ValueError(
                "NASA FIRMS MAP_KEY is not configured. Register at https://firms.modaps.eosdis.nasa.gov/api/ "
                "and set NASA_FIRMS_MAP_KEY in backend/.env"
            )

        day_range = max(1, min(day_range, 10))
        if country_code:
            return f"{BASE_URL}/country/csv/{self.map_key}/{source}/{country_code.upper()}/{day_range}"
        else:
            active_bbox = bbox or settings.CHIQUITANIA_BBOX
            return f"{BASE_URL}/area/csv/{self.map_key}/{source}/{active_bbox}/{day_range}"

    async def fetch_nrt_csv_text(
        self,
        source: str,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
    ) -> str:
        """Fetches CSV stream asynchronously from NASA FIRMS API."""
        url = self._build_url(source, bbox=bbox, country_code=country_code, day_range=day_range)
        logger.info(f"Querying NASA FIRMS API (async): {url.replace(self.map_key, '***MAP_KEY***')}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(
                    f"NASA FIRMS API returned error status {resp.status_code}: {resp.text[:200]}",
                    request=resp.request,
                    response=resp,
                )
            return resp.text

    def fetch_nrt_csv_text_sync(
        self,
        source: str,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
    ) -> str:
        """Fetches CSV stream synchronously from NASA FIRMS API."""
        url = self._build_url(source, bbox=bbox, country_code=country_code, day_range=day_range)
        logger.info(f"Querying NASA FIRMS API (sync): {url.replace(self.map_key, '***MAP_KEY***')}")

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                raise httpx.HTTPStatusError(
                    f"NASA FIRMS API returned error status {resp.status_code}: {resp.text[:200]}",
                    request=resp.request,
                    response=resp,
                )
            return resp.text

    def find_existing_duplicate_keys(
        self,
        sensor: str,
        dates_to_check: Set[str],
    ) -> Set[Tuple[float, float, str, str, str]]:
        """Queries database for existing records to prevent duplicates.
        
        Key: (round(latitude, 5), round(longitude, 5), acq_date_str, acq_time, satellite)
        """
        existing_keys: Set[Tuple[float, float, str, str, str]] = set()
        if not self.db or not dates_to_check:
            return existing_keys

        table_name = "pyrosharmonizer.raw_modis_hotspots" if sensor == "MODIS" else "pyrosharmonizer.raw_viirs_hotspots"
        formatted_dates = "', '".join(dates_to_check)

        query = text(f"""
            SELECT latitude, longitude, acq_date, acq_time, satellite
            FROM {table_name}
            WHERE acq_date IN ('{formatted_dates}')
        """)

        try:
            rows = self.db.execute(query).fetchall()
            for r in rows:
                lat = round(float(r[0]), 5)
                lon = round(float(r[1]), 5)
                d_str = str(r[2])
                t_str = str(r[3]).zfill(4)
                sat = str(r[4])
                existing_keys.add((lat, lon, d_str, t_str, sat))
        except Exception as exc:
            logger.warning(f"Failed to query existing duplicate keys from {table_name}: {exc}")

        return existing_keys

    def process_nrt_csv_payload(
        self,
        source: str,
        csv_text: str,
        day_range: int = 1,
        apply_cleaning: bool = True,
        start_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Parses CSV stream, normalizes geometries, filters duplicates, and inserts into DB."""
        if start_time is None:
            start_time = datetime.now(timezone.utc)
        sensor = "MODIS" if "MODIS" in source.upper() else "VIIRS"

        if not csv_text.strip():
            logger.info(f"Source {source} returned empty payload.")
            return {
                "source": source,
                "sensor": sensor,
                "status": "completed",
                "records_processed": 0,
                "records_inserted": 0,
                "records_duplicated": 0,
            }

        try:
            df = pd.read_csv(io.StringIO(csv_text))
        except Exception as exc:
            logger.error(f"Failed to parse CSV from {source}: {exc}")
            raise ValueError(f"Invalid CSV payload from NASA FIRMS: {exc}")

        total_read = len(df)
        if total_read == 0:
            return {
                "source": source,
                "sensor": sensor,
                "status": "completed",
                "records_processed": 0,
                "records_inserted": 0,
                "records_duplicated": 0,
            }

        # Normalize records
        if sensor == "MODIS":
            raw_records = self.csv_service.normalize_chunk_modis(df, apply_cleaning=apply_cleaning)
        else:
            raw_records = self.csv_service.normalize_chunk_viirs(df, apply_cleaning=apply_cleaning)

        # Deduplicate against in-batch and existing database records
        dates_in_batch = {str(r["acq_date"]) for r in raw_records}
        existing_keys = self.find_existing_duplicate_keys(sensor, dates_in_batch)

        seen_batch_keys: Set[Tuple[float, float, str, str, str]] = set()
        deduped_records: List[Dict[str, Any]] = []
        duplicates_count = 0

        for r in raw_records:
            composite_key = (
                r["latitude"],
                r["longitude"],
                str(r["acq_date"]),
                r["acq_time"],
                r["satellite"],
            )

            if composite_key in existing_keys or composite_key in seen_batch_keys:
                duplicates_count += 1
                continue

            seen_batch_keys.add(composite_key)
            deduped_records.append(r)

        # Insert new records into PostGIS database
        model_cls = RawModisHotspot if sensor == "MODIS" else RawViirsHotspot
        if self.db and deduped_records:
            self.db.bulk_insert_mappings(model_cls, deduped_records)
            self.db.commit()

        end_time = datetime.now(timezone.utc)
        duration_sec = (end_time - start_time).total_seconds()

        # Audit log entry
        summary = {
            "source": source,
            "sensor": sensor,
            "status": "completed",
            "day_range": day_range,
            "records_processed": total_read,
            "records_inserted": len(deduped_records),
            "records_duplicated": duplicates_count,
            "duration_seconds": round(duration_sec, 2),
        }

        if self.db:
            try:
                log_entry = IngestionLog(
                    source_url_or_file=f"API:{source}",
                    sensor=sensor,
                    status="completed",
                    start_time=start_time,
                    end_time=end_time,
                    records_processed=total_read,
                    records_inserted=len(deduped_records),
                    records_duplicated=duplicates_count,
                    execution_metadata=summary,
                )
                self.db.add(log_entry)
                self.db.commit()
            except Exception as e:
                logger.warning(f"Could not record ingestion log: {e}")

        logger.info(f"NRT Sync completed for {source}: {summary}")
        return summary

    async def sync_source_nrt(
        self,
        source: str,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
        apply_cleaning: bool = True,
    ) -> Dict[str, Any]:
        """Fetches, deduplicates, and ingests real-time active fires asynchronously."""
        start_time = datetime.now(timezone.utc)
        csv_text = await self.fetch_nrt_csv_text(
            source=source,
            bbox=bbox,
            country_code=country_code,
            day_range=day_range,
        )
        return self.process_nrt_csv_payload(
            source=source,
            csv_text=csv_text,
            day_range=day_range,
            apply_cleaning=apply_cleaning,
            start_time=start_time,
        )

    def sync_source_nrt_sync(
        self,
        source: str,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
        apply_cleaning: bool = True,
    ) -> Dict[str, Any]:
        """Fetches, deduplicates, and ingests real-time active fires synchronously."""
        start_time = datetime.now(timezone.utc)
        csv_text = self.fetch_nrt_csv_text_sync(
            source=source,
            bbox=bbox,
            country_code=country_code,
            day_range=day_range,
        )
        return self.process_nrt_csv_payload(
            source=source,
            csv_text=csv_text,
            day_range=day_range,
            apply_cleaning=apply_cleaning,
            start_time=start_time,
        )

    async def sync_all_nrt(
        self,
        sources: Optional[List[str]] = None,
        bbox: Optional[str] = None,
        country_code: Optional[str] = None,
        day_range: int = 1,
        apply_cleaning: bool = True,
    ) -> List[Dict[str, Any]]:
        """Synchronizes all standard NRT sources for the region."""
        active_sources = sources or NRT_SOURCES
        results: List[Dict[str, Any]] = []

        for src in active_sources:
            try:
                res = await self.sync_source_nrt(
                    source=src,
                    bbox=bbox,
                    country_code=country_code,
                    day_range=day_range,
                    apply_cleaning=apply_cleaning,
                )
                results.append(res)
            except Exception as exc:
                logger.error(f"Error synchronizing NRT source {src}: {exc}")
                results.append({
                    "source": src,
                    "status": "failed",
                    "error": str(exc),
                })

        return results
