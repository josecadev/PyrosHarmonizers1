import json
from datetime import date

from backend.app.db import Database
from backend.app.services.filters import (
    MONTHS_ES,
    SATELLITE_TO_API,
    as_float,
    as_int,
    confidence_level,
    isoformat,
)

BBox = tuple[float, float, float, float]


def _loads(value):
    if value is None:
        return None
    if isinstance(value, str):
        return json.loads(value)
    return value


def _region_clause(column: str, region_id: str | None, params: list) -> str:
    if not region_id:
        return "TRUE"
    params.extend([region_id, region_id])
    return (
        f"{column} = (SELECT id FROM pyrosharmonizer.regions "
        f"WHERE id::text = %s OR code = %s LIMIT 1)"
    )


def _geom_bbox(column: str, bbox: BBox | None, params: list) -> str:
    if not bbox:
        return "TRUE"
    params.extend(bbox)
    return f"{column} && ST_MakeEnvelope(%s, %s, %s, %s, 4326)"


def _raw_region(geom_column: str, region_id: str | None, params: list) -> str:
    if not region_id:
        return "TRUE"
    params.extend([region_id, region_id])
    return (
        f"ST_Intersects({geom_column}, (SELECT geometry FROM pyrosharmonizer.regions "
        f"WHERE id::text = %s OR code = %s LIMIT 1))"
    )


