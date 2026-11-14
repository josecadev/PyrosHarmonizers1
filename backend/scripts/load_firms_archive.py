"""CLI Utility for Bulk Ingestion of NASA FIRMS Archive CSV Files.

Usage:
  python backend/scripts/load_firms_archive.py --file data/modis_2024_bolivia.csv
  python backend/scripts/load_firms_archive.py --file data/viirs_2024_bolivia.csv --chiquitania-only
  python backend/scripts/load_firms_archive.py --dir data/archive/
"""

import sys
import argparse
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.db.session import SessionLocal, check_db_connection
from app.services.ingestion.firms_csv import FirmsCsvIngestionService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Bulk Load NASA FIRMS CSV Archives into PostGIS")
    parser.add_argument("--file", type=str, help="Path to single CSV archive file")
    parser.add_argument("--dir", type=str, help="Directory containing multiple CSV archive files")
    parser.add_argument("--sensor", type=str, choices=["MODIS", "VIIRS"], default=None, help="Force sensor type")
    parser.add_argument("--chunk-size", type=int, default=20000, help="Row chunk size for batch processing")
    parser.add_argument("--no-clean", action="store_true", help="Disable quality filtering (MODIS < 30, VIIRS low)")
    parser.add_argument("--chiquitania-only", action="store_true", help="Clip coordinates strictly to Chiquitanía BBOX")
    parser.add_argument("--bbox", type=str, default=None, help="Custom BBOX 'min_lon,min_lat,max_lon,max_lat'")
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate without database write")
    args = parser.parse_args()

    if not args.file and not args.dir:
        parser.error("Either --file or --dir must be provided.")

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

    logger.info(f"Found {len(files_to_process)} file(s) to process.")
    for f in files_to_process:
        try:
            logger.info(f"--- Processing: {f.name} ---")
            summary = ingestor.load_csv_file(
                file_path=str(f),
                sensor_type=args.sensor,
                chunk_size=args.chunk_size,
                apply_cleaning=not args.no_clean,
                bbox=bbox,
            )
            print(f"Summary for {f.name}: {summary}")
        except Exception as e:
            logger.error(f"Failed processing {f.name}: {e}")

    if db:
        db.close()


if __name__ == "__main__":
    main()
