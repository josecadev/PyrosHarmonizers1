"""Polygon Fusion & Multi-Sensor Event Synthesis Module.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.

Consolidates clustered detections into unified wildfire events using Convex Hull and 
Pixel Footprint geometry unions. Produces unified spatial footprints and harmonized metadata.
"""

import math
import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
from shapely.geometry import Point, Polygon, MultiPolygon
from shapely.ops import unary_union

from app.services.harmonization.pixel_geometry import (
    create_pixel_footprint,
    calculate_pixel_area,
)

logger = logging.getLogger(__name__)


def compute_geodesic_polygon_area_km2(poly: Polygon) -> float:
    """Calculates approximate ground surface area in km² for a WGS84 polygon.
    
    Transforms polygon vertices into equal-area projection or computes spherical polygon area.
    """
    if poly.is_empty:
        return 0.0
    
    # Fast regional planar approximation at polygon centroid latitude
    centroid = poly.centroid
    lat_deg = centroid.y
    cos_lat = math.cos(math.radians(lat_deg))
    
    # 1 deg lat = 111.32 km, 1 deg lon = 111.32 * cos(lat) km
    # Scale factor from deg² to km²
    km2_per_deg2 = (111.32 ** 2) * max(abs(cos_lat), 0.001)
    return float(poly.area * km2_per_deg2)


class HarmonizedEvent:
    """Represents a unified harmonized wildfire event synthesized across satellite platforms."""

    def __init__(
        self,
        event_id: int,
        centroid: Point,
        hull_polygon: Polygon,
        area_km2: float,
        start_time: datetime,
        end_time: datetime,
        point_count: int,
        modis_count: int,
        viirs_count: int,
        event_type: str,
        raw_frp_sum: float,
        raw_modis_frp_sum: float,
        raw_viirs_frp_sum: float,
        mean_brightness: float,
        max_brightness: float,
        day_count: int,
        night_count: int,
    ):
        self.event_id = event_id
        self.centroid = centroid
        self.hull_polygon = hull_polygon
        self.area_km2 = area_km2
        self.start_time = start_time
        self.end_time = end_time
        self.point_count = point_count
        self.modis_count = modis_count
        self.viirs_count = viirs_count
        self.event_type = event_type
        self.raw_frp_sum = raw_frp_sum
        self.raw_modis_frp_sum = raw_modis_frp_sum
        self.raw_viirs_frp_sum = raw_viirs_frp_sum
        self.mean_brightness = mean_brightness
        self.max_brightness = max_brightness
        self.day_count = day_count
        self.night_count = night_count

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "latitude": round(self.centroid.y, 6),
            "longitude": round(self.centroid.x, 6),
            "area_km2": round(self.area_km2, 4),
            "start_time": self.start_time.isoformat() if hasattr(self.start_time, "isoformat") else str(self.start_time),
            "end_time": self.end_time.isoformat() if hasattr(self.end_time, "isoformat") else str(self.end_time),
            "point_count": self.point_count,
            "modis_count": self.modis_count,
            "viirs_count": self.viirs_count,
            "event_type": self.event_type,
            "raw_frp_sum": round(self.raw_frp_sum, 2),
            "raw_modis_frp_sum": round(self.raw_modis_frp_sum, 2),
            "raw_viirs_frp_sum": round(self.raw_viirs_frp_sum, 2),
            "mean_brightness": round(self.mean_brightness, 2),
            "max_brightness": round(self.max_brightness, 2),
            "day_count": self.day_count,
            "night_count": self.night_count,
            "polygon_wkt": self.hull_polygon.wkt,
        }


