from datetime import date

from backend.app.errors import ApiError

SATELLITE_TO_DB = {
    "Terra": "Terra",
    "Aqua": "Aqua",
    "SNPP": "SNPP",
    "NOAA-20": "NOAA20",
    "NOAA-21": "NOAA21",
    "NOAA20": "NOAA20",
    "NOAA21": "NOAA21",
}

SATELLITE_TO_API = {
    "Terra": "Terra",
    "Aqua": "Aqua",
    "SNPP": "SNPP",
    "NOAA20": "NOAA-20",
    "NOAA21": "NOAA-21",
}

MONTHS_ES = [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
]


def parse_bbox(value: str | None) -> tuple[float, float, float, float] | None:
    if value is None or value == "":
        return None
    parts = [part.strip() for part in value.split(",")]
    if len(parts) != 4:
        raise ApiError(
            400,
            "Bad Request",
            "Parámetro 'bbox' no válido. Formato esperado: minLng,minLat,maxLng,maxLat",
            {"param": "bbox", "received": value},
        )
    try:
        min_lon, min_lat, max_lon, max_lat = (float(part) for part in parts)
    except ValueError as exc:
        raise ApiError(
            400,
            "Bad Request",
            "Parámetro 'bbox' no válido. Formato esperado: minLng,minLat,maxLng,maxLat",
            {"param": "bbox", "received": value},
        ) from exc
    if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180 and -90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise ApiError(400, "Bad Request", "Las coordenadas del bbox están fuera de rango.", {"param": "bbox"})
    if min_lon > max_lon or min_lat > max_lat:
        raise ApiError(400, "Bad Request", "El bbox está invertido: el mínimo debe ser menor que el máximo.", {"param": "bbox"})
    return min_lon, min_lat, max_lon, max_lat


def check_dates(date_start: date | None, date_end: date | None) -> None:
    if date_start and date_end and date_start > date_end:
        raise ApiError(400, "Bad Request", "date_start no puede ser posterior a date_end.")


def as_float(value) -> float | None:
    if value is None:
        return None
    return float(value)


def as_int(value) -> int:
    if value is None:
        return 0
    return int(value)


def isoformat(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        text = value.isoformat()
        return text.replace("+00:00", "Z")
    return str(value)


def confidence_level(score) -> str:
    value = float(score or 0)
    if value >= 90:
        return "very_high"
    if value >= 70:
        return "high"
    if value >= 40:
        return "medium"
    return "low"


def satellite_db(value: str | None) -> str | None:
    if value is None or value == "ALL":
        return None
    mapped = SATELLITE_TO_DB.get(value)
    if mapped is None:
        raise ApiError(400, "Bad Request", f"Satélite no reconocido: {value}", {"param": "satellite"})
    return mapped
