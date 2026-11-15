from pathlib import Path
import psycopg
from psycopg.rows import dict_row

from backend.app.config import get_settings

__path__ = [str(Path(__file__).resolve().parent / "db")]


class Database:
    def __init__(self, url: str):
        self.url = url

    def fetchall(self, sql: str, params: tuple = ()) -> list[dict]:
        with psycopg.connect(self.url, connect_timeout=3, row_factory=dict_row) as conn:
            conn.execute("SET search_path TO pyrosharmonizer, public")
            return list(conn.execute(sql, params).fetchall())

    def fetchone(self, sql: str, params: tuple = ()) -> dict | None:
        rows = self.fetchall(sql, params)
        return rows[0] if rows else None

    def health(self) -> dict:
        try:
            row = self.fetchone(
                """
                SELECT PostGIS_Version() AS postgis_version,
                       (
                         SELECT max(end_time)
                         FROM pyrosharmonizer.ingestion_logs
                         WHERE status = 'completed'
                       ) AS last_ingestion
                """
            )
            return {
                "ok": True,
                "postgis_version": row["postgis_version"] if row else None,
                "last_ingestion": row["last_ingestion"] if row else None,
            }
        except Exception as exc:
            return {"ok": False, "error": str(exc)}


def get_db() -> Database:
    return Database(get_settings().database_url)
