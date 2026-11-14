from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def build_pdf(report: dict) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    pdf.setTitle(report.get("title") or "PyrosHarmonizer Executive Report")

    y = height - 48
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, "NASA Space Apps Challenge 2026 — PyrosHarmonizer Executive Report")
    y -= 28
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, report.get("title") or "Informe de actividad de quemas")
    y -= 22
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, y, f"Región: {report.get('region_name')} ({report.get('department') or 'Bolivia'})")
    y -= 16
    pdf.drawString(40, y, f"Periodo: {report.get('date_start')} a {report.get('date_end')}")
    y -= 28
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Métricas")
    y -= 18
    pdf.setFont("Helvetica", 10)
    lines = [
        f"Eventos armonizados: {report.get('total_events', 0)}",
        f"Hectáreas estimadas: {report.get('total_area_ha', 0)}",
        f"HFII medio: {report.get('avg_hfii', 0)}",
        f"Día pico: {report.get('peak_day') or 'sin datos'}",
    ]
    for line in lines:
        pdf.drawString(40, y, line)
        y -= 14

    y -= 16
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Serie cruda frente a serie armonizada")
    y -= 12
    _draw_series(pdf, report.get("timeline") or [], left=40, bottom=y - 160, chart_width=width - 80, chart_height=140)
    y -= 180
    pdf.setFont("Helvetica", 9)
    note = (
        "La suma cruda MODIS + VIIRS muestra el salto de detecciones desde 2012. "
        "La serie armonizada cuenta eventos, no píxeles sueltos. "
        "Un valor en cero significa que ese año todavía no tiene filas cargadas."
    )
    for chunk in _wrap(note, 95):
        pdf.drawString(40, y, chunk)
        y -= 12
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def _draw_series(pdf: canvas.Canvas, timeline: list[dict], left: float, bottom: float, chart_width: float, chart_height: float) -> None:
    pdf.setStrokeColorRGB(0.7, 0.7, 0.7)
    pdf.rect(left, bottom, chart_width, chart_height, stroke=1, fill=0)
    if not timeline:
        pdf.setFillColorRGB(0.3, 0.3, 0.3)
        pdf.setFont("Helvetica", 9)
        pdf.drawString(left + 12, bottom + chart_height / 2, "Sin puntos en la serie. El gráfico se llena al cargar FIRMS.")
        return
    raw_max = max((point["raw_sum"] for point in timeline), default=1) or 1
    harm_max = max((point["harmonized_count"] for point in timeline), default=1) or 1
    peak = max(raw_max, harm_max)
    step = chart_width / max(len(timeline) - 1, 1)

    def xy(index: int, value: float) -> tuple[float, float]:
        x = left + index * step
        y = bottom + (value / peak) * (chart_height - 16)
        return x, y

    pdf.setStrokeColorRGB(0.75, 0.22, 0.17)
    _polyline(pdf, [xy(i, point["raw_sum"]) for i, point in enumerate(timeline)])
    pdf.setStrokeColorRGB(0.12, 0.35, 0.6)
    _polyline(pdf, [xy(i, point["harmonized_count"]) for i, point in enumerate(timeline)])
    pdf.setFillColorRGB(0.2, 0.2, 0.2)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(left, bottom - 14, "Rojo: suma cruda MODIS+VIIRS. Azul: eventos armonizados.")


def _polyline(pdf: canvas.Canvas, points: list[tuple[float, float]]) -> None:
    if len(points) == 1:
        x, y = points[0]
        pdf.circle(x, y, 2, stroke=1, fill=1)
        return
    path = pdf.beginPath()
    path.moveTo(points[0][0], points[0][1])
    for x, y in points[1:]:
        path.lineTo(x, y)
    pdf.drawPath(path, stroke=1, fill=0)


def _wrap(text: str, size: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = word if not current else f"{current} {word}"
        if len(trial) > size:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines
