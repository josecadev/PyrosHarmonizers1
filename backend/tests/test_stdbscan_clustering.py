"""Unit tests for Spatio-Temporal DBSCAN (ST-DBSCAN) and Polygon Fusion.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from shapely.geometry import Polygon

from app.services.harmonization.stdbscan import STDBSCAN
from app.services.harmonization.polygon_fusion import (
    PolygonFusionEngine,
    fuse_cluster_hotspots,
    HarmonizedEvent,
)


def test_stdbscan_clustering_coincident_pair():
    """Points close in space (<500m) and time (<1 hour) should cluster together."""
    base_time = datetime(2024, 8, 15, 14, 0, 0)
    data = [
        # MODIS detection
        {
            "latitude": -16.3500,
            "longitude": -60.9800,
            "acq_datetime": base_time,
            "satellite": "Aqua",
            "frp": 25.0,
            "scan": 1.2,
            "track": 1.1,
        },
        # VIIRS detection 300m away, 30 minutes later
        {
            "latitude": -16.3525,  # ~278m south
            "longitude": -60.9810, # ~106m west
            "acq_datetime": base_time + timedelta(minutes=30),
            "satellite": "Suomi-NPP",
            "frp": 12.0,
            "scan": 0.38,
            "track": 0.38,
        },
    ]
    df = pd.DataFrame(data)

    stdbscan = STDBSCAN(eps_spatial_m=1000.0, eps_temporal_sec=14400.0, min_samples=1)
    labels = stdbscan.fit_predict(df, lat_col="latitude", lon_col="longitude", time_col="acq_datetime")

    assert len(labels) == 2
    assert labels[0] == labels[1]
    assert labels[0] >= 0


def test_stdbscan_clustering_temporal_separation():
    """Points at same location but separated by > 4 hours should NOT cluster together."""
    base_time = datetime(2024, 8, 15, 12, 0, 0)
    data = [
        {
            "latitude": -16.3500,
            "longitude": -60.9800,
            "acq_datetime": base_time,
            "satellite": "Terra",
            "frp": 20.0,
        },
        {
            "latitude": -16.3500,
            "longitude": -60.9800,
            "acq_datetime": base_time + timedelta(hours=6),  # 6 hours later (> 4h window)
            "satellite": "Aqua",
            "frp": 15.0,
        },
    ]
    df = pd.DataFrame(data)

    stdbscan = STDBSCAN(eps_spatial_m=1000.0, eps_temporal_sec=14400.0, min_samples=1)
    labels = stdbscan.fit_predict(df)

    assert labels[0] != labels[1]


def test_stdbscan_clustering_spatial_separation():
    """Points occurring at same time but separated by > 1000m should NOT cluster together."""
    base_time = datetime(2024, 8, 15, 14, 0, 0)
    data = [
        {
            "latitude": -16.3500,
            "longitude": -60.9800,
            "acq_datetime": base_time,
            "satellite": "Aqua",
            "frp": 20.0,
        },
        {
            "latitude": -16.4500,  # ~11.1 km away
            "longitude": -60.9800,
            "acq_datetime": base_time,
            "satellite": "Aqua",
            "frp": 15.0,
        },
    ]
    df = pd.DataFrame(data)

    stdbscan = STDBSCAN(eps_spatial_m=1000.0, eps_temporal_sec=14400.0, min_samples=1)
    labels = stdbscan.fit_predict(df)

    assert labels[0] != labels[1]


def test_polygon_fusion_mixed_event():
    """Fuses 1 MODIS + 2 VIIRS detections into a single MIXED event with fused convex hull."""
    base_time = datetime(2024, 8, 15, 14, 0, 0)
    cluster_data = [
        {
            "latitude": -16.3500,
            "longitude": -60.9800,
            "acq_datetime": base_time,
            "satellite": "Aqua",
            "frp": 40.0,
            "scan": 1.1,
            "track": 1.0,
            "brightness": 330.0,
            "daynight": "D",
        },
        {
            "latitude": -16.3520,
            "longitude": -60.9810,
            "acq_datetime": base_time + timedelta(minutes=20),
            "satellite": "Suomi-NPP",
            "frp": 18.0,
            "scan": 0.38,
            "track": 0.38,
            "brightness": 340.0,
            "daynight": "D",
        },
        {
            "latitude": -16.3490,
            "longitude": -60.9790,
            "acq_datetime": base_time + timedelta(minutes=20),
            "satellite": "Suomi-NPP",
            "frp": 15.0,
            "scan": 0.38,
            "track": 0.38,
            "brightness": 335.0,
            "daynight": "D",
        },
    ]
    cluster_df = pd.DataFrame(cluster_data)

    event = fuse_cluster_hotspots(cluster_df, cluster_id=101)

    assert isinstance(event, HarmonizedEvent)
    assert event.event_id == 101
    assert event.event_type == "MIXED"
    assert event.point_count == 3
    assert event.modis_count == 1
    assert event.viirs_count == 2
    assert event.raw_frp_sum == 73.0
    assert event.raw_modis_frp_sum == 40.0
    assert event.raw_viirs_frp_sum == 33.0
    assert event.max_brightness == 340.0
    assert isinstance(event.hull_polygon, Polygon)
    assert event.area_km2 > 0.0


def test_polygon_fusion_isolated_detection():
    """Single isolated MODIS detection retains its individual footprint and attributes."""
    data = [{
        "latitude": -16.5000,
        "longitude": -61.2000,
        "acq_datetime": datetime(2010, 9, 1, 13, 30),
        "satellite": "Terra",
        "frp": 25.0,
        "scan": 1.2,
        "track": 1.1,
        "brightness": 320.0,
        "daynight": "D",
    }]
    event = fuse_cluster_hotspots(pd.DataFrame(data), cluster_id=1)

    assert event.event_type == "MODIS_ONLY"
    assert event.point_count == 1
    assert event.modis_count == 1
    assert event.viirs_count == 0
    assert pytest.approx(event.area_km2, rel=1e-2) == 1.32
