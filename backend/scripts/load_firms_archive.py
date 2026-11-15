"""CLI Utility for Bulk Ingestion of NASA FIRMS Archive CSV Files & PostGIS Harmonization.

Usage:
  # Automatic discovery of CSVs in ./datos (or ./data) + PostGIS harmonization:
  python backend/scripts/load_firms_archive.py

  # Explicit file or directory:
  python backend/scripts/load_firms_archive.py --dir datos --chiquitania-only
  python backend/scripts/load_firms_archive.py --file datos/fire_archive_M-C61_849637.csv
"""

import sys
import argparse
import logging
from pathlib import Path
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
repo_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.session import SessionLocal, check_db_connection
from app.services.ingestion.firms_csv import FirmsCsvIngestionService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def populate_harmonized_tables(db_session) -> None:
    """Populates h3_daily_cells, harmonized_fire_events, and burning_calendar_daily from raw hotspots."""
    logger.info("Running PostGIS Spatio-Temporal Harmonization & Calendar Aggregation...")
    try:
        db_session.execute(text("SET search_path TO pyrosharmonizer, public"))

        # 1. Populate h3_daily_cells (Resolution 8 and Resolution 7)
        db_session.execute(
            text("""
            WITH combined_points AS (
                SELECT h3_r8 AS h3_idx, 8 AS res, acq_date,
                       1 AS is_modis, 0 AS is_viirs,
                       COALESCE(frp, 0)::numeric AS frp_m, 0::numeric AS frp_v,
                       scan::numeric, track::numeric, (daynight::text = 'N') AS is_night,
                       geom, pixel_geom
                FROM pyrosharmonizer.raw_modis_hotspots
                WHERE h3_r8 IS NOT NULL
                UNION ALL
                SELECT h3_r8 AS h3_idx, 8 AS res, acq_date,
                       0 AS is_modis, 1 AS is_viirs,
                       0::numeric AS frp_m, COALESCE(frp, 0)::numeric AS frp_v,
                       scan::numeric, track::numeric, (daynight::text = 'N') AS is_night,
                       geom, pixel_geom
                FROM pyrosharmonizer.raw_viirs_hotspots
                WHERE h3_r8 IS NOT NULL
            )
            INSERT INTO pyrosharmonizer.h3_daily_cells (
                h3_index, resolution, cell_date,
                modis_count, viirs_count, total_hotspots,
                total_frp_modis, total_frp_viirs,
                hfii_mean, hfii_max, geom
            )
            SELECT
                h3_idx,
                res,
                acq_date,
                SUM(is_modis)::int AS modis_count,
                SUM(is_viirs)::int AS viirs_count,
                COUNT(*)::int AS total_hotspots,
                ROUND(SUM(frp_m), 2) AS total_frp_modis,
                ROUND(SUM(frp_v), 2) AS total_frp_viirs,
                ROUND(AVG(pyrosharmonizer.fn_calculate_hfii(NULLIF(frp_m, 0), NULLIF(frp_v, 0), scan, track, is_night)), 3) AS hfii_mean,
                ROUND(MAX(pyrosharmonizer.fn_calculate_hfii(NULLIF(frp_m, 0), NULLIF(frp_v, 0), scan, track, is_night)), 3) AS hfii_max,
                ST_Envelope(ST_Buffer(ST_Centroid(ST_Collect(geom)), 0.0045))::geometry(Polygon, 4326) AS geom
            FROM combined_points
            GROUP BY h3_idx, res, acq_date
            ON CONFLICT (h3_index, cell_date) DO UPDATE SET
                modis_count = EXCLUDED.modis_count,
                viirs_count = EXCLUDED.viirs_count,
                total_hotspots = EXCLUDED.total_hotspots,
                total_frp_modis = EXCLUDED.total_frp_modis,
                total_frp_viirs = EXCLUDED.total_frp_viirs,
                hfii_mean = EXCLUDED.hfii_mean,
                hfii_max = EXCLUDED.hfii_max,
                geom = EXCLUDED.geom;
            """)
        )
        db_session.commit()
        logger.info("  [OK] h3_daily_cells populated.")

        # 2. Populate harmonized_fire_events grouped by (h3_r7, acq_date) cluster cells
        db_session.execute(
            text("""
            WITH raw_union AS (
                SELECT h3_r7, h3_r8, acq_date,
                       COALESCE(acq_datetime, acq_date::timestamptz) AS dt,
                       1 AS is_modis, 0 AS is_viirs,
                       COALESCE(frp, 0)::numeric AS frp_val,
                       COALESCE(frp, 0)::numeric AS frp_m, 0::numeric AS frp_v,
                       scan::numeric, track::numeric, (daynight::text = 'N') AS is_night,
                       confidence::numeric AS conf_score,
                       geom, pixel_geom
                FROM pyrosharmonizer.raw_modis_hotspots
                WHERE h3_r7 IS NOT NULL
                UNION ALL
                SELECT h3_r7, h3_r8, acq_date,
                       COALESCE(acq_datetime, acq_date::timestamptz) AS dt,
                       0 AS is_modis, 1 AS is_viirs,
                       COALESCE(frp, 0)::numeric AS frp_val,
                       0::numeric AS frp_m, COALESCE(frp, 0)::numeric AS frp_v,
                       scan::numeric, track::numeric, (daynight::text = 'N') AS is_night,
                       CASE confidence::text
                           WHEN 'high' THEN 92.0
                           WHEN 'nominal' THEN 75.0
                           ELSE 35.0
                       END AS conf_score,
                       geom, pixel_geom
                FROM pyrosharmonizer.raw_viirs_hotspots
                WHERE h3_r7 IS NOT NULL
            ),
            clustered AS (
                SELECT
                    'EVT_' || TO_CHAR(acq_date, 'YYYYMMDD') || '_' || h3_r7 AS event_code,
                    MIN(dt) AS start_time,
                    MAX(dt) + INTERVAL '3 hours' AS end_time,
                    SUM(is_modis)::int AS modis_count,
                    SUM(is_viirs)::int AS viirs_count,
                    ROUND(SUM(frp_val), 2) AS total_frp,
                    ROUND(AVG(frp_val), 2) AS mean_frp,
                    ROUND(MAX(frp_val), 2) AS max_frp,
                    ROUND(
                        pyrosharmonizer.fn_calculate_hfii(
                            NULLIF(AVG(NULLIF(frp_m, 0)), 0)::numeric,
                            NULLIF(AVG(NULLIF(frp_v, 0)), 0)::numeric,
                            AVG(scan)::numeric,
                            AVG(track)::numeric,
                            BOOL_OR(is_night)
                        ),
                        3
                    ) AS hfii,
                    ROUND(GREATEST((SUM(is_modis) * 65.0) + (SUM(is_viirs) * 14.06), 14.06), 2) AS estimated_area_ha,
                    ROUND(AVG(conf_score), 2) AS confidence_score,
                    COALESCE(
                        ST_ConvexHull(ST_Collect(pixel_geom)),
                        ST_Buffer(ST_Centroid(ST_Collect(geom)), 0.006)
                    )::geometry(Polygon, 4326) AS convex_hull,
                    ST_Centroid(ST_Collect(geom))::geometry(Point, 4326) AS centroid,
                    ARRAY_AGG(DISTINCT h3_r8) AS h3_indices
                FROM raw_union
                GROUP BY acq_date, h3_r7
            )
            INSERT INTO pyrosharmonizer.harmonized_fire_events (
                event_code, start_time, end_time,
                modis_count, viirs_count,
                total_frp, mean_frp, max_frp, hfii,
                estimated_area_ha, cluster_algorithm,
                eps_spatial_m, eps_temporal_hours,
                confidence_score, convex_hull, centroid, h3_indices, region_id
            )
            SELECT
                c.event_code, c.start_time, c.end_time,
                c.modis_count, c.viirs_count,
                c.total_frp, c.mean_frp, c.max_frp, c.hfii,
                c.estimated_area_ha, 'stdbscan'::pyrosharmonizer.cluster_method,
                750.0, 4.0,
                c.confidence_score, c.convex_hull, c.centroid, c.h3_indices,
                COALESCE(
                    (
                        SELECT r.id FROM pyrosharmonizer.regions r
                        WHERE r.type IN ('municipality', 'protected_area')
                          AND ST_Intersects(r.geometry, c.centroid)
                        ORDER BY r.area_km2 ASC
                        LIMIT 1
                    ),
                    'a1000000-0000-0000-0000-000000000001'::uuid
                ) AS region_id
            FROM clustered c
            ON CONFLICT (event_code) DO UPDATE SET
                modis_count = EXCLUDED.modis_count,
                viirs_count = EXCLUDED.viirs_count,
                total_frp = EXCLUDED.total_frp,
                mean_frp = EXCLUDED.mean_frp,
                max_frp = EXCLUDED.max_frp,
                hfii = EXCLUDED.hfii,
                estimated_area_ha = EXCLUDED.estimated_area_ha,
                convex_hull = EXCLUDED.convex_hull,
                centroid = EXCLUDED.centroid,
                region_id = EXCLUDED.region_id;
            """)
        )
        db_session.commit()
        logger.info("  [OK] harmonized_fire_events populated.")

        # 3. Populate burning_calendar_daily per region and date
        db_session.execute(
            text("""
            WITH daily_agg AS (
                SELECT
                    region_id,
                    start_time::date AS calendar_date,
                    EXTRACT(YEAR FROM start_time::date)::smallint AS year,
                    EXTRACT(MONTH FROM start_time::date)::smallint AS month,
                    EXTRACT(DOY FROM start_time::date)::smallint AS day_of_year,
                    SUM(modis_count)::int AS raw_modis_count,
                    SUM(viirs_count)::int AS raw_viirs_count,
                    COUNT(*)::int AS harmonized_event_count,
                    ROUND(SUM(estimated_area_ha), 2) AS total_burned_area_est_ha,
                    ROUND(AVG(hfii), 3) AS mean_hfii,
                    ROUND(MAX(hfii), 3) AS max_hfii
                FROM pyrosharmonizer.harmonized_fire_events
                WHERE region_id IS NOT NULL
                GROUP BY region_id, start_time::date
            ),
            stats_by_region AS (
                SELECT
                    region_id,
                    AVG(harmonized_event_count::numeric) AS avg_ev,
                    GREATEST(STDDEV_POP(harmonized_event_count::numeric), 1.0) AS std_ev
                FROM daily_agg
                GROUP BY region_id
            )
            INSERT INTO pyrosharmonizer.burning_calendar_daily (
                region_id, calendar_date, year, month, day_of_year,
                raw_modis_count, raw_viirs_count, harmonized_event_count,
                total_burned_area_est_ha, mean_hfii, max_hfii,
                fire_regime_classification, anomaly_index
            )
            SELECT
                d.region_id, d.calendar_date, d.year, d.month, d.day_of_year,
                d.raw_modis_count, d.raw_viirs_count, d.harmonized_event_count,
                d.total_burned_area_est_ha, d.mean_hfii, d.max_hfii,
                CASE
                    WHEN (d.harmonized_event_count - s.avg_ev) / s.std_ev >= 3.0 THEN 'Extreme Anomaly'
                    WHEN (d.harmonized_event_count - s.avg_ev) / s.std_ev >= 2.0 THEN 'High Activity'
                    WHEN d.harmonized_event_count >= 5 THEN 'Moderate Activity'
                    ELSE 'Normal'
                END AS fire_regime_classification,
                ROUND(((d.harmonized_event_count - s.avg_ev) / s.std_ev)::numeric, 3) AS anomaly_index
            FROM daily_agg d
            JOIN stats_by_region s ON s.region_id = d.region_id
            ON CONFLICT (region_id, calendar_date) DO UPDATE SET
                raw_modis_count = EXCLUDED.raw_modis_count,
                raw_viirs_count = EXCLUDED.raw_viirs_count,
                harmonized_event_count = EXCLUDED.harmonized_event_count,
                total_burned_area_est_ha = EXCLUDED.total_burned_area_est_ha,
                mean_hfii = EXCLUDED.mean_hfii,
                max_hfii = EXCLUDED.max_hfii,
                fire_regime_classification = EXCLUDED.fire_regime_classification,
                anomaly_index = EXCLUDED.anomaly_index;
            """)
        )
        db_session.commit()
        logger.info("  [OK] burning_calendar_daily populated.")

    except Exception as exc:
        db_session.rollback()
        logger.error(f"Harmonization SQL step failed: {exc}")


