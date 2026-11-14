"""Unit tests for Pixel Geometry Reconstruction and Sensor Footprint Calculation.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.
"""

import math
import pytest
from shapely.geometry import Polygon

from app.services.harmonization.pixel_geometry import (
    create_pixel_footprint,
    calculate_pixel_area,
    calculate_zenith_angle,
    calculate_frp_density,
    get_footprint_geojson,
    MODIS_ALTITUDE_KM,
    VIIRS_ALTITUDE_KM,
)


def test_calculate_pixel_area_nadir_modis():
    """Nadir MODIS pixel footprint is nominal 1.0 km x 1.0 km = 1.0 km²."""
    area = calculate_pixel_area(scan=1.0, track=1.0)
    assert pytest.approx(area, rel=1e-3) == 1.0


def test_calculate_pixel_area_edge_modis():
    """At scan edge, MODIS optical deformation increases footprint to ~2.0 x 4.8 km."""
    area_nadir = calculate_pixel_area(scan=1.0, track=1.0)
    area_edge = calculate_pixel_area(scan=4.8, track=2.0)
    assert area_edge > area_nadir
    assert pytest.approx(area_edge, rel=1e-3) == 9.6
    assert area_edge / area_nadir > 9.0


def test_calculate_pixel_area_viirs():
    """VIIRS nadir nominal footprint is 375m x 375m (0.375 x 0.375 km ~ 0.14 km²)."""
    area = calculate_pixel_area(scan=0.375, track=0.375)
    assert pytest.approx(area, rel=1e-2) == 0.1406


def test_create_pixel_footprint_polygon():
    """Verify polygon geometry validity, bounding box, and closure."""
    lat, lon = -16.35, -60.98  # Chiquitania, Bolivia
    poly = create_pixel_footprint(latitude=lat, longitude=lon, scan=1.0, track=1.0)

    assert isinstance(poly, Polygon)
    assert poly.is_valid
    assert not poly.is_empty
    # Centroid should be very close to original coordinate
    assert pytest.approx(poly.centroid.y, abs=1e-3) == lat
    assert pytest.approx(poly.centroid.x, abs=1e-3) == lon

    # Bounds check
    minx, miny, maxx, maxy = poly.bounds
    assert minx < lon < maxx
    assert miny < lat < maxy


def test_create_pixel_footprint_invalid_bounds():
    """Should raise ValueError on invalid latitude or longitude or negative dimensions."""
    with pytest.raises(ValueError):
        create_pixel_footprint(latitude=95.0, longitude=-60.0, scan=1.0, track=1.0)
    with pytest.raises(ValueError):
        create_pixel_footprint(latitude=-16.0, longitude=-200.0, scan=1.0, track=1.0)
    with pytest.raises(ValueError):
        create_pixel_footprint(latitude=-16.0, longitude=-60.0, scan=-1.0, track=1.0)


def test_calculate_zenith_angle():
    """Computes Earth view zenith angle across scan angles."""
    # At nadir (scan angle = 0), zenith angle = 0
    assert calculate_zenith_angle(0.0, altitude_km=MODIS_ALTITUDE_KM) == 0.0

    # At 55 degrees scan angle, view zenith angle is significantly larger (>65 deg) due to Earth curvature
    zenith = calculate_zenith_angle(55.0, altitude_km=MODIS_ALTITUDE_KM)
    assert zenith > 55.0


def test_calculate_frp_density():
    """FRP density normalizes energy emission by real footprint area."""
    # MODIS nadir: 10 MW over 1.0 km² -> 10 MW/km²
    density_nadir = calculate_frp_density(frp=10.0, scan=1.0, track=1.0)
    assert pytest.approx(density_nadir, rel=1e-3) == 10.0

    # MODIS edge: 10 MW over 9.6 km² -> ~1.04 MW/km²
    density_edge = calculate_frp_density(frp=10.0, scan=4.8, track=2.0)
    assert density_edge < density_nadir
    assert pytest.approx(density_edge, rel=1e-2) == 1.04


def test_get_footprint_geojson():
    """Validates GeoJSON dictionary mapping."""
    geojson = get_footprint_geojson(-17.8, -63.2, 0.375, 0.375)
    assert geojson["type"] == "Polygon"
    assert len(geojson["coordinates"][0]) == 5
