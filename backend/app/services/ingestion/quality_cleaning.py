"""Data Quality Cleaning and Static Thermal Anomaly Detection Module.

Implements DEV 1 ticket #1.4 requirements:
1. Spurious detection filtering (MODIS confidence < 30, VIIRS confidence == 'low').
2. Detection and tagging of static thermal anomalies (>300 days/year recurrence, e.g. gas flaring).
3. Pre-harmonization cleaning pipeline for DEV 2 algorithm ingestion.
"""

import logging
from typing import Optional, Set, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


def apply_quality_filters(
    df: pd.DataFrame,
    sensor_type: str,
    min_modis_confidence: int = 30,
) -> pd.DataFrame:
    """Applies quality filters to exclude spurious satellite thermal detections.
    
    Rules:
    - MODIS: Exclude confidence < 30 (filters low-confidence / false alarms).
    - VIIRS: Exclude confidence == 'low' (nominal and high are preserved).
    - Remove invalid coordinates (lat outside [-90, 90], lon outside [-180, 180]).
    - Ensure FRP >= 0.0.
    """
    if df.empty:
        return df.copy()

    df_clean = df.copy()

    # 1. Coordinate Validity Check
    if "latitude" in df_clean.columns and "longitude" in df_clean.columns:
        valid_coords = (
            df_clean["latitude"].notna()
            & df_clean["longitude"].notna()
            & (df_clean["latitude"] >= -90.0)
            & (df_clean["latitude"] <= 90.0)
            & (df_clean["longitude"] >= -180.0)
            & (df_clean["longitude"] <= 180.0)
        )
        df_clean = df_clean[valid_coords]

    # 2. FRP non-negative check
    if "frp" in df_clean.columns:
        df_clean["frp"] = pd.to_numeric(df_clean["frp"], errors="coerce").fillna(0.0)
        df_clean = df_clean[df_clean["frp"] >= 0.0]

    sensor_upper = sensor_type.strip().upper()

    # 3. Sensor-specific confidence filtering
    if sensor_upper == "MODIS":
        if "confidence" in df_clean.columns:
            # Convert confidence to numeric integer
            numeric_conf = pd.to_numeric(df_clean["confidence"], errors="coerce").fillna(0)
            df_clean["confidence"] = numeric_conf.astype(int)
            # Filter confidence < 30
            df_clean = df_clean[df_clean["confidence"] >= min_modis_confidence]

    elif sensor_upper == "VIIRS":
        if "confidence" in df_clean.columns:
            # Normalize confidence strings to lowercase
            conf_series = df_clean["confidence"].astype(str).str.strip().str.lower()
            # Map shorthand 'l', 'n', 'h'
            conf_norm = conf_series.replace({
                "l": "low",
                "n": "nominal",
                "h": "high",
                "med": "nominal",
                "medium": "nominal",
            })
            df_clean["confidence"] = conf_norm
            # Exclude 'low'
            df_clean = df_clean[df_clean["confidence"].isin(["nominal", "high"])]

    return df_clean


def detect_static_anomalies(
    df: pd.DataFrame,
    recurrence_days_threshold: int = 300,
    spatial_precision: int = 3,
) -> pd.DataFrame:
    """Identifies static thermal anomalies (e.g. gas flaring stacks, industrial furnaces, volcanic vents).
    
    Any spatial coordinate cluster exhibiting active hotspots on > recurrence_days_threshold
    unique days in a calendar year is tagged with is_static_anomaly = True.
    
    spatial_precision: Decimal places for spatial binning (3 decimals ~ 110m resolution).
    """
    if df.empty:
        df_result = df.copy()
        df_result["is_static_anomaly"] = False
        return df_result

    df_out = df.copy()

    # Ensure acq_date is formatted as date
    if not pd.api.types.is_datetime64_any_dtype(df_out["acq_date"]):
        df_out["acq_date"] = pd.to_datetime(df_out["acq_date"], errors="coerce")

    # Extract calendar year for grouping
    df_out["_year"] = df_out["acq_date"].dt.year.fillna(0).astype(int)

    # Spatial binning key
    df_out["_lat_bin"] = df_out["latitude"].round(spatial_precision)
    df_out["_lon_bin"] = df_out["longitude"].round(spatial_precision)

    # Count distinct active days per spatial cell per year
    active_days_per_cell = (
        df_out.groupby(["_year", "_lat_bin", "_lon_bin"])["acq_date"]
        .nunique()
        .reset_index(name="_active_days_count")
    )

    # Identify cells meeting or exceeding the recurrence threshold
    static_cells = active_days_per_cell[
        active_days_per_cell["_active_days_count"] >= recurrence_days_threshold
    ]

    static_set: Set[Tuple[int, float, float]] = set(
        zip(static_cells["_year"], static_cells["_lat_bin"], static_cells["_lon_bin"])
    )

    # Assign is_static_anomaly flag
    df_out["is_static_anomaly"] = [
        (yr, lat, lon) in static_set
        for yr, lat, lon in zip(df_out["_year"], df_out["_lat_bin"], df_out["_lon_bin"])
    ]

    # Clean temporary helper columns
    df_out = df_out.drop(columns=["_year", "_lat_bin", "_lon_bin"])

    static_count = df_out["is_static_anomaly"].sum()
    if static_count > 0:
        logger.info(
            f"Detected {static_count} hotspot points belonging to static thermal anomalies "
            f"(threshold: >= {recurrence_days_threshold} days/year)."
        )

    return df_out


def clean_for_harmonization(
    df: pd.DataFrame,
    sensor_type: str,
    exclude_static_anomalies: bool = True,
    min_modis_confidence: int = 30,
    recurrence_days_threshold: int = 300,
) -> pd.DataFrame:
    """Full preparation pipeline: cleans thermal noise and removes/tags static anomalies."""
    df_filtered = apply_quality_filters(
        df=df,
        sensor_type=sensor_type,
        min_modis_confidence=min_modis_confidence,
    )

    df_tagged = detect_static_anomalies(
        df=df_filtered,
        recurrence_days_threshold=recurrence_days_threshold,
    )

    if exclude_static_anomalies:
        return df_tagged[~df_tagged["is_static_anomaly"]].copy()

    return df_tagged
