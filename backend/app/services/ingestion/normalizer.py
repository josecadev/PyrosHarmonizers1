"""Data Normalization and Spatial Geometry Construction for NASA FIRMS Data.

Provides functions to normalize dates, times, satellites, confidence categories,
and construct exact PostGIS Point and Pixel Footprint Polygons (along-scan x along-track).
"""

import math
from datetime import datetime, date, timezone
from typing import Optional, Tuple, Dict, Any
from shapely.geometry import Point, Polygon

# Optional H3 support
try:
    import h3
    H3_AVAILABLE = True
except ImportError:
    h3 = None
    H3_AVAILABLE = False


def normalize_acq_time(time_val: Any) -> str:
    """Normalizes acquisition time to a 4-digit HHMM string."""
    if time_val is None:
        return "0000"
    s = str(time_val).strip()
    # Remove decimal points if parsed as float (e.g. 130.0 -> 130)
    if "." in s:
        s = s.split(".")[0]
    return s.zfill(4)


def parse_acq_datetime(acq_date_val: Any, acq_time_val: Any) -> Tuple[date, str, datetime]:
    """Combines acq_date and acq_time into a date object, 4-digit time string, and UTC datetime."""
    # Parse date
    if isinstance(acq_date_val, date) and not isinstance(acq_date_val, datetime):
        d = acq_date_val
    elif isinstance(acq_date_val, datetime):
        d = acq_date_val.date()
    else:
        date_str = str(acq_date_val).strip()
        # Handle formats: YYYY-MM-DD or YYYY/MM/DD
        date_str = date_str.replace("/", "-")
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()

    # Parse time
    time_str = normalize_acq_time(acq_time_val)
    try:
        hour = int(time_str[:2])
        minute = int(time_str[2:4])
        # Validate range
        hour = max(0, min(hour, 23))
        minute = max(0, min(minute, 59))
    except (ValueError, IndexError):
        hour = 0
        minute = 0
        time_str = "0000"

    dt_utc = datetime(d.year, d.month, d.day, hour, minute, tzinfo=timezone.utc)
    return d, time_str, dt_utc


def calculate_pixel_geometry(
    latitude: float,
    longitude: float,
    scan: float,
    track: float,
) -> Tuple[Polygon, str]:
    """Computes the spatial pixel footprint polygon from scan and track dimensions.
    
    scan: along-scan resolution in km.
    track: along-track resolution in km.
    Returns: (shapely.geometry.Polygon, WKT string)
    """
    # 1 degree of latitude is approximately 111.32 km
    delta_lat = (track / 2.0) / 111.32

    # 1 degree of longitude depends on latitude: 111.32 * cos(lat)
    cos_lat = math.cos(math.radians(latitude))
    effective_cos = max(abs(cos_lat), 0.001)
    delta_lon = (scan / 2.0) / (111.32 * effective_cos)

    min_x = longitude - delta_lon
    max_x = longitude + delta_lon
    min_y = latitude - delta_lat
    max_y = latitude + delta_lat

    # Counter-clockwise closed ring
    coords = [
        (round(min_x, 6), round(min_y, 6)),
        (round(max_x, 6), round(min_y, 6)),
        (round(max_x, 6), round(max_y, 6)),
        (round(min_x, 6), round(max_y, 6)),
        (round(min_x, 6), round(min_y, 6)),
    ]

    poly = Polygon(coords)
    wkt = poly.wkt
    return poly, wkt


def normalize_satellite(sensor: str, sat_raw: Any) -> str:
    """Maps raw satellite identifiers to standardized enum values.
    
    MODIS: Terra, Aqua
    VIIRS: SNPP, NOAA20, NOAA21
    """
    s = str(sat_raw).strip().upper()
    sensor_upper = sensor.strip().upper()

    if sensor_upper == "MODIS":
        if s in ("T", "TERRA", "1"):
            return "Terra"
        elif s in ("A", "AQUA", "2"):
            return "Aqua"
        return "Terra" if "TERRA" in s else ("Aqua" if "AQUA" in s else "Terra")

    elif sensor_upper == "VIIRS":
        if s in ("N", "NPP", "SNPP", "SUOMI-NPP", "SUOMI NPP"):
            return "SNPP"
        elif s in ("1", "J1", "NOAA-20", "NOAA20", "JPSS-1", "JPSS1"):
            return "NOAA20"
        elif s in ("2", "J2", "NOAA-21", "NOAA21", "JPSS-2", "JPSS2"):
            return "NOAA21"
        if "20" in s or "J1" in s:
            return "NOAA20"
        if "21" in s or "J2" in s:
            return "NOAA21"
        return "SNPP"

    return "Terra" if sensor_upper == "MODIS" else "SNPP"


def normalize_confidence_viirs(conf_val: Any) -> str:
    """Normalizes VIIRS categorical confidence to 'low', 'nominal', or 'high'."""
    s = str(conf_val).strip().lower()
    if s in ("l", "low"):
        return "low"
    elif s in ("h", "high"):
        return "high"
    elif s in ("n", "nominal", "med", "medium"):
        return "nominal"
    return "nominal"


def normalize_confidence_modis(conf_val: Any) -> int:
    """Normalizes MODIS numerical confidence to an integer 0..100."""
    try:
        val = int(float(conf_val))
        return max(0, min(100, val))
    except (ValueError, TypeError):
        return 0


def normalize_daynight(val: Any) -> str:
    """Normalizes day/night indicator to 'D' or 'N'."""
    s = str(val).strip().upper()
    return "N" if s.startswith("N") else "D"


def compute_h3_indices(latitude: float, longitude: float) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Calculates Uber H3 index at resolutions 7, 8, and 9 if library is available."""
    if not H3_AVAILABLE:
        return None, None, None

    try:
        # Check API version of h3 (v3 vs v4)
        if hasattr(h3, "latlng_to_cell"):
            h7 = h3.latlng_to_cell(latitude, longitude, 7)
            h8 = h3.latlng_to_cell(latitude, longitude, 8)
            h9 = h3.latlng_to_cell(latitude, longitude, 9)
        elif hasattr(h3, "geo_to_h3"):
            h7 = h3.geo_to_h3(latitude, longitude, 7)
            h8 = h3.geo_to_h3(latitude, longitude, 8)
            h9 = h3.geo_to_h3(latitude, longitude, 9)
        else:
            return None, None, None
        return str(h7), str(h8), str(h9)
    except Exception:
        return None, None, None


def is_within_bbox(
    latitude: float,
    longitude: float,
    bbox: Tuple[float, float, float, float]
) -> bool:
    """Checks whether point (latitude, longitude) is within (min_lon, min_lat, max_lon, max_lat)."""
    min_lon, min_lat, max_lon, max_lat = bbox
    return (min_lon <= longitude <= max_lon) and (min_lat <= latitude <= max_lat)
