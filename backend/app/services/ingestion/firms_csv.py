"""Massive CSV Ingestion Pipeline for NASA FIRMS Historical and Archive Files.

Implements DEV 1 Ticket #1.2:
- Chunked streaming for large CSV files (MODIS 2000-2026, VIIRS 2012-2026)
- Datetime normalization (acq_date + acq_time -> acq_datetime UTC)
- Spatial geometry creation: PostGIS Point (geom) and Footprint Polygon (pixel_geom)
- Optional quality filtering (Ticket #1.4)
- Audit telemetry logging in ingestion_logs
"""

import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, date, timezone
from typing import Optional, Dict, Any, List, Tuple
import pandas as pd
from sqlalchemy import insert, text
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape

from app.models.ingestion import IngestionLog
from app.models.modis import RawModisHotspot
from app.models.viirs import RawViirsHotspot
from app.services.ingestion.normalizer import (
    parse_acq_datetime,
    calculate_pixel_geometry,
    normalize_satellite,
    normalize_confidence_modis,
    normalize_confidence_viirs,
    normalize_daynight,
    compute_h3_indices,
    is_within_bbox,
)
from app.services.ingestion.quality_cleaning import apply_quality_filters

logger = logging.getLogger(__name__)


class FirmsCsvIngestionService:
    def __init__(self, db_session: Optional[Session] = None):
        self.db = db_session

    def detect_sensor_type(self, df_sample: pd.DataFrame, file_path: str = "") -> str:
        """Determines whether the CSV file belongs to MODIS or VIIRS based on column signatures."""
        cols = [c.lower().strip() for c in df_sample.columns]
        fname = file_path.lower()

        if "bright_ti4" in cols or "bright_ti5" in cols or "viirs" in fname:
            return "VIIRS"
        elif "brightness" in cols or "bright_t31" in cols or "modis" in fname:
            return "MODIS"
        return "VIIRS" if any("viirs" in c for c in cols) else "MODIS"

    def normalize_chunk_modis(
        self,
        df_chunk: pd.DataFrame,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        apply_cleaning: bool = True,
    ) -> List[Dict[str, Any]]:
        """Normalizes a chunk of MODIS records."""
        # Standardize column names to lowercase
        df_chunk.columns = [c.strip().lower() for c in df_chunk.columns]

        if apply_cleaning:
            df_chunk = apply_quality_filters(df_chunk, sensor_type="MODIS")

        records: List[Dict[str, Any]] = []

        for _, row in df_chunk.iterrows():
            lat = float(row["latitude"])
            lon = float(row["longitude"])

            if bbox and not is_within_bbox(lat, lon, bbox):
                continue

            scan = float(row.get("scan", 1.0))
            track = float(row.get("track", 1.0))

            acq_d, acq_t, acq_dt = parse_acq_datetime(row["acq_date"], row["acq_time"])
            satellite = normalize_satellite("MODIS", row.get("satellite", "Terra"))
            confidence = normalize_confidence_modis(row.get("confidence", 0))
            daynight = normalize_daynight(row.get("daynight", "D"))

            # Calculate pixel footprint polygon
            poly, poly_wkt = calculate_pixel_geometry(lat, lon, scan, track)
            pt_wkt = f"SRID=4326;POINT({lon:.6f} {lat:.6f})"
            poly_wkt_srid = f"SRID=4326;{poly_wkt}"

            # Calculate H3 indices if available
            h7, h8, h9 = compute_h3_indices(lat, lon)

            record = {
                "id": uuid.uuid4(),
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "brightness": round(float(row.get("brightness", 0.0)), 2),
                "scan": round(scan, 2),
                "track": round(track, 2),
                "acq_date": acq_d,
                "acq_time": acq_t,
                "acq_datetime": acq_dt,
                "satellite": satellite,
                "instrument": "MODIS",
                "confidence": confidence,
                "version": str(row.get("version", "6.1N")),
                "bright_t31": round(float(row.get("bright_t31", 0.0)), 2) if pd.notna(row.get("bright_t31")) else None,
                "frp": round(float(row.get("frp", 0.0)), 2) if pd.notna(row.get("frp")) else 0.0,
                "daynight": daynight,
                "geom": pt_wkt,
                "pixel_geom": poly_wkt_srid,
                "h3_r7": h7,
                "h3_r8": h8,
                "h3_r9": h9,
                "raw_properties": {
                    "original_satellite": str(row.get("satellite", "")),
                },
                "created_at": datetime.now(timezone.utc),
            }
            records.append(record)

        return records

    def normalize_chunk_viirs(
        self,
        df_chunk: pd.DataFrame,
        bbox: Optional[Tuple[float, float, float, float]] = None,
        apply_cleaning: bool = True,
    ) -> List[Dict[str, Any]]:
        """Normalizes a chunk of VIIRS records."""
        df_chunk.columns = [c.strip().lower() for c in df_chunk.columns]

        if apply_cleaning:
            df_chunk = apply_quality_filters(df_chunk, sensor_type="VIIRS")

        records: List[Dict[str, Any]] = []

        for _, row in df_chunk.iterrows():
            lat = float(row["latitude"])
            lon = float(row["longitude"])

            if bbox and not is_within_bbox(lat, lon, bbox):
                continue

            scan = float(row.get("scan", 0.375))
            track = float(row.get("track", 0.375))

            acq_d, acq_t, acq_dt = parse_acq_datetime(row["acq_date"], row["acq_time"])
            satellite = normalize_satellite("VIIRS", row.get("satellite", "SNPP"))
            confidence = normalize_confidence_viirs(row.get("confidence", "nominal"))
            daynight = normalize_daynight(row.get("daynight", "D"))

            # Calculate pixel footprint polygon
            poly, poly_wkt = calculate_pixel_geometry(lat, lon, scan, track)
            pt_wkt = f"SRID=4326;POINT({lon:.6f} {lat:.6f})"
            poly_wkt_srid = f"SRID=4326;{poly_wkt}"

            # Calculate H3 indices if available
            h7, h8, h9 = compute_h3_indices(lat, lon)

            record = {
                "id": uuid.uuid4(),
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "bright_ti4": round(float(row.get("bright_ti4", 0.0)), 2),
                "bright_ti5": round(float(row.get("bright_ti5", 0.0)), 2) if pd.notna(row.get("bright_ti5")) else None,
                "scan": round(scan, 2),
                "track": round(track, 2),
                "acq_date": acq_d,
                "acq_time": acq_t,
                "acq_datetime": acq_dt,
                "satellite": satellite,
                "instrument": "VIIRS",
                "confidence": confidence,
                "version": str(row.get("version", "2.0N")),
                "frp": round(float(row.get("frp", 0.0)), 2) if pd.notna(row.get("frp")) else 0.0,
                "daynight": daynight,
                "geom": pt_wkt,
                "pixel_geom": poly_wkt_srid,
                "h3_r7": h7,
                "h3_r8": h8,
                "h3_r9": h9,
                "raw_properties": {
                    "original_satellite": str(row.get("satellite", "")),
                },
                "created_at": datetime.now(timezone.utc),
            }
            records.append(record)

        return records

    def load_csv_file(
        self,
        file_path: str,
        sensor_type: Optional[str] = None,
        chunk_size: int = 10000,
        apply_cleaning: bool = True,
        bbox: Optional[Tuple[float, float, float, float]] = None,
    ) -> Dict[str, Any]:
        """Reads, validates, normalizes, and ingests a NASA FIRMS CSV archive file."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"CSV file not found: {file_path}")

        logger.info(f"Starting ingestion of CSV file: {path.name}")
        start_time = datetime.now(timezone.utc)

        # Detect sensor if not provided
        sample = pd.read_csv(file_path, nrows=10)
        sensor = (sensor_type or self.detect_sensor_type(sample, file_path)).upper()
        logger.info(f"Target Sensor Type: {sensor}")

        # Create audit log record if database is available
        log_entry: Optional[IngestionLog] = None
        if self.db:
            log_entry = IngestionLog(
                source_url_or_file=str(path.absolute()),
                sensor=sensor,
                status="running",
                start_time=start_time,
                records_processed=0,
                records_inserted=0,
            )
            self.db.add(log_entry)
            self.db.commit()
            self.db.refresh(log_entry)

        total_read = 0
        total_inserted = 0
        min_date: Optional[date] = None
        max_date: Optional[date] = None
        model_cls = RawModisHotspot if sensor == "MODIS" else RawViirsHotspot

        try:
            for chunk_idx, df_chunk in enumerate(pd.read_csv(file_path, chunksize=chunk_size, low_memory=False)):
                chunk_len = len(df_chunk)
                total_read += chunk_len

                if sensor == "MODIS":
                    records = self.normalize_chunk_modis(df_chunk, bbox=bbox, apply_cleaning=apply_cleaning)
                else:
                    records = self.normalize_chunk_viirs(df_chunk, bbox=bbox, apply_cleaning=apply_cleaning)

                if records:
                    chunk_dates = [r["acq_date"] for r in records]
                    chunk_min_date = min(chunk_dates)
                    chunk_max_date = max(chunk_dates)
                    min_date = chunk_min_date if min_date is None else min(min_date, chunk_min_date)
                    max_date = chunk_max_date if max_date is None else max(max_date, chunk_max_date)

                    if self.db:
                        self.db.bulk_insert_mappings(model_cls, records)
                        self.db.commit()

                    total_inserted += len(records)

                logger.info(f"Processed chunk {chunk_idx + 1} ({chunk_len} rows) -> {len(records)} valid inserted.")

            end_time = datetime.now(timezone.utc)
            duration_sec = (end_time - start_time).total_seconds()

            summary = {
                "source": str(path.name),
                "sensor": sensor,
                "status": "completed",
                "records_processed": total_read,
                "records_inserted": total_inserted,
                "records_filtered_or_out_of_bounds": total_read - total_inserted,
                "batch_date_start": min_date,
                "batch_date_end": max_date,
                "duration_seconds": round(duration_sec, 2),
            }

            if self.db and log_entry:
                log_entry.status = "completed"
                log_entry.records_processed = total_read
                log_entry.records_inserted = total_inserted
                log_entry.batch_date_start = min_date
                log_entry.batch_date_end = max_date
                log_entry.end_time = end_time
                log_entry.execution_metadata = summary
                self.db.commit()

            logger.info(f"Ingestion finished successfully: {summary}")
            return summary

        except Exception as exc:
            logger.error(f"Ingestion failed: {exc}", exc_info=True)
            if self.db and log_entry:
                log_entry.status = "failed"
                log_entry.error_message = str(exc)
                log_entry.end_time = datetime.now(timezone.utc)
                self.db.commit()
            raise exc
