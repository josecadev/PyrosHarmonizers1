import csv
import io
import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from backend.app.db import Database, get_db
from backend.app.services.filters import check_dates, parse_bbox
from backend.app.services.queries import list_events, list_modis, list_viirs
from backend.app.services.export.pdf_generator import build_pdf
from backend.app.services.queries import report_metrics
from pydantic import BaseModel

router = APIRouter(prefix="/export", tags=["export"])


class ExportPdfRequest(BaseModel):
    region_id: str
    date_start: str
    date_end: str
    report_title: str
    include_charts: bool = True
    include_map: bool = True
    include_anomalies: bool = True
    author: str | None = None
    language: str = "es"


def _attachment(filename: str) -> dict[str, str]:
    return {"Content-Disposition": f'attachment; filename="{filename}"'}


@router.get("/geojson")
def export_geojson(
    bbox: str | None = None,
    date_start: str | None = None,
    date_end: str | None = None,
    db: Database = Depends(get_db),
) -> Response:
    start, end = _dates(date_start, date_end)
    page = list_events(db, parse_bbox(bbox), start, end, None, None, 5000, 0)
    features = []
    for item in page["data"]:
        features.append(
            {
                "type": "Feature",
                "id": item["event_id"],
                "geometry": item["geometry"],
                "properties": {
                    "event_id": item["event_id"],
                    "hfii_score": item["hfii_score"],
                    "calibrated_frp_mw": item["calibrated_frp"],
                    "modis_points": item["modis_count"],
                    "viirs_points": item["viirs_count"],
                    "area_ha": item["area_ha"],
                    "date": (item["start_time"] or "")[:10],
                },
            }
        )
    body = json.dumps({"type": "FeatureCollection", "features": features})
    return Response(content=body, media_type="application/geo+json", headers=_attachment("pyrosharmonizer-events.geojson"))


@router.get("/csv")
def export_csv(
    bbox: str | None = None,
    date_start: str | None = None,
    date_end: str | None = None,
    dataset: str = Query(default="harmonized_events"),
    db: Database = Depends(get_db),
) -> Response:
    start, end = _dates(date_start, date_end)
    box = parse_bbox(bbox)
    if dataset not in {"harmonized_events", "modis_raw", "viirs_raw", "combined_all"}:
        dataset = "harmonized_events"
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    if dataset == "modis_raw":
        writer.writerow(["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp", "daynight"])
        for item in list_modis(db, box, start, end, None, None, None, 5000, 0)["data"]:
            writer.writerow([item["latitude"], item["longitude"], item["acq_date"], item["acq_time"], item["satellite"], item["confidence"], item["frp"], item["daynight"]])
        filename = "pyrosharmonizer-modis.csv"
    elif dataset == "viirs_raw":
        writer.writerow(["latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp", "bright_ti4", "daynight"])
        for item in list_viirs(db, box, start, end, None, None, None, None, None, 5000, 0)["data"]:
            writer.writerow([item["latitude"], item["longitude"], item["acq_date"], item["acq_time"], item["satellite"], item["confidence"], item["frp"], item["bright_ti4"], item["daynight"]])
        filename = "pyrosharmonizer-viirs.csv"
    else:
        writer.writerow(["event_id", "acq_date", "start_time", "end_time", "area_ha", "hfii_score", "calibrated_frp", "modis_count", "viirs_count"])
        for item in list_events(db, box, start, end, None, None, 5000, 0)["data"]:
            writer.writerow([item["event_id"], (item["start_time"] or "")[:10], item["start_time"], item["end_time"], item["area_ha"], item["hfii_score"], item["calibrated_frp"], item["modis_count"], item["viirs_count"]])
        filename = "pyrosharmonizer-events.csv"
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=_attachment(filename))


@router.post("/pdf")
def export_pdf(body: ExportPdfRequest, db: Database = Depends(get_db)) -> Response:
    start, end = _dates(body.date_start, body.date_end)
    metrics = report_metrics(db, body.region_id, start, end)
    metrics["title"] = body.report_title
    metrics["author"] = body.author
    if not body.include_charts:
        metrics["timeline"] = []
    payload = build_pdf(metrics)
    safe_name = "pyrosharmonizer-report.pdf"
    return Response(content=payload, media_type="application/pdf", headers=_attachment(safe_name))


def _dates(date_start: str | None, date_end: str | None):
    from datetime import date

    from backend.app.errors import ApiError

    start = _parse_date(date_start)
    end = _parse_date(date_end)
    if (date_start and start is None) or (date_end and end is None):
        raise ApiError(400, "Bad Request", "Las fechas deben usar el formato YYYY-MM-DD.")
    check_dates(start, end)
    return start, end


def _parse_date(value: str | None):
    from datetime import date

    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
