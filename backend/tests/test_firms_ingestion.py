"""Unit Tests for CSV Ingestion and API Normalization Pipelines.
"""

import pytest
import io
import pandas as pd
from unittest.mock import patch, MagicMock
from app.services.ingestion.firms_csv import FirmsCsvIngestionService
from app.services.ingestion.firms_api import FirmsApiClient


def test_modis_chunk_normalization():
    service = FirmsCsvIngestionService(db_session=None)

    raw_csv = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-16.375,-60.962,330.5,1.2,1.1,2024-08-15,1345,Terra,MODIS,75,6.1N,298.2,35.4,D
-16.380,-60.970,305.0,1.0,1.0,2024-08-15,1345,Terra,MODIS,20,6.1N,290.0,5.0,D
"""
    df = pd.read_csv(io.StringIO(raw_csv))
    records = service.normalize_chunk_modis(df, apply_cleaning=True)

    # Row 2 has confidence 20, which is < 30, so it should be filtered out
    assert len(records) == 1
    r = records[0]
    assert r["latitude"] == -16.375
    assert r["longitude"] == -60.962
    assert r["confidence"] == 75
    assert r["satellite"] == "Terra"
    assert "POINT" in r["geom"]
    assert "POLYGON" in r["pixel_geom"]


def test_viirs_chunk_normalization():
    service = FirmsCsvIngestionService(db_session=None)

    raw_csv = """latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
-18.330,-59.760,345.2,0.38,0.37,2024-09-02,0430,SNPP,VIIRS,nominal,2.0N,295.1,18.7,N
-18.335,-59.765,310.0,0.40,0.38,2024-09-02,0430,SNPP,VIIRS,low,2.0N,291.0,3.2,N
"""
    df = pd.read_csv(io.StringIO(raw_csv))
    records = service.normalize_chunk_viirs(df, apply_cleaning=True)

    # Row 2 has confidence 'low', which should be filtered out
    assert len(records) == 1
    r = records[0]
    assert r["latitude"] == -18.330
    assert r["longitude"] == -59.760
    assert r["confidence"] == "nominal"
    assert r["daynight"] == "N"
    assert "POINT" in r["geom"]
    assert "POLYGON" in r["pixel_geom"]


def test_firms_api_sync_deduplication():
    client = FirmsApiClient(map_key="test_key", db_session=None)

    # Mock response with duplicate records inside the stream
    csv_payload = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-16.500,-60.500,325.0,1.0,1.0,2024-08-20,1400,T,MODIS,80,6.1N,295.0,25.0,D
-16.500,-60.500,325.0,1.0,1.0,2024-08-20,1400,T,MODIS,80,6.1N,295.0,25.0,D
-16.550,-60.550,330.0,1.0,1.0,2024-08-20,1400,T,MODIS,85,6.1N,296.0,30.0,D
"""

    summary = client.process_nrt_csv_payload(source="MODIS_NRT", csv_text=csv_payload, day_range=1)

    # 3 read, 1 duplicate filtered out -> 2 valid
    assert summary["records_processed"] == 3
    assert summary["records_inserted"] == 2
    assert summary["records_duplicated"] == 1
