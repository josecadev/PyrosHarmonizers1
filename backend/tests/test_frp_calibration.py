"""Unit tests for Radiometric FRP Calibration and HFII Index Calculation.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.
"""

import pytest
import pandas as pd
import numpy as np

from app.services.harmonization.frp_calibration import (
    HFIICalibrator,
    DEFAULT_ALPHA,
    DEFAULT_BETA,
    DEFAULT_W_DAY,
    DEFAULT_W_NIGHT,
)


def test_hfii_modis_only_nadir():
    """For a historic MODIS detection at nadir, HFII matches nominal baseline."""
    calibrator = HFIICalibrator()
    hfii = calibrator.calculate_hfii(
        modis_frp=50.0,
        viirs_frp=0.0,
        area_real_km2=1.0,
        is_night=False,
        event_type="MODIS_ONLY",
    )
    # With beta=1.0, w_day=1.0, area_ratio=1.0 -> 50.0
    assert pytest.approx(hfii, rel=1e-2) == 50.0


def test_hfii_viirs_scaling_factor():
    """VIIRS detection should be attenuated by alpha (~0.52) to eliminate the 2x over-energy surge."""
    calibrator = HFIICalibrator(alpha=0.52)
    # Suppose VIIRS sums to 96.15 MW over the same fire front that MODIS sees as 50 MW
    hfii = calibrator.calculate_hfii(
        modis_frp=0.0,
        viirs_frp=96.15,
        area_real_km2=1.0,
        is_night=False,
        event_type="VIIRS_ONLY",
    )
    # 96.15 * 0.52 ~ 50.0
    assert pytest.approx(hfii, abs=1.0) == 50.0


def test_hfii_night_attenuation():
    """Nighttime detections receive w_night weight (0.88)."""
    calibrator = HFIICalibrator(w_day=1.0, w_night=0.88)
    day_val = calibrator.calculate_hfii(modis_frp=30.0, area_real_km2=1.0, is_night=False)
    night_val = calibrator.calculate_hfii(modis_frp=30.0, area_real_km2=1.0, is_night=True)

    assert night_val < day_val
    assert pytest.approx(night_val, rel=1e-2) == (day_val * 0.88)


def test_hfii_mixed_event():
    """Mixed event blends MODIS and VIIRS components cleanly."""
    calibrator = HFIICalibrator(alpha=0.5, beta=1.0)
    # MODIS = 40 MW, VIIRS = 80 MW (which at alpha=0.5 is 40 MW equivalent)
    hfii = calibrator.calculate_hfii(
        modis_frp=40.0,
        viirs_frp=80.0,
        area_real_km2=1.0,
        is_night=False,
        event_type="MIXED",
    )
    # 0.5 * (1.0*40 + 0.5*80) = 40.0
    assert pytest.approx(hfii, rel=1e-2) == 40.0


def test_hfii_fit_from_coincident_pairs():
    """Verifies empirical regression fitting on paired observations."""
    calibrator = HFIICalibrator()
    rng = np.random.default_rng(seed=123)
    modis_vals = rng.uniform(10.0, 100.0, size=50)
    # VIIRS values roughly 2x MODIS values with minor noise
    viirs_vals = modis_vals * 2.0 + rng.normal(0, 2.0, size=50)

    df_pairs = pd.DataFrame({
        "modis_frp": modis_vals,
        "viirs_frp": viirs_vals,
    })

    alpha, beta = calibrator.fit_from_coincident_pairs(df_pairs)
    assert 0.45 <= alpha <= 0.55
    assert beta == 1.0


def test_calibrate_events_dataframe():
    """Applies calibration across a full events DataFrame."""
    calibrator = HFIICalibrator()
    df = pd.DataFrame([
        {"raw_modis_frp_sum": 20.0, "raw_viirs_frp_sum": 0.0, "area_km2": 1.0, "night_count": 0, "day_count": 1, "event_type": "MODIS_ONLY"},
        {"raw_modis_frp_sum": 0.0, "raw_viirs_frp_sum": 38.0, "area_km2": 1.0, "night_count": 0, "day_count": 1, "event_type": "VIIRS_ONLY"},
    ])

    cal_df = calibrator.calibrate_events_dataframe(df)
    assert "hfii" in cal_df.columns
    assert len(cal_df) == 2
    assert all(cal_df["hfii"] > 0)