def fuse_cluster_hotspots(
    cluster_df: pd.DataFrame,
    cluster_id: int,
) -> HarmonizedEvent:
    """Fuses a group of hotspot points belonging to one ST-DBSCAN cluster into one unified event."""
    n_points = len(cluster_df)
    
    # Classify sensor composition
    satellites = cluster_df["satellite"].str.upper().tolist() if "satellite" in cluster_df.columns else []
    modis_mask = [any(s in sat for s in ["TERRA", "AQUA", "MODIS"]) for sat in satellites]
    viirs_mask = [any(s in sat for s in ["SUOMI", "NPP", "NOAA", "VIIRS", "J1", "J2"]) for sat in satellites]
    
    modis_count = sum(modis_mask)
    viirs_count = sum(viirs_mask)

    if modis_count > 0 and viirs_count > 0:
        event_type = "MIXED"
    elif modis_count > 0:
        event_type = "MODIS_ONLY"
    else:
        event_type = "VIIRS_ONLY"

    # Datetimes
    time_series = pd.to_datetime(cluster_df["acq_datetime"])
    start_time = time_series.min()
    end_time = time_series.max()

    # FRP and thermal statistics
    if "frp" in cluster_df.columns:
        frp_vals = pd.to_numeric(cluster_df["frp"], errors="coerce").fillna(0.0)
    else:
        frp_vals = pd.Series([0.0] * n_points)
    raw_frp_sum = float(frp_vals.sum())

    modis_frp = float(frp_vals[modis_mask].sum()) if modis_count > 0 else 0.0
    viirs_frp = float(frp_vals[viirs_mask].sum()) if viirs_count > 0 else 0.0

    bright_col = "brightness" if "brightness" in cluster_df.columns else "bright_ti4"
    if bright_col in cluster_df.columns:
        bright_vals = pd.to_numeric(cluster_df[bright_col], errors="coerce").fillna(300.0)
    else:
        bright_vals = pd.Series([300.0] * n_points)
    mean_brightness = float(bright_vals.mean())
    max_brightness = float(bright_vals.max())

    # Day/Night statistics
    if "daynight" in cluster_df.columns:
        daynight_series = cluster_df["daynight"].astype(str).str.upper()
    else:
        daynight_series = pd.Series(["D"] * n_points)
    day_count = int((daynight_series == "D").sum())
    night_count = int((daynight_series == "N").sum())

    # Geometry synthesis
    pixel_polys: List[Polygon] = []
    for _, row in cluster_df.iterrows():
        lat = float(row["latitude"])
        lon = float(row["longitude"])
        scan = float(row.get("scan", 1.0 if "MODIS" in row.get("satellite", "") else 0.375))
        track = float(row.get("track", 1.0 if "MODIS" in row.get("satellite", "") else 0.375))
        pixel_polys.append(create_pixel_footprint(lat, lon, scan, track))

    if n_points == 1:
        fused_polygon = pixel_polys[0]
        area_km2 = calculate_pixel_area(
            float(cluster_df.iloc[0].get("scan", 1.0)),
            float(cluster_df.iloc[0].get("track", 1.0))
        )
    else:
        # Union all pixel polygons, take convex hull to form smoothed bounding fire envelope
        unified = unary_union(pixel_polys)
        fused_polygon = unified.convex_hull
        area_km2 = compute_geodesic_polygon_area_km2(fused_polygon)

    centroid = fused_polygon.centroid

    return HarmonizedEvent(
        event_id=cluster_id,
        centroid=centroid,
        hull_polygon=fused_polygon,
        area_km2=area_km2,
        start_time=start_time,
        end_time=end_time,
        point_count=n_points,
        modis_count=modis_count,
        viirs_count=viirs_count,
        event_type=event_type,
        raw_frp_sum=raw_frp_sum,
        raw_modis_frp_sum=modis_frp,
        raw_viirs_frp_sum=viirs_frp,
        mean_brightness=mean_brightness,
        max_brightness=max_brightness,
        day_count=day_count,
        night_count=night_count,
    )


class PolygonFusionEngine:
    """Orchestrates the fusion of clustered detections into harmonized wildfire events."""

    @classmethod
    def fuse_events(
        cls,
        df: pd.DataFrame,
        cluster_col: str = "cluster_id",
    ) -> List[HarmonizedEvent]:
        """Fuses all clusters in the DataFrame into HarmonizedEvent instances."""
        if df.empty or cluster_col not in df.columns:
            return []

        events: List[HarmonizedEvent] = []
        valid_df = df[df[cluster_col] >= 0]

        for cid, group in valid_df.groupby(cluster_col):
            event = fuse_cluster_hotspots(group, int(cid))
            events.append(event)

        logger.info(f"Polygon Fusion: synthesised {len(events)} harmonized events from {len(valid_df)} points")
        return events
