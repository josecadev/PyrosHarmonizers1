from fastapi.testclient import TestClient

from backend.app.db import get_db
from backend.app.main import app


class DownDatabase:
    def health(self):
        return {"ok": False, "error": "connection refused"}


class UpDatabase:
    def health(self):
        return {"ok": True, "postgis_version": "3.4.2", "last_ingestion": None}


def setup_function():
    app.dependency_overrides.clear()


def teardown_function():
    app.dependency_overrides.clear()


def test_docs_available():
    client = TestClient(app)
    response = client.get("/docs")
    assert response.status_code == 200
    spec = client.get("/openapi.json")
    assert spec.status_code == 200
    assert "/api/v1/hotspots/modis" in spec.json()["paths"]
    assert "/api/v1/export/pdf" in spec.json()["paths"]


def test_health_without_database():
    app.dependency_overrides[get_db] = lambda: DownDatabase()
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 503
    assert response.json()["error"] == "Service Unavailable"


def test_health_with_database():
    app.dependency_overrides[get_db] = lambda: UpDatabase()
    response = TestClient(app).get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["db_connected"] is True
    assert body["postgis_version"] == "3.4.2"


def test_invalid_bbox_is_400():
    response = TestClient(app).get("/api/v1/hotspots/modis", params={"bbox": "no-es-un-bbox"})
    assert response.status_code == 400
    assert "bbox" in response.json()["message"]


def test_regions_list(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.regions.queries.list_regions",
        lambda db, limit, offset: [{"id": "b200", "name": "San Ignacio de Velasco", "region_type": "municipality"}],
    )
    response = TestClient(app).get("/api/v1/regions")
    assert response.status_code == 200
    assert response.json()[0]["name"] == "San Ignacio de Velasco"


def test_missing_region_is_404(monkeypatch):
    monkeypatch.setattr("backend.app.api.regions.queries.get_region", lambda db, region_id: None)
    response = TestClient(app).get("/api/v1/regions/no-existe")
    assert response.status_code == 404


def test_modis_empty_page(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.hotspots.queries.list_modis",
        lambda *args, **kwargs: {"total": 0, "limit": 100, "offset": 0, "data": []},
    )
    response = TestClient(app).get("/api/v1/hotspots/modis", params={"bbox": "-63.5,-19.5,-57.5,-14.0"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["data"] == []


def test_modis_geojson(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.hotspots.queries.list_modis",
        lambda *args, **kwargs: {
            "total": 1,
            "limit": 100,
            "offset": 0,
            "data": [{"latitude": -16.3, "longitude": -60.9, "geometry": {"type": "Point", "coordinates": [-60.9, -16.3]}}],
        },
    )
    response = TestClient(app).get("/api/v1/hotspots/modis", headers={"Accept": "application/geo+json"})
    assert response.status_code == 200
    assert response.json()["type"] == "FeatureCollection"
    assert response.json()["features"][0]["geometry"]["type"] == "Point"


def test_compare_empty(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.hotspots.queries.compare_hotspots",
        lambda *args, **kwargs: {
            "modis_raw_count": 0,
            "viirs_raw_count": 0,
            "harmonized_events_count": 0,
            "effect_2012_bias_detected": False,
            "analysis_summary": "No hay detecciones",
        },
    )
    response = TestClient(app).get("/api/v1/hotspots/compare")
    assert response.status_code == 200
    assert response.json()["modis_raw_count"] == 0


def test_harmonized_events_empty(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.harmonized.queries.list_events",
        lambda *args, **kwargs: {"total": 0, "limit": 100, "offset": 0, "data": []},
    )
    response = TestClient(app).get("/api/v1/harmonized/events")
    assert response.status_code == 200
    assert response.json()["data"] == []


def test_calendar_timeline_empty(monkeypatch):
    monkeypatch.setattr("backend.app.api.calendar.queries.calendar_timeline", lambda *args, **kwargs: [])
    response = TestClient(app).get("/api/v1/calendar/timeline")
    assert response.status_code == 200
    assert response.json() == []


def test_export_geojson_attachment(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.export.list_events",
        lambda *args, **kwargs: {"total": 0, "limit": 5000, "offset": 0, "data": []},
    )
    response = TestClient(app).get("/api/v1/export/geojson")
    assert response.status_code == 200
    assert "attachment;" in response.headers["content-disposition"]
    assert response.json()["type"] == "FeatureCollection"


def test_export_csv_attachment(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.export.list_events",
        lambda *args, **kwargs: {"total": 0, "limit": 5000, "offset": 0, "data": []},
    )
    response = TestClient(app).get("/api/v1/export/csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "event_id" in response.text


def test_export_pdf(monkeypatch):
    monkeypatch.setattr(
        "backend.app.api.export.report_metrics",
        lambda *args, **kwargs: {
            "region_name": "San Ignacio de Velasco",
            "department": "Santa Cruz",
            "date_start": "2024-08-01",
            "date_end": "2024-08-31",
            "total_events": 0,
            "total_area_ha": 0,
            "avg_hfii": 0,
            "peak_day": None,
            "timeline": [{"raw_sum": 12, "harmonized_count": 3}],
        },
    )
    response = TestClient(app).post(
        "/api/v1/export/pdf",
        json={
            "region_id": "b2000000-0000-0000-0000-000000000001",
            "date_start": "2024-08-01",
            "date_end": "2024-08-31",
            "report_title": "Informe Chiquitanía",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
    assert "attachment;" in response.headers["content-disposition"]
