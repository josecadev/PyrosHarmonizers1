"""Uber H3 Spatial Hexagonal Grid Discretization & Aggregation Engine.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.

Provides discrete global grid indexing at:
- Resolution 7: ~5.16 km² cell area (regional synoptic assessment).
- Resolution 8: ~0.73 km² cell area (comparable to nominal MODIS 1km footprint).

Neutralizes sensor resolution bias by converting point counts into binary active cells
and standardized energy density per square kilometer.
"""

import math
import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import date, datetime
from shapely.geometry import Polygon

try:
    import h3
    # Check for h3-py v4 vs v3 API compatibility
    if hasattr(h3, "latlng_to_cell"):
        _lat_lng_to_cell = h3.latlng_to_cell
        _cell_to_boundary = h3.cell_to_boundary
        _cell_area = lambda c, unit="km^2": h3.cell_area(c, unit=unit)
    else:
        _lat_lng_to_cell = h3.geo_to_h3
        _cell_to_boundary = h3.h3_to_geo_boundary
        _cell_area = lambda c, unit="km^2": h3.cell_area(c, unit=unit) if hasattr(h3, "cell_area") else 0.73
    H3_AVAILABLE = True
except ImportError:
    H3_AVAILABLE = False
    logger.warning("h3 library not found. Falling back to deterministic pseudo-hex algorithm.")

logger = logging.getLogger(__name__)

# Approximate cell areas in km²
H3_RES_7_AREA_KM2 = 5.161293
H3_RES_8_AREA_KM2 = 0.737328


def latlng_to_h3_index(latitude: float, longitude: float, resolution: int = 8) -> str:
    """Computes the H3 hexagonal cell index string for a given coordinate."""
    res_clamped = min(15, max(0, int(resolution)))
    if H3_AVAILABLE:
        try:
            return _lat_lng_to_cell(float(latitude), float(longitude), res_clamped)
        except Exception as exc:
            logger.debug(f"H3 calculation error: {exc}")

    # Deterministic fallback consistent with PostGIS SQL function fallback
    lat_q = int(math.floor((latitude + 90.0) * 100000.0))
    lng_q = int(math.floor((longitude + 180.0) * 100000.0))
    hex_str = f"8{res_clamped:x}{lat_q % 16777215:06x}{lng_q % 16777215:06x}"
    return hex_str[:15]


def h3_cell_to_polygon(h3_index: str) -> Optional[Polygon]:
    """Generates the Shapely Polygon boundary for an H3 cell index."""
    if not H3_AVAILABLE:
        return None
    try:
        boundary = _cell_to_boundary(h3_index)
        # Boundary coords are [(lat, lng), ...] or [(lng, lat)]
        # Shapely expects [(lng, lat), ...]
        coords = [(pt[1], pt[0]) for pt in boundary]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        return Polygon(coords)
    except Exception as exc:
        logger.debug(f"Error computing H3 polygon boundary for {h3_index}: {exc}")
        return None


def h3_cell_to_geojson_geometry(h3_index: str) -> Optional[Dict[str, Any]]:
    """Returns a GeoJSON Polygon geometry dictionary for an H3 cell."""
    poly = h3_cell_to_polygon(h3_index)
    if poly is None:
        return None
    coords = list(poly.exterior.coords)
    return {
        "type": "Polygon",
        "coordinates": [coords],
    }


class H3GridProcessor:
    """Processes satellite hotspots onto H3 hexagonal grids and performs spatial aggregations."""

    def __init__(self, resolution: int = 8):
        self.resolution = int(resolution)
        self.cell_area_km2 = H3_RES_7_AREA_KM2 if self.resolution == 7 else H3_RES_8_AREA_KM2

    def assign_h3_index(
        self,
        df: pd.DataFrame,
        lat_col: str = "latitude",
        lon_col: str = "longitude",
        out_col: str = "h3_index",
    ) -> pd.DataFrame:
        """Adds an H3 cell index column to a DataFrame of hotspot records."""
        result = df.copy()
        result[out_col] = [
            latlng_to_h3_index(lat, lon, self.resolution)
            for lat, lon in zip(result[lat_col], result[lon_col])
        ]
        return result

    def aggregate_daily_grid(
        self,
        df: pd.DataFrame,
        date_col: str = "acq_date",
        h3_col: str = "h3_index",
        frp_col: str = "frp",
    ) -> pd.DataFrame:
        """Aggregates raw hotspot detections by day and H3 cell.
        
        Outputs:
            - presence_binary: 1 if active on that day (neutralizes VIIRS point count surge).
            - raw_points_count: total detections.
            - modis_count & viirs_count.
            - total_frp: sum of FRP in cell.
            - frp_density_mw_km2: total_frp / cell_area_km2.
        """
        if df.empty:
            return pd.DataFrame()

        data = df.copy()
        if h3_col not in data.columns:
            data = self.assign_h3_index(data, out_col=h3_col)

        # Standardize date column
        if date_col in data.columns:
            data["agg_date"] = pd.to_datetime(data[date_col]).dt.date
        else:
            data["agg_date"] = date.today()

        # Classify sensor
        sats = data.get("satellite", "").astype(str).str.upper()
        data["is_modis"] = sats.apply(lambda s: any(x in s for x in ["TERRA", "AQUA", "MODIS"]))
        data["is_viirs"] = sats.apply(lambda s: any(x in s for x in ["SUOMI", "NPP", "NOAA", "VIIRS", "J1", "J2"]))
        data["clean_frp"] = pd.to_numeric(data.get(frp_col, 0.0), errors="coerce").fillna(0.0)

        grouped = data.groupby(["agg_date", h3_col]).agg(
            raw_points_count=(h3_col, "count"),
            modis_count=("is_modis", "sum"),
            viirs_count=("is_viirs", "sum"),
            total_frp=("clean_frp", "sum"),
            max_frp=("clean_frp", "max"),
        ).reset_index()

        # Binary presence is 1 for every active cell
        grouped["presence_binary"] = 1
        # Energy density per km²
        grouped["frp_density_mw_km2"] = (grouped["total_frp"] / self.cell_area_km2).round(3)

        return grouped

    def export_geojson_features(self, aggregated_df: pd.DataFrame) -> Dict[str, Any]:
        """Converts aggregated H3 cells into a GeoJSON FeatureCollection."""
        features = []
        for _, row in aggregated_df.iterrows():
            idx = row["h3_index"]
            geom = h3_cell_to_geojson_geometry(idx)
            if geom is None:
                continue

            properties = {
                "h3_index": idx,
                "date": str(row.get("agg_date", "")),
                "active": int(row.get("presence_binary", 1)),
                "raw_points": int(row.get("raw_points_count", 0)),
                "modis_count": int(row.get("modis_count", 0)),
                "viirs_count": int(row.get("viirs_count", 0)),
                "total_frp": float(row.get("total_frp", 0.0)),
                "frp_density": float(row.get("frp_density_mw_km2", 0.0)),
            }
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": properties,
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }
