"""Unit Tests for Normalization and Geometry Calculations.
"""

import pytest
from datetime import date, datetime, timezone
from app.services.ingestion.normalizer import (
    parse_acq_datetime,
    normalize_acq_time,
    calculate_pixel_geometry,
    normalize_satellite,
    normalize_confidence_modis,
    normalize_confidence_viirs,
    normalize_daynight,
    is_within_bbox,
)


def test_normalize_acq_time():
    assert normalize_acq_time("130") == "0130"
    assert normalize_acq_time(130) == "0130"
    assert normalize_acq_time("1435") == "1435"
    assert normalize_acq_time("0") == "0000"
    assert normalize_acq_time(None) == "0000"


def test_parse_acq_datetime():
    d, t_str, dt_utc = parse_acq_datetime("2024-08-15", "1435")
    assert d == date(2024, 8, 15)
    assert t_str == "1435"
    assert dt_utc == datetime(2024, 8, 15, 14, 35, tzinfo=timezone.utc)

    d2, t_str2, dt_utc2 = parse_acq_datetime(date(2023, 10, 5), 320)
    assert d2 == date(2023, 10, 5)
    assert t_str2 == "0320"
    assert dt_utc2 == datetime(2023, 10, 5, 3, 20, tzinfo=timezone.utc)


def test_calculate_pixel_geometry():
    lat = -16.5
    lon = -60.5
    scan = 1.0   # 1 km along-scan
    track = 1.0  # 1 km along-track

    poly, wkt = calculate_pixel_geometry(lat, lon, scan, track)

    assert poly.is_valid
    assert poly.geom_type == "Polygon"
    assert "POLYGON" in wkt

    # Centroid should be very close to the center point
    assert abs(poly.centroid.x - lon) < 1e-4
    assert abs(poly.centroid.y - lat) < 1e-4

    # Area in degrees squared should be positive
    assert poly.area > 0


def test_normalize_satellite():
    # MODIS
    assert normalize_satellite("MODIS", "T") == "Terra"
    assert normalize_satellite("MODIS", "Terra") == "Terra"
    assert normalize_satellite("MODIS", "A") == "Aqua"
    assert normalize_satellite("MODIS", "Aqua") == "Aqua"

    # VIIRS
    assert normalize_satellite("VIIRS", "N") == "SNPP"
    assert normalize_satellite("VIIRS", "SNPP") == "SNPP"
    assert normalize_satellite("VIIRS", "1") == "NOAA20"
    assert normalize_satellite("VIIRS", "NOAA-20") == "NOAA20"
    assert normalize_satellite("VIIRS", "2") == "NOAA21"
    assert normalize_satellite("VIIRS", "NOAA-21") == "NOAA21"


def test_normalize_confidence():
    # MODIS
    assert normalize_confidence_modis(85) == 85
    assert normalize_confidence_modis("95") == 95
    assert normalize_confidence_modis(-5) == 0
    assert normalize_confidence_modis(150) == 100

    # VIIRS
    assert normalize_confidence_viirs("l") == "low"
    assert normalize_confidence_viirs("low") == "low"
    assert normalize_confidence_viirs("n") == "nominal"
    assert normalize_confidence_viirs("nominal") == "nominal"
    assert normalize_confidence_viirs("h") == "high"
    assert normalize_confidence_viirs("high") == "high"


def test_normalize_daynight():
    assert normalize_daynight("D") == "D"
    assert normalize_daynight("day") == "D"
    assert normalize_daynight("N") == "N"
    assert normalize_daynight("night") == "N"


def test_is_within_bbox():
    # Chiquitania bbox: min_lon=-64.5, min_lat=-20.5, max_lon=-57.5, max_lat=-13.5
    chiquitania = (-64.5, -20.5, -57.5, -13.5)

    # Point in San Ignacio de Velasco (-16.37, -60.96)
    assert is_within_bbox(-16.37, -60.96, chiquitania) == True

    # Point in La Paz (-16.50, -68.15) -> outside Chiquitania (more to the west)
    assert is_within_bbox(-16.50, -68.15, chiquitania) == False
