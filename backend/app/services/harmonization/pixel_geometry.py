"""Pixel Geometry Reconstruction & Sensor Distortion Correction Module.

NASA Space Apps Challenge 2026 — Reto #8: Harmonization of MODIS and VIIRS Hot Spots.

Addresses the spatial discrepancy between MODIS (1 km nadir, up to 2.0 x 4.8 km at scan edges)
and VIIRS (375 m nominal, up to 800 m at scan edges) by calculating real ground footprints
from scan (along-scan) and track (along-track) dimensions and correcting for off-nadir view angles.
"""

import math
from typing import Tuple, Optional, Union
from shapely.geometry import Polygon, mapping
from shapely import affinity


# Earth equatorial mean radius in km (WGS-84)
R_EARTH_KM = 6371.0088

# Nominal orbital altitudes in km
MODIS_ALTITUDE_KM = 705.0   # Terra and Aqua (sun-synchronous polar orbit)
VIIRS_ALTITUDE_KM = 824.0   # Suomi-NPP and NOAA-20/21


def calculate_pixel_area(scan: float, track: float) -> float:
    """Calculates the physical ground surface area of the pixel footprint in km².
    
    Area = scan (km) * track (km).
    """
    if scan <= 0 or track <= 0:
        raise ValueError(f"Scan and track dimensions must be positive numbers. Got scan={scan}, track={track}")
    return float(scan * track)


def calculate_zenith_angle(
    scan_angle_deg: float,
    altitude_km: float = MODIS_ALTITUDE_KM,
    r_earth_km: float = R_EARTH_KM,
) -> float:
    """Computes the Earth view zenith angle (theta_z) in degrees from scan angle (theta_s).
    
    Using spherical geometry:
        sin(theta_z) = ((R_E + H) / R_E) * sin(theta_s)
    """
    theta_s_rad = math.radians(abs(scan_angle_deg))
    ratio = (r_earth_km + altitude_km) / r_earth_km
    sin_theta_z = ratio * math.sin(theta_s_rad)
    
    # Clamp to avoid domain error near horizon limits
    sin_theta_z = min(1.0, max(-1.0, sin_theta_z))
    theta_z_rad = math.asin(sin_theta_z)
    return math.degrees(theta_z_rad)


def create_pixel_footprint(
    latitude: float,
    longitude: float,
    scan: float,
    track: float,
    orientation_deg: float = 0.0,
) -> Polygon:
    """Constructs the spatial rectangular polygon footprint of a satellite sensor pixel in EPSG:4326.
    
    Args:
        latitude: Center latitude in decimal degrees [-90, 90].
        longitude: Center longitude in decimal degrees [-180, 180].
        scan: Along-scan dimension in kilometers (e.g. 1.0 - 4.8 km for MODIS, 0.375 - 0.8 km for VIIRS).
        track: Along-track dimension in kilometers (e.g. 1.0 - 2.0 km for MODIS, 0.375 km for VIIRS).
        orientation_deg: Orbital heading/orientation azimuth in degrees clockwise from North.
        
    Returns:
        shapely.geometry.Polygon: Closed polygon in WGS84 coordinate system.
    """
    if not (-90.0 <= latitude <= 90.0):
        raise ValueError(f"Latitude out of bounds: {latitude}")
    if not (-180.0 <= longitude <= 180.0):
        raise ValueError(f"Longitude out of bounds: {longitude}")
    if scan <= 0 or track <= 0:
        raise ValueError(f"Scan ({scan}) and track ({track}) dimensions must be positive")

    # 1 degree of latitude is constant ~ 111.32 km on WGS84
    delta_lat = (track / 2.0) / 111.32

    # 1 degree of longitude scales with cosine of latitude
    cos_lat = math.cos(math.radians(latitude))
    effective_cos = max(abs(cos_lat), 0.001)
    delta_lon = (scan / 2.0) / (111.32 * effective_cos)

    min_x = longitude - delta_lon
    max_x = longitude + delta_lon
    min_y = latitude - delta_lat
    max_y = latitude + delta_lat

    coords = [
        (round(min_x, 7), round(min_y, 7)),
        (round(max_x, 7), round(min_y, 7)),
        (round(max_x, 7), round(max_y, 7)),
        (round(min_x, 7), round(max_y, 7)),
        (round(min_x, 7), round(min_y, 7)),
    ]
    poly = Polygon(coords)

    if orientation_deg != 0.0:
        # Rotate polygon around centroid
        poly = affinity.rotate(poly, -orientation_deg, origin='centroid')

    return poly


def calculate_frp_density(
    frp: float,
    scan: float,
    track: float,
) -> float:
    """Calculates Fire Radiative Power (FRP) density in MW/km².
    
    Normalizes total emitted radiative energy by the actual physical area of the sensor footprint,
    eliminating the false over-estimation bias caused by optical pixel deformation off-nadir.
    
    FRP_density = FRP (MW) / Area (km²)
    """
    if frp is None or math.isnan(frp):
        return 0.0
    area = calculate_pixel_area(scan, track)
    if area <= 0:
        return 0.0
    return float(frp / area)


def get_footprint_geojson(
    latitude: float,
    longitude: float,
    scan: float,
    track: float,
) -> dict:
    """Convenience helper returning GeoJSON dictionary representation of pixel footprint."""
    poly = create_pixel_footprint(latitude, longitude, scan, track)
    return mapping(poly)