def resolve_default_csv_directory() -> Path | None:
    """Finds the default directory containing NASA FIRMS CSV archives (datos/ or data/)."""
    candidates = [
        repo_root / "datos",
        backend_dir / "datos",
        Path("datos"),
        repo_root / "data",
        backend_dir / "data",
        Path("data"),
    ]
    for candidate in candidates:
        if candidate.exists() and list(candidate.glob("*.csv")):
            return candidate
    return None


def main():
    parser = argparse.ArgumentParser(description="Bulk Load NASA FIRMS CSV Archives into PostGIS")
    parser.add_argument("--file", type=str, help="Path to single CSV archive file")
    parser.add_argument("--dir", type=str, help="Directory containing multiple CSV archive files")
    parser.add_argument("--sensor", type=str, choices=["MODIS", "VIIRS"], default=None, help="Force sensor type")
    parser.add_argument("--chunk-size", type=int, default=20000, help="Row chunk size for batch processing")
    parser.add_argument("--no-clean", action="store_true", help="Disable quality filtering (MODIS < 30, VIIRS low)")
    parser.add_argument("--chiquitania-only", action="store_true", help="Clip coordinates strictly to Chiquitanía BBOX")
    parser.add_argument("--all-bolivia", action="store_true", help="Load entire Bolivia extent without clipping to Chiquitanía")
    parser.add_argument("--bbox", type=str, default=None, help="Custom BBOX 'min_lon,min_lat,max_lon,max_lat'")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without database write")
    parser.add_argument("--skip-harmonize", action="store_true", help="Skip post-ingestion SQL harmonization step")
    parser.add_argument("--max-rows", type=int, default=40000, help="Max rows to read per CSV file (0 for unlimited)")
    parser.add_argument("--all-rows", action="store_true", help="Ingest all rows in each CSV without limit")
    args = parser.parse_args()

    # Auto-discover CSV directory if neither --file nor --dir was specified
    if not args.file and not args.dir:
        default_dir = resolve_default_csv_directory()
        if default_dir is not None:
            args.dir = str(default_dir)
            if not args.all_bolivia and not args.bbox:
                args.chiquitania_only = True
            logger.info(f"Auto-discovered CSV directory: {args.dir} (Chiquitanía BBOX filter={args.chiquitania_only})")
        else:
            parser.error("No CSV files found in ./datos or ./data. Provide --file or --dir explicitly.")

    # Determine Bounding Box
    bbox = None
    if args.chiquitania_only:
        bbox = settings.chiquitania_bbox_tuple
        logger.info(f"Filtering to Chiquitania BBOX: {bbox}")
    elif args.bbox:
        parts = [float(x.strip()) for x in args.bbox.split(",")]
        bbox = (parts[0], parts[1], parts[2], parts[3])
        logger.info(f"Filtering to custom BBOX: {bbox}")

    # Database Session
    db = None
    if not args.dry_run:
        if check_db_connection():
            db = SessionLocal()
            logger.info("Connected to PostGIS database.")
        else:
            logger.warning("PostgreSQL/PostGIS is currently unreachable. Operating in DRY-RUN mode.")

    ingestor = FirmsCsvIngestionService(db_session=db)

    # Collect files
    files_to_process = []
    if args.file:
        files_to_process.append(Path(args.file))
    elif args.dir:
        d = Path(args.dir)
        files_to_process.extend(sorted(d.glob("*.csv")))

    if not files_to_process:
        logger.error("No CSV files found to process.")
        sys.exit(1)

    max_rows = None if (args.all_rows or args.max_rows <= 0) else args.max_rows
    logger.info(f"Found {len(files_to_process)} file(s) to process (max_rows_per_file={max_rows or 'ALL'}).")
    for f in files_to_process:
        try:
            logger.info(f"--- Processing: {f.name} ---")
            summary = ingestor.load_csv_file(
                file_path=str(f),
                sensor_type=args.sensor,
                chunk_size=args.chunk_size,
                apply_cleaning=not args.no_clean,
                bbox=bbox,
                max_rows=max_rows,
            )
            print(f"Summary for {f.name}: {summary}")
        except Exception as e:
            logger.error(f"Failed processing {f.name}: {e}")

    if db and not args.skip_harmonize:
        populate_harmonized_tables(db)

    if db:
        db.close()


if __name__ == "__main__":
    main()
