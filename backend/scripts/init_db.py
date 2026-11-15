"""Database Initialization & PostGIS Schema Migration Script for PyrosHarmonizer.

Creates extensions, dedicated schema, master tables, declarative annual partitions,
spatial GiST indexes, BRIN temporal indexes, and loads administrative seeds for
Santa Cruz and Chiquitania municipalities.
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def init_database(db_url: str = None, schema_file_path: str = None) -> bool:
    raw_url = db_url or settings.DATABASE_URL
    target_url = raw_url
    if target_url.startswith("postgresql://"):
        target_url = target_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    logger.info(f"Targeting Database: {target_url.split('@')[-1] if '@' in target_url else target_url}")

    repo_root = Path(__file__).resolve().parent.parent.parent
    if schema_file_path:
        sql_file = Path(schema_file_path)
    elif (repo_root / "docs" / "pyrosharmonizer-schema.sql").exists():
        sql_file = repo_root / "docs" / "pyrosharmonizer-schema.sql"
    else:
        sql_file = backend_dir / "docs" / "pyrosharmonizer-schema.sql"

    if not sql_file.exists():
        logger.error(f"Schema SQL file not found at: {sql_file}")
        return False

    logger.info(f"Using SQL schema file: {sql_file}")

    try:
        engine = create_engine(target_url, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            logger.info("Database connection established successfully.")

            # Read full SQL schema
            with open(sql_file, "r", encoding="utf-8") as f:
                full_sql = f.read()

            logger.info("Executing PostGIS schema script (extensions, tables, partitions, indexes, seeds)...")
            # Execute script via raw psycopg2 cursor to handle multi-statement scripts and DDL
            raw_conn = conn.connection.dbapi_connection
            with raw_conn.cursor() as cur:
                cur.execute(full_sql)
            logger.info("Schema execution completed successfully!")

            # Verify tables and counts
            logger.info("Verifying created schema elements...")
            regions_count = conn.execute(
                text("SELECT count(*) FROM pyrosharmonizer.regions")
            ).scalar()
            logger.info(f"  [OK] Seeded regions: {regions_count}")

            modis_partitions = conn.execute(
                text("""
                SELECT count(*) 
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                WHERE parent.relname = 'raw_modis_hotspots'
                """)
            ).scalar()
            logger.info(f"  [OK] raw_modis_hotspots partitions: {modis_partitions} (2000-2027)")

            viirs_partitions = conn.execute(
                text("""
                SELECT count(*) 
                FROM pg_inherits
                JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
                WHERE parent.relname = 'raw_viirs_hotspots'
                """)
            ).scalar()
            logger.info(f"  [OK] raw_viirs_hotspots partitions: {viirs_partitions} (2012-2027)")

            # Check GiST indexes
            indexes = conn.execute(
                text("""
                SELECT indexname FROM pg_indexes 
                WHERE schemaname = 'pyrosharmonizer' 
                  AND indexdef LIKE '%USING gist%'
                """)
            ).fetchall()
            logger.info(f"  [OK] Spatial GiST indexes created: {len(indexes)}")
            for idx in indexes:
                logger.info(f"       - {idx[0]}")

            return True

    except Exception as exc:
        logger.error(f"Database initialization failed: {exc}")
        logger.warning(
            "\n[TIP] If PostgreSQL/PostGIS is not running locally, you can start it with:\n"
            "  docker run --name pyros-postgis -e POSTGRES_USER=pyros_user "
            "-e POSTGRES_PASSWORD=pyros_password -e POSTGRES_DB=pyrosharmonizer_db "
            "-p 5432:5432 -d postgis/postgis:16-3.4\n"
            "Or point DATABASE_URL to a cloud instance (Supabase/Railway)."
        )
        return False


def main():
    parser = argparse.ArgumentParser(description="Initialize PyrosHarmonizer PostGIS Schema")
    parser.add_argument("--database-url", type=str, default=None, help="Custom PostgreSQL database URL")
    parser.add_argument("--schema-file", type=str, default=None, help="Path to pyrosharmonizer-schema.sql")
    args = parser.parse_args()

    success = init_database(db_url=args.database_url, schema_file_path=args.schema_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
