"""Unit Tests for Quality Cleaning and Static Thermal Anomaly Detection.

Tests acceptance criteria for DEV 1 Ticket #1.4.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
from app.services.ingestion.quality_cleaning import (
    apply_quality_filters,
    detect_static_anomalies,
    clean_for_harmonization,
)


class TestModisQualityFiltering:
    def test_modis_excludes_confidence_under_30(self):
        data = {
            "latitude": [-16.5, -16.6, -16.7, -16.8],
            "longitude": [-60.5, -60.6, -60.7, -60.8],
            "confidence": [20, 29, 30, 85],
            "frp": [12.5, 8.0, 15.0, 120.0],
            "acq_date": ["2024-08-10", "2024-08-10", "2024-08-10", "2024-08-10"],
        }
        df = pd.DataFrame(data)
        cleaned = apply_quality_filters(df, sensor_type="MODIS", min_modis_confidence=30)

        # 20 and 29 should be filtered out; 30 and 85 must remain
        assert len(cleaned) == 2
        assert set(cleaned["confidence"]) == {30, 85}

    def test_modis_handles_string_confidence(self):
        data = {
            "latitude": [-17.0, -17.1],
            "longitude": [-61.0, -61.1],
            "confidence": ["15", "90"],
            "frp": [10.0, 50.0],
            "acq_date": ["2024-09-01", "2024-09-01"],
        }
        df = pd.DataFrame(data)
        cleaned = apply_quality_filters(df, sensor_type="MODIS")
        assert len(cleaned) == 1
        assert cleaned.iloc[0]["confidence"] == 90


class TestViirsQualityFiltering:
    def test_viirs_excludes_low_confidence(self):
        data = {
            "latitude": [-15.5, -15.6, -15.7, -15.8],
            "longitude": [-59.5, -59.6, -59.7, -59.8],
            "confidence": ["low", "l", "nominal", "high"],
            "frp": [5.0, 4.2, 18.5, 95.0],
            "acq_date": ["2024-08-15"] * 4,
        }
        df = pd.DataFrame(data)
        cleaned = apply_quality_filters(df, sensor_type="VIIRS")

        # 'low' and 'l' must be excluded; 'nominal' and 'high' must remain
        assert len(cleaned) == 2
        assert set(cleaned["confidence"]) == {"nominal", "high"}

    def test_viirs_accepts_shorthand_and_case_variants(self):
        data = {
            "latitude": [-16.0, -16.1, -16.2],
            "longitude": [-60.0, -60.1, -60.2],
            "confidence": ["N", "H", "LOW"],
            "frp": [10.0, 20.0, 5.0],
            "acq_date": ["2024-08-20"] * 3,
        }
        df = pd.DataFrame(data)
        cleaned = apply_quality_filters(df, sensor_type="VIIRS")
        assert len(cleaned) == 2
        assert set(cleaned["confidence"]) == {"nominal", "high"}


class TestCoordinateAndFrpFiltering:
    def test_invalid_coordinates_and_negative_frp_removed(self):
        data = {
            "latitude": [-16.5, 95.0, -16.5, -16.5],  # 95 is invalid lat
            "longitude": [-60.5, -60.5, 200.0, -60.5], # 200 is invalid lon
            "confidence": [80, 80, 80, 80],
            "frp": [25.0, 10.0, 15.0, -5.0],           # -5 is invalid FRP
            "acq_date": ["2024-08-10"] * 4,
        }
        df = pd.DataFrame(data)
        cleaned = apply_quality_filters(df, sensor_type="MODIS")
        assert len(cleaned) == 1
        assert cleaned.iloc[0]["frp"] == 25.0


class TestStaticAnomalyDetection:
    def test_detects_recurrent_gas_flare_anomaly(self):
        # Create a stationary gas flare active for 310 days in 2024
        base_date = date(2024, 1, 1)
        flare_lats = [-21.456] * 310
        flare_lons = [-63.512] * 310
        flare_dates = [base_date + timedelta(days=i) for i in range(310)]

        # Create a sporadic forest fire active for only 5 days in August 2024
        fire_base = date(2024, 8, 1)
        fire_lats = [-16.200] * 5
        fire_lons = [-60.800] * 5
        fire_dates = [fire_base + timedelta(days=i) for i in range(5)]

        df = pd.DataFrame({
            "latitude": flare_lats + fire_lats,
            "longitude": flare_lons + fire_lons,
            "acq_date": flare_dates + fire_dates,
            "confidence": [80] * (310 + 5),
            "frp": [15.0] * 310 + [45.0] * 5,
        })

        tagged = detect_static_anomalies(df, recurrence_days_threshold=300, spatial_precision=3)

        # Check gas flare records
        flare_records = tagged[tagged["latitude"] == -21.456]
        assert flare_records["is_static_anomaly"].all() == True

        # Check wildfire records
        wildfire_records = tagged[tagged["latitude"] == -16.200]
        assert wildfire_records["is_static_anomaly"].any() == False

    def test_clean_for_harmonization_pipeline(self):
        # Combined test: filters low confidence and excludes static anomalies
        base_date = date(2024, 1, 1)
        df = pd.DataFrame({
            "latitude": [-21.456] * 305 + [-16.2] * 4,
            "longitude": [-63.512] * 305 + [-60.8] * 4,
            "acq_date": [base_date + timedelta(days=i) for i in range(305)] + ["2024-08-10"] * 4,
            "confidence": [80] * 305 + [10, 25, 50, 95], # two low confidence in wildfire
            "frp": [15.0] * 305 + [5.0, 8.0, 35.0, 120.0],
        })

        result = clean_for_harmonization(
            df,
            sensor_type="MODIS",
            exclude_static_anomalies=True,
            min_modis_confidence=30,
            recurrence_days_threshold=300
        )

        # Only the 2 high-confidence wildfire points must remain
        assert len(result) == 2
        assert (result["confidence"] >= 30).all()
        assert (result["latitude"] == -16.2).all()
