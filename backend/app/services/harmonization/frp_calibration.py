"""Radiometric FRP Calibration & Harmonized Fire Intensity Index (HFII) Engine.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.

Resolves the 2012 sensor transition artifact where the higher spatial resolution of VIIRS (375m)
subdivides fire fronts into multiple active pixels, artificially inflating raw summed FRP by ~1.8x - 2.2x
relative to the historic MODIS baseline (2000-2012).

Calculates the calibrated Harmonized Fire Intensity Index (HFII):
    HFII = w_daynight * (alpha * sum(FRP_VIIRS) + beta * FRP_MODIS) * (Area_ref / Area_real)
"""

import math
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple, Union
from sklearn.linear_model import HuberRegressor

logger = logging.getLogger(__name__)

# Empirical calibration defaults based on Chiquitania / Amazon basin coincident observations
DEFAULT_ALPHA = 0.52       # VIIRS attenuation factor to harmonize with MODIS baseline (1 / ~1.92)
DEFAULT_BETA = 1.00        # MODIS baseline anchor
DEFAULT_W_DAY = 1.00       # Daytime weight
DEFAULT_W_NIGHT = 0.88     # Nighttime weight (corrects for VIIRS high night sensitivity & no solar reflection)
DEFAULT_AREA_REF = 1.00    # Reference area in km² (nadir MODIS pixel footprint)


class HFIICalibrator:
    """Harmonized Fire Intensity Index (HFII) Calibration Engine.
    
    Attributes:
        alpha (float): VIIRS FRP scaling coefficient.
        beta (float): MODIS FRP scaling coefficient.
        w_day (float): Daytime observation weight.
        w_night (float): Nighttime observation weight.
        area_ref_km2 (float): Nominal reference footprint area in km².
    """

    def __init__(
        self,
        alpha: float = DEFAULT_ALPHA,
        beta: float = DEFAULT_BETA,
        w_day: float = DEFAULT_W_DAY,
        w_night: float = DEFAULT_W_NIGHT,
        area_ref_km2: float = DEFAULT_AREA_REF,
    ):
        self.alpha = float(alpha)
        self.beta = float(beta)
        self.w_day = float(w_day)
        self.w_night = float(w_night)
        self.area_ref_km2 = float(area_ref_km2)

    def calculate_hfii(
        self,
        modis_frp: float = 0.0,
        viirs_frp: float = 0.0,
        area_real_km2: float = 1.0,
        is_night: bool = False,
        event_type: Optional[str] = None,
    ) -> float:
        """Computes the continuous Harmonized Fire Intensity Index (HFII).
        
        Args:
            modis_frp: Sum of MODIS Fire Radiative Power in MW.
            viirs_frp: Sum of VIIRS Fire Radiative Power in MW.
            area_real_km2: Physical area covered by the fused event polygon in km².
            is_night: True if detected during nighttime overpass.
            event_type: 'MODIS_ONLY', 'VIIRS_ONLY', or 'MIXED'. If None, inferred from values.
            
        Returns:
            float: Calibrated HFII value in standardized intensity units (comparable 2000-2026).
        """
        modis_val = max(0.0, float(modis_frp or 0.0))
        viirs_val = max(0.0, float(viirs_frp or 0.0))
        area = max(0.01, float(area_real_km2 or 1.0))

        # Determine sensor regime
        if event_type is None:
            if modis_val > 0 and viirs_val > 0:
                event_type = "MIXED"
            elif modis_val > 0:
                event_type = "MODIS_ONLY"
            else:
                event_type = "VIIRS_ONLY"

        # Apply day/night radiometric weight
        w_dn = self.w_night if is_night else self.w_day

        # Compute sensor-adjusted radiative component
        if event_type == "MODIS_ONLY":
            adjusted_frp = self.beta * modis_val
        elif event_type == "VIIRS_ONLY":
            adjusted_frp = self.alpha * viirs_val
        else:  # MIXED: blend weighted combination
            adjusted_frp = 0.5 * (self.beta * modis_val + self.alpha * viirs_val)

        # Scale by area density relative to reference area
        area_ratio = self.area_ref_km2 / area
        
        # Soft-clamp area ratio between [0.2, 5.0] to prevent extreme division artifacts on micro/macro polygons
        clamped_area_ratio = min(5.0, max(0.2, area_ratio))

        hfii = w_dn * adjusted_frp * clamped_area_ratio
        return round(float(hfii), 4)

    def fit_from_coincident_pairs(
        self,
        coincident_df: pd.DataFrame,
        modis_frp_col: str = "modis_frp",
        viirs_frp_col: str = "viirs_frp",
    ) -> Tuple[float, float]:
        """Fits optimal alpha and beta coefficients using robust regression (Huber loss) on coincident pairs.
        
        Pairs are coincident fire clusters observed by both MODIS and VIIRS within <= 2 hours.
        """
        valid = coincident_df[(coincident_df[modis_frp_col] > 0) & (coincident_df[viirs_frp_col] > 0)].copy()
        if len(valid) < 10:
            logger.warning("Fewer than 10 coincident pairs provided. Keeping default coefficients.")
            return self.alpha, self.beta

        X = valid[[viirs_frp_col]].to_numpy()
        y = valid[modis_frp_col].to_numpy()

        # Fit robust linear model without intercept (FRP=0 -> HFII=0)
        huber = HuberRegressor(fit_intercept=False)
        huber.fit(X, y)

        fitted_alpha = float(huber.coef_[0])
        self.alpha = max(0.2, min(1.0, fitted_alpha))
        self.beta = 1.0  # Kept as baseline anchor

        logger.info(f"Fitted HFII coefficients: alpha={self.alpha:.4f}, beta={self.beta:.4f}")
        return self.alpha, self.beta

    def calibrate_events_dataframe(
        self,
        events_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """Applies vectorized HFII calibration to a DataFrame of events."""
        df = events_df.copy()
        hfii_list = []

        for _, row in df.iterrows():
            m_frp = row.get("raw_modis_frp_sum", row.get("modis_frp", 0.0))
            v_frp = row.get("raw_viirs_frp_sum", row.get("viirs_frp", 0.0))
            area = row.get("area_km2", 1.0)
            is_night = (row.get("night_count", 0) > row.get("day_count", 0)) or (row.get("daynight") == "N")
            etype = row.get("event_type", None)

            val = self.calculate_hfii(
                modis_frp=m_frp,
                viirs_frp=v_frp,
                area_real_km2=area,
                is_night=is_night,
                event_type=etype,
            )
            hfii_list.append(val)

        df["hfii"] = hfii_list
        return df
