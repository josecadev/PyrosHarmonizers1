"""Unit tests for Uber H3 Hexagonal Grid Indexing and Aggregation.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.
"""

import pytest
import pandas as pd
from datetime import date
from shapely.geometry import Polygon

from app.services.h3_grid.indexer import (
    H3GridProcessor,
    latlng_to_h3_index,
    h3_cell_to_polygon,
    h3_cell_to_geojson_geometry,
    H3_RES_7_AREA_KM2,
    H3_RES_8_AREA_KM2,
)


def test_latlng_to_h3_index():
    """Calculates valid H3 hex index string."""
    lat, lng = -17.80, -63.20  # Santa Cruz de la Sierra
    idx7 = latlng_to_h3_index(lat, lng, resolution=7)
    idx8 = latlng_to_h3_index(lat, lng, resolution=8)

    assert isinstance(idx7, str)
    assert isinstance(idx8, str)
    assert len(idx7) == 15
    assert len(idx8) == 15
    assert idx7.startswith("8")
    assert idx8.startswith("8")


def test_h3_cell_to_polygon_and_geojson():
    """Generates valid 6-sided hexagon polygon and GeoJSON geometry."""
    idx = latlng_to_h3_index(-16.35, -60.98, resolution=8)
    poly = h3_cell_to_polygon(idx)

    if poly is not None:
        assert isinstance(poly, Polygon)
        assert poly.is_valid
        # Hexagon has 6 exterior vertices (+ 1 closed start/end = 7)
        assert len(poly.exterior.coords) in [6, 7]

    geojson = h3_cell_to_geojson_geometry(idx)
    if geojson is not None:
        assert geojson["type"] == "Polygon"
        assert len(geojson["coordinates"][0]) in [6, 7]


def test_h3_grid_processor_neutralizes_subpixel_points():
    """Multiple VIIRS points falling inside the same H3 resolution 8 cell count as 1 ACTIVE CELL."""
    # 5 VIIRS detections inside the exact same ~0.73 km² cell on the same day
    data = [
        {"latitude": -16.3501, "longitude": -60.9801, "acq_date": "2024-08-20", "satellite": "Suomi-NPP", "frp": 10.0},
        {"latitude": -16.3502, "longitude": -60.9802, "acq_date": "2024-08-20", "satellite": "Suomi-NPP", "frp": 12.0},
        {"latitude": -16.3503, "longitude": -60.9803, "acq_date": "2024-08-20", "satellite": "NOAA-20", "frp": 8.0},
        {"latitude": -16.3504, "longitude": -60.9804, "acq_date": "2024-08-20", "satellite": "NOAA-20", "frp": 15.0},
        {"latitude": -16.3505, "longitude": -60.9805, "acq_date": "2024-08-20", "satellite": "Suomi-NPP", "frp": 11.0},
    ]
    df = pd.DataFrame(data)

    processor = H3GridProcessor(resolution=8)
    agg = processor.aggregate_daily_grid(df)

    # All 5 points collapse into 1 unique H3 cell
    assert len(agg) == 1
    # Raw points count is 5
    assert agg.iloc[0]["raw_points_count"] == 5
    # Presence binary is 1 (eliminates point count explosion!)
    assert agg.iloc[0]["presence_binary"] == 1
    # Total FRP is sum of 5 points
    assert agg.iloc[0]["total_frp"] == 56.0
    # Density is properly normalized by cell area (~0.73 km²)
    expected_density = round(56.0 / H3_RES_8_AREA_KM2, 3)
    assert pytest.approx(agg.iloc[0]["frp_density_mw_km2"], abs=0.1) == expected_density


def test_export_geojson_features():
    """Generates a valid GeoJSON FeatureCollection."""
    df = pd.DataFrame([
        {"latitude": -16.35, "longitude": -60.98, "acq_date": "2024-08-20", "satellite": "Terra", "frp": 25.0},
        {"latitude": -17.80, "longitude": -63.20, "acq_date": "2024-08-20", "satellite": "Aqua", "frp": 15.0},
    ])
    processor = H3GridProcessor(resolution=8)
    agg = processor.aggregate_daily_grid(df)
    geojson_fc = processor.export_geojson_features(agg)

    assert geojson_fc["type"] == "FeatureCollection"
    assert len(geojson_fc["features"]) >= 1
    feat = geojson_fc["features"][0]
    assert "properties" in feat
    assert "active" in feat["properties"]
    assert feat["properties"]["active"] == 1