def list_regions(db: Database, limit: int, offset: int) -> list[dict]:
    rows = db.fetchall(
        """
        SELECT id::text AS id, name, type::text AS region_type, department_name,
               area_km2, ST_AsGeoJSON(geometry) AS geometry
        FROM pyrosharmonizer.regions
        ORDER BY name
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    return [_region(row) for row in rows]


def get_region(db: Database, region_id: str) -> dict | None:
    row = db.fetchone(
        """
        SELECT id::text AS id, name, type::text AS region_type, department_name,
               area_km2, ST_AsGeoJSON(geometry) AS geometry
        FROM pyrosharmonizer.regions
        WHERE id::text = %s OR code = %s
        """,
        (region_id, region_id),
    )
    return _region(row) if row else None


def _region(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "region_type": row["region_type"],
        "department": row["department_name"],
        "country": "Bolivia",
        "area_km2": as_float(row["area_km2"]),
        "geometry": _loads(row["geometry"]),
    }


def region_stats(db: Database, region_id: str) -> dict | None:
    region = get_region(db, region_id)
    if region is None:
        return None
    params: list = []
    region_sql = _region_clause("region_id", region_id, params)
    totals = db.fetchone(
        f"""
        SELECT count(*)::int AS total_events,
               coalesce(sum(estimated_area_ha), 0) AS total_area_ha,
               coalesce(avg(hfii), 0) AS avg_hfii,
               count(DISTINCT extract(year FROM start_time))::int AS years_covered
        FROM pyrosharmonizer.harmonized_fire_events
        WHERE {region_sql}
        """,
        tuple(params),
    )
    peak_params: list = []
    peak_region = _region_clause("region_id", region_id, peak_params)
    peak = db.fetchone(
        f"""
        SELECT extract(month FROM start_time)::int AS month, count(*)::int AS n
        FROM pyrosharmonizer.harmonized_fire_events
        WHERE {peak_region}
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 1
        """,
        tuple(peak_params),
    )
    raw_params: list = [region_id, region_id, region_id, region_id]
    raw = db.fetchone(
        """
        SELECT
          (SELECT count(*) FROM pyrosharmonizer.raw_modis_hotspots
            WHERE acq_date >= DATE '2012-01-01'
              AND ST_Intersects(geom, (SELECT geometry FROM pyrosharmonizer.regions WHERE id::text = %s OR code = %s LIMIT 1))
          )::int AS modis_count,
          (SELECT count(*) FROM pyrosharmonizer.raw_viirs_hotspots
            WHERE ST_Intersects(geom, (SELECT geometry FROM pyrosharmonizer.regions WHERE id::text = %s OR code = %s LIMIT 1))
          )::int AS viirs_count
        """,
        tuple(raw_params),
    )
    modis_count = as_int(raw["modis_count"] if raw else 0)
    viirs_count = as_int(raw["viirs_count"] if raw else 0)
    month_index = as_int(peak["month"]) if peak and peak["month"] else 1
    return {
        "region_id": region["id"],
        "region_name": region["name"],
        "total_events": as_int(totals["total_events"] if totals else 0),
        "total_area_ha": as_float(totals["total_area_ha"] if totals else 0),
        "avg_hfii": as_float(totals["avg_hfii"] if totals else 0),
        "peak_month": MONTHS_ES[month_index] if peak else "Sin datos",
        "peak_month_index": month_index,
        "trend": "stable",
        "effect_2012_discrepancy_factor": round(viirs_count / modis_count, 2) if modis_count else 0.0,
        "historical_years_covered": as_int(totals["years_covered"] if totals else 0),
    }


def _modis_filters(bbox, date_start, date_end, confidence_min, daynight, satellite) -> tuple[str, list]:
    clauses = ["TRUE"]
    params: list = []
    geom = _geom_bbox("geom", bbox, params)
    clauses.append(geom)
    if date_start:
        clauses.append("acq_date >= %s")
        params.append(date_start)
    if date_end:
        clauses.append("acq_date <= %s")
        params.append(date_end)
    if confidence_min is not None:
        clauses.append("confidence >= %s")
        params.append(confidence_min)
    if daynight and daynight != "ALL":
        clauses.append("daynight = %s")
        params.append(daynight)
    if satellite:
        clauses.append("satellite = %s")
        params.append(satellite)
    return " AND ".join(clauses), params


def list_modis(db: Database, bbox, date_start, date_end, confidence_min, daynight, satellite, limit, offset) -> dict:
    where, params = _modis_filters(bbox, date_start, date_end, confidence_min, daynight, satellite)
    total = db.fetchone(f"SELECT count(*)::int AS n FROM pyrosharmonizer.raw_modis_hotspots WHERE {where}", tuple(params))
    rows = db.fetchall(
        f"""
        SELECT latitude, longitude, brightness, scan, track, acq_date, acq_time,
               satellite::text AS satellite, confidence, frp, daynight::text AS daynight,
               instrument, version, ST_AsGeoJSON(geom) AS geometry
        FROM pyrosharmonizer.raw_modis_hotspots
        WHERE {where}
        ORDER BY acq_date DESC, acq_time DESC
        LIMIT %s OFFSET %s
        """,
        tuple([*params, limit, offset]),
    )
    data = []
    for row in rows:
        data.append(
            {
                "latitude": as_float(row["latitude"]),
                "longitude": as_float(row["longitude"]),
                "brightness": as_float(row["brightness"]),
                "scan": as_float(row["scan"]),
                "track": as_float(row["track"]),
                "acq_date": isoformat(row["acq_date"]),
                "acq_time": row["acq_time"],
                "satellite": SATELLITE_TO_API.get(row["satellite"], row["satellite"]),
                "confidence": as_int(row["confidence"]),
                "frp": as_float(row["frp"]),
                "daynight": row["daynight"],
                "instrument": row["instrument"],
                "version": row["version"],
                "geometry": _loads(row["geometry"]),
            }
        )
    return {"total": as_int(total["n"] if total else 0), "limit": limit, "offset": offset, "data": data}


def _viirs_confidence(level: str | None) -> str:
    if level == "high":
        return "confidence = 'high'"
    if level == "nominal":
        return "confidence IN ('nominal', 'high')"
    return "TRUE"


def list_viirs(db, bbox, date_start, date_end, confidence_min, daynight, satellite, bright_min, bright_max, limit, offset) -> dict:
    clauses = ["TRUE", _viirs_confidence(confidence_min)]
    params: list = []
    clauses.append(_geom_bbox("geom", bbox, params))
    if date_start:
        clauses.append("acq_date >= %s")
        params.append(date_start)
    if date_end:
        clauses.append("acq_date <= %s")
        params.append(date_end)
    if daynight and daynight != "ALL":
        clauses.append("daynight = %s")
        params.append(daynight)
    if satellite:
        clauses.append("satellite = %s")
        params.append(satellite)
    if bright_min is not None:
        clauses.append("bright_ti4 >= %s")
        params.append(bright_min)
    if bright_max is not None:
        clauses.append("bright_ti4 <= %s")
        params.append(bright_max)
    where = " AND ".join(clauses)
    total = db.fetchone(f"SELECT count(*)::int AS n FROM pyrosharmonizer.raw_viirs_hotspots WHERE {where}", tuple(params))
    rows = db.fetchall(
        f"""
        SELECT latitude, longitude, bright_ti4, bright_ti5, scan, track, acq_date, acq_time,
               satellite::text AS satellite, confidence::text AS confidence, frp,
               daynight::text AS daynight, instrument, version, ST_AsGeoJSON(geom) AS geometry
        FROM pyrosharmonizer.raw_viirs_hotspots
        WHERE {where}
        ORDER BY acq_date DESC, acq_time DESC
        LIMIT %s OFFSET %s
        """,
        tuple([*params, limit, offset]),
    )
    data = [
        {
            "latitude": as_float(row["latitude"]),
            "longitude": as_float(row["longitude"]),
            "bright_ti4": as_float(row["bright_ti4"]),
            "bright_ti5": as_float(row["bright_ti5"]),
            "scan": as_float(row["scan"]),
            "track": as_float(row["track"]),
            "acq_date": isoformat(row["acq_date"]),
            "acq_time": row["acq_time"],
            "satellite": SATELLITE_TO_API.get(row["satellite"], row["satellite"]),
            "confidence": row["confidence"],
            "frp": as_float(row["frp"]),
            "daynight": row["daynight"],
            "instrument": row["instrument"],
            "version": row["version"],
            "geometry": _loads(row["geometry"]),
        }
        for row in rows
    ]
    return {"total": as_int(total["n"] if total else 0), "limit": limit, "offset": offset, "data": data}


def compare_hotspots(db: Database, bbox, date_start: date | None, date_end: date | None, region_id: str | None, bbox_text: str | None) -> dict:
    modis_where, modis_params = _modis_filters(bbox, date_start, date_end, None, None, None)
    if region_id:
        modis_where += " AND " + _raw_region("geom", region_id, modis_params)
    modis = db.fetchone(
        f"SELECT count(*)::int AS n, coalesce(avg(frp), 0) AS mean_frp FROM pyrosharmonizer.raw_modis_hotspots WHERE {modis_where}",
        tuple(modis_params),
    )
    viirs_clauses = ["TRUE"]
    viirs_params: list = []
    viirs_clauses.append(_geom_bbox("geom", bbox, viirs_params))
    if date_start:
        viirs_clauses.append("acq_date >= %s")
        viirs_params.append(date_start)
    if date_end:
        viirs_clauses.append("acq_date <= %s")
        viirs_params.append(date_end)
    if region_id:
        viirs_clauses.append(_raw_region("geom", region_id, viirs_params))
    viirs_where = " AND ".join(viirs_clauses)
    viirs = db.fetchone(
        f"SELECT count(*)::int AS n, coalesce(avg(frp), 0) AS mean_frp FROM pyrosharmonizer.raw_viirs_hotspots WHERE {viirs_where}",
        tuple(viirs_params),
    )
    event_clauses = ["TRUE"]
    event_params: list = []
    event_clauses.append(_geom_bbox("centroid", bbox, event_params))
    if date_start:
        event_clauses.append("start_time::date >= %s")
        event_params.append(date_start)
    if date_end:
        event_clauses.append("start_time::date <= %s")
        event_params.append(date_end)
    if region_id:
        event_clauses.append(_region_clause("region_id", region_id, event_params))
    events = db.fetchone(
        f"""
        SELECT count(*)::int AS n, coalesce(avg(hfii), 0) AS mean_hfii
        FROM pyrosharmonizer.harmonized_fire_events
        WHERE {" AND ".join(event_clauses)}
        """,
        tuple(event_params),
    )
    modis_count = as_int(modis["n"] if modis else 0)
    viirs_count = as_int(viirs["n"] if viirs else 0)
    event_count = as_int(events["n"] if events else 0)
    raw_total = modis_count + viirs_count
    ratio = round(viirs_count / modis_count, 2) if modis_count else 0.0
    compression = round((1 - (event_count / raw_total)) * 100, 1) if raw_total else 0.0
    bias = ratio >= 3 and viirs_count > 0
    if raw_total == 0:
        summary = "No hay detecciones en el rango consultado. La comparación queda en cero hasta que se carguen datos FIRMS."
    else:
        summary = (
            f"VIIRS reportó {ratio}x detecciones respecto de MODIS. "
            f"La armonización dejó {event_count} eventos frente a {raw_total} focos crudos "
            f"({compression}% de reducción de redundancia)."
        )
    return {
        "bbox": bbox_text,
        "date_start": isoformat(date_start),
        "date_end": isoformat(date_end),
        "modis_raw_count": modis_count,
        "viirs_raw_count": viirs_count,
        "raw_ratio_viirs_to_modis": ratio,
        "harmonized_events_count": event_count,
        "modis_mean_frp": as_float(modis["mean_frp"] if modis else 0),
        "viirs_mean_frp": as_float(viirs["mean_frp"] if viirs else 0),
        "calibrated_mean_frp": as_float(events["mean_hfii"] if events else 0),
        "clustering_compression_ratio": compression,
        "effect_2012_bias_detected": bias,
        "analysis_summary": summary,
    }


def _event(row: dict) -> dict:
    eps_m = as_float(row["eps_spatial_m"]) or 750
    eps_h = as_float(row["eps_temporal_hours"]) or 4
    algorithm = row["cluster_algorithm"]
    label = f"ST-DBSCAN (eps_geo={eps_m}m, eps_time={eps_h}h)" if algorithm == "stdbscan" else str(algorithm)
    return {
        "event_id": row["event_id"],
        "hfii_score": as_float(row["hfii"]),
        "calibrated_frp": as_float(row["mean_frp"]),
        "modis_count": as_int(row["modis_count"]),
        "viirs_count": as_int(row["viirs_count"]),
        "start_time": isoformat(row["start_time"]),
        "end_time": isoformat(row["end_time"]),
        "area_ha": as_float(row["estimated_area_ha"]),
        "confidence_level": confidence_level(row["confidence_score"]),
        "cluster_algorithm": label,
        "region_id": row["region_id"],
        "geometry": _loads(row["geometry"]),
    }


_EVENT_SELECT = """
    SELECT coalesce(event_code, id::text) AS event_id,
           hfii, mean_frp, modis_count, viirs_count, start_time, end_time,
           estimated_area_ha, confidence_score, cluster_algorithm::text AS cluster_algorithm,
           eps_spatial_m, eps_temporal_hours, region_id::text AS region_id,
           ST_AsGeoJSON(COALESCE(convex_hull, ST_Buffer(centroid, 0.005))) AS geometry
    FROM pyrosharmonizer.harmonized_fire_events
"""


def list_events(db: Database, bbox, date_start, date_end, hfii_min, hfii_max, limit, offset) -> dict:
    clauses = ["TRUE"]
    params: list = []
    clauses.append(_geom_bbox("COALESCE(convex_hull, centroid)", bbox, params))
    if date_start:
        clauses.append("start_time::date >= %s")
        params.append(date_start)
    if date_end:
        clauses.append("end_time::date <= %s")
        params.append(date_end)
    if hfii_min is not None:
        clauses.append("hfii >= %s")
        params.append(hfii_min)
    if hfii_max is not None:
        clauses.append("hfii <= %s")
        params.append(hfii_max)
    where = " AND ".join(clauses)
    total = db.fetchone(f"SELECT count(*)::int AS n FROM pyrosharmonizer.harmonized_fire_events WHERE {where}", tuple(params))
    rows = db.fetchall(
        f"{_EVENT_SELECT} WHERE {where} ORDER BY start_time DESC LIMIT %s OFFSET %s",
        tuple([*params, limit, offset]),
    )
    return {"total": as_int(total["n"] if total else 0), "limit": limit, "offset": offset, "data": [_event(row) for row in rows]}


def get_event(db: Database, event_id: str) -> dict | None:
    row = db.fetchone(
        f"{_EVENT_SELECT} WHERE id::text = %s OR event_code = %s",
        (event_id, event_id),
    )
    return _event(row) if row else None


def list_h3(db: Database, resolution: int, day: date | None, region_id: str | None) -> list[dict]:
    clauses = ["resolution = %s"]
    params: list = [resolution]
    if day:
        clauses.append("cell_date = %s")
        params.append(day)
    if region_id:
        clauses.append(_raw_region("geom", region_id, params))
    where = " AND ".join(clauses)
    rows = db.fetchall(
        f"""
        SELECT h3_index, resolution, cell_date, total_hotspots, hfii_mean,
               coalesce(total_frp_modis, 0) + coalesce(total_frp_viirs, 0) AS frp_sum,
               ST_Area(geom::geography) AS area_m2,
               ST_Y(ST_Centroid(geom)) AS center_lat,
               ST_X(ST_Centroid(geom)) AS center_lng
        FROM pyrosharmonizer.h3_daily_cells
        WHERE {where}
        ORDER BY cell_date DESC
        LIMIT 5000
        """,
        tuple(params),
    )
    cells = []
    for row in rows:
        area_km2 = (as_float(row["area_m2"]) or 0) / 1_000_000
        density = (as_float(row["frp_sum"]) or 0) / area_km2 if area_km2 else 0
        cells.append(
            {
                "h3_index": row["h3_index"],
                "resolution": as_int(row["resolution"]),
                "acq_date": isoformat(row["cell_date"]),
                "is_active": as_int(row["total_hotspots"]) > 0,
                "harmonized_frp_density": round(density, 2),
                "event_count": as_int(row["total_hotspots"]),
                "hfii_mean": as_float(row["hfii_mean"]),
                "center_lat": as_float(row["center_lat"]),
                "center_lng": as_float(row["center_lng"]),
            }
        )
    return cells


def harmonized_statistics(db: Database, region_id: str | None, date_start: date | None, date_end: date | None) -> dict:
    clauses = ["TRUE"]
    params: list = []
    if region_id:
        clauses.append(_region_clause("region_id", region_id, params))
    if date_start:
        clauses.append("start_time::date >= %s")
        params.append(date_start)
    if date_end:
        clauses.append("end_time::date <= %s")
        params.append(date_end)
    where = " AND ".join(clauses)
    row = db.fetchone(
        f"""
        SELECT count(*)::int AS total_events,
               coalesce(sum(estimated_area_ha), 0) AS total_burned_area_ha,
               coalesce(avg(hfii), 0) AS avg_hfii,
               coalesce(max(hfii), 0) AS max_hfii,
               coalesce(sum(total_frp), 0) AS total_frp
        FROM pyrosharmonizer.harmonized_fire_events
        WHERE {where}
        """,
        tuple(params),
    )
    peak = db.fetchone(
        f"""
        SELECT start_time::date AS day, count(*)::int AS n
        FROM pyrosharmonizer.harmonized_fire_events
        WHERE {where}
        GROUP BY 1
        ORDER BY n DESC
        LIMIT 1
        """,
        tuple(params),
    )
    total = as_int(row["total_events"] if row else 0)
    span_days = 1
    if date_start and date_end:
        span_days = max((date_end - date_start).days + 1, 1)
    return {
        "region_id": region_id,
        "date_range": {"start": isoformat(date_start), "end": isoformat(date_end)},
        "total_events": total,
        "total_burned_area_ha": as_float(row["total_burned_area_ha"] if row else 0),
        "avg_hfii": as_float(row["avg_hfii"] if row else 0),
        "max_hfii": as_float(row["max_hfii"] if row else 0),
        "total_calibrated_energy_pj": round((as_float(row["total_frp"] if row else 0) or 0) / 1_000_000, 4),
        "daily_average_events": round(total / span_days, 2),
        "peak_day": isoformat(peak["day"]) if peak else None,
    }


def _bucket(unit: str) -> str:
    allowed = {"day": "day", "week": "week", "month": "month", "year": "year"}
    return allowed[unit]


def calendar_heatmap(db: Database, region_id: str | None, year_start: int, year_end: int, aggregation: str) -> list[dict]:
    unit = _bucket(aggregation)
    clauses = ["year BETWEEN %s AND %s"]
    params: list = [year_start, year_end]
    if region_id:
        clauses.append(_region_clause("b.region_id", region_id, params))
    where = " AND ".join(clauses)
    rows = db.fetchall(
        f"""
        SELECT date_trunc('{unit}', b.calendar_date)::date AS bucket,
               min(b.region_id::text) AS region_id,
               sum(b.harmonized_event_count)::int AS total_events,
               coalesce(sum(b.total_burned_area_est_ha), 0) AS total_area_ha,
               coalesce(avg(b.mean_hfii), 0) AS avg_hfii,
               coalesce(max(b.anomaly_index), 0) AS anomaly_zscore
        FROM pyrosharmonizer.burning_calendar_daily b
        WHERE {where}
        GROUP BY 1
        ORDER BY 1
        """,
        tuple(params),
    )
    return [_calendar_point(row) for row in rows]


def _calendar_point(row: dict) -> dict:
    zscore = as_float(row["anomaly_zscore"]) or 0
    return {
        "date": isoformat(row["bucket"]),
        "region_id": row["region_id"],
        "total_events": as_int(row["total_events"]),
        "total_area_ha": as_float(row["total_area_ha"]),
        "avg_hfii": as_float(row["avg_hfii"]),
        "anomaly_zscore": zscore,
        "is_anomaly": zscore > 2,
    }


def calendar_timeline(db: Database, region_id: str | None, aggregation: str) -> list[dict]:
    unit = _bucket(aggregation)
    modis_params: list = []
    viirs_params: list = []
    event_params: list = []
    modis_region = _raw_region("geom", region_id, modis_params)
    viirs_region = _raw_region("geom", region_id, viirs_params)
    event_region = _region_clause("region_id", region_id, event_params)
    rows = db.fetchall(
        f"""
        WITH modis AS (
          SELECT date_trunc('{unit}', acq_date) AS bucket, count(*)::int AS n
          FROM pyrosharmonizer.raw_modis_hotspots
          WHERE {modis_region}
          GROUP BY 1
        ),
        viirs AS (
          SELECT date_trunc('{unit}', acq_date) AS bucket, count(*)::int AS n
          FROM pyrosharmonizer.raw_viirs_hotspots
          WHERE {viirs_region}
          GROUP BY 1
        ),
        events AS (
          SELECT date_trunc('{unit}', start_time) AS bucket,
                 count(*)::int AS n,
                 coalesce(sum(estimated_area_ha), 0) AS area,
                 coalesce(avg(hfii), 0) AS mean_hfii
          FROM pyrosharmonizer.harmonized_fire_events
          WHERE {event_region}
          GROUP BY 1
        ),
        buckets AS (
          SELECT bucket FROM modis
          UNION SELECT bucket FROM viirs
          UNION SELECT bucket FROM events
        )
        SELECT b.bucket,
               coalesce(m.n, 0) AS modis_count,
               coalesce(v.n, 0) AS viirs_count,
               coalesce(e.n, 0) AS harmonized_count,
               coalesce(e.area, 0) AS total_area_ha,
               coalesce(e.mean_hfii, 0) AS mean_hfii
        FROM buckets b
        LEFT JOIN modis m ON m.bucket = b.bucket
        LEFT JOIN viirs v ON v.bucket = b.bucket
        LEFT JOIN events e ON e.bucket = b.bucket
        ORDER BY b.bucket
        """,
        tuple([*modis_params, *viirs_params, *event_params]),
    )
    points = []
    for row in rows:
        modis_count = as_int(row["modis_count"])
        viirs_count = as_int(row["viirs_count"])
        bucket = row["bucket"]
        period = isoformat(bucket)[:7] if aggregation == "month" else isoformat(bucket)
        if aggregation == "year" and period:
            period = period[:4]
        points.append(
            {
                "timestamp": isoformat(bucket),
                "period": period,
                "modis_count": modis_count,
                "viirs_count": viirs_count,
                "raw_sum": modis_count + viirs_count,
                "harmonized_count": as_int(row["harmonized_count"]),
                "total_area_ha": as_float(row["total_area_ha"]),
                "mean_hfii": as_float(row["mean_hfii"]),
            }
        )
    return points


def calendar_anomalies(db: Database, region_id: str | None, threshold: float) -> list[dict]:
    clauses = ["b.anomaly_index >= %s"]
    params: list = [threshold]
    if region_id:
        clauses.append(_region_clause("b.region_id", region_id, params))
    rows = db.fetchall(
        f"""
        SELECT b.calendar_date, b.region_id::text AS region_id,
               b.harmonized_event_count, b.anomaly_index, r.name AS region_name
        FROM pyrosharmonizer.burning_calendar_daily b
        JOIN pyrosharmonizer.regions r ON r.id = b.region_id
        WHERE {" AND ".join(clauses)}
        ORDER BY b.anomaly_index DESC
        LIMIT 500
        """,
        tuple(params),
    )
    items = []
    for row in rows:
        zscore = as_float(row["anomaly_index"]) or 0
        observed = as_int(row["harmonized_event_count"])
        if zscore >= 4:
            severity = "extreme"
        elif zscore >= 3:
            severity = "high"
        else:
            severity = "moderate"
        items.append(
            {
                "date": isoformat(row["calendar_date"]),
                "region_id": row["region_id"],
                "observed_events": observed,
                "expected_events": 0,
                "z_score": zscore,
                "deviation_percentage": 0,
                "severity": severity,
                "description": (
                    f"{row['region_name']} supera el umbral de anomalía "
                    f"({zscore:.2f} desviaciones) con {observed} eventos armonizados."
                ),
            }
        )
    return items


def report_metrics(db: Database, region_id: str, date_start: date, date_end: date) -> dict:
    region = get_region(db, region_id)
    stats = harmonized_statistics(db, region_id, date_start, date_end)
    timeline = calendar_timeline(db, region_id, "year")
    return {
        "region_name": region["name"] if region else region_id,
        "department": region["department"] if region else None,
        "date_start": isoformat(date_start),
        "date_end": isoformat(date_end),
        "total_events": stats["total_events"],
        "total_area_ha": stats["total_burned_area_ha"],
        "avg_hfii": stats["avg_hfii"],
        "peak_day": stats["peak_day"],
        "timeline": timeline,
    }
