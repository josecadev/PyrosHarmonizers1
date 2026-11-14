import { MODE_LABEL, fmt, severity, type CalendarDay, type Kpis, type Mode, type Region } from './data'
import { kmToLatLon, type Scene } from './scene'

interface ExportCtx {
  mode: Mode
  region: Region
  year: number
  kpis: Kpis
  scene: Scene
  calendar: CalendarDay[]
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const ring = (region: Region, pts: [number, number][]) => {
  const coords = pts.map(([x, y]) => {
    const { latitude, longitude } = kmToLatLon(region, x, y)
    return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))]
  })
  return [...coords, coords[0]]
}

export function exportGeoJson({ mode, region, year, scene }: ExportCtx) {
  let features: unknown[]
  if (mode === 'raw') {
    features = scene.detections.map((d) => ({
      type: 'Feature',
      properties: {
        sensor: d.sensor,
        satellite: d.satellite,
        latitude: d.latitude,
        longitude: d.longitude,
        [d.sensor === 'VIIRS' ? 'bright_ti4' : 'brightness']: d.brightness,
        scan: d.scan,
        track: d.track,
        acq_date: d.acq_date,
        acq_time: d.acq_time,
        daynight: d.daynight,
        confidence: d.confidence,
        frp: d.frp,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          ring(region, [
            [d.x - d.scan / 2, d.y - d.track / 2],
            [d.x + d.scan / 2, d.y - d.track / 2],
            [d.x + d.scan / 2, d.y + d.track / 2],
            [d.x - d.scan / 2, d.y + d.track / 2],
          ]),
        ],
      },
    }))
  } else if (mode === 'dbscan') {
    features = scene.events.map((e) => ({
      type: 'Feature',
      properties: {
        event_id: `PH-${year}-${e.id}`,
        n_detections: e.detections,
        n_modis: e.modis,
        n_viirs: e.viirs,
        delta_t_h: Number(e.deltaT.toFixed(2)),
        frp_cal_mw: e.frpCal,
        area_km2: Number(e.areaKm2.toFixed(3)),
        acq_date: e.acq_date,
      },
      geometry: { type: 'Polygon', coordinates: [ring(region, e.hull)] },
    }))
  } else {
    features = scene.activeHexes.map((h) => ({
      type: 'Feature',
      properties: { h3_index: h.h3, resolution: 8, frp_mw: h.frp, frp_mw_km2: h.density, detections: h.count },
      geometry: { type: 'Polygon', coordinates: [ring(region, h.points)] },
    }))
  }
  download(
    `pyrosharmonizer_${region.id}_${year}_${mode}.geojson`,
    JSON.stringify({ type: 'FeatureCollection', name: MODE_LABEL[mode], crs: 'EPSG:4326', features }, null, 2),
    'application/geo+json',
  )
}

export function exportCsv({ region, year, calendar }: ExportCtx) {
  const rows = ['acq_date,doy,hfii,severity,harmonized_events,frp_cal_mw']
  for (const d of calendar) rows.push([d.iso, d.doy, d.hfii, severity(d.hfii), d.events, d.frp].join(','))
  download(`pyrosharmonizer_${region.id}_${year}_armonizado.csv`, rows.join('\n'), 'text/csv')
}

export function exportPdf({ mode, region, year, kpis, calendar }: ExportCtx) {
  const peak = calendar.reduce((a, b) => (b.hfii > a.hfii ? b : a))
  const critical = calendar.filter((d) => d.level >= 3).length
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte Ejecutivo · ${region.name} ${year}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:40px;line-height:1.5}h1{font-size:20px;margin:0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-top:28px}table{border-collapse:collapse;width:100%;font-size:13px}td{border-bottom:1px solid #e2e8f0;padding:8px 0}td:last-child{text-align:right;font-family:ui-monospace,monospace}p{font-size:13px}</style></head><body>
<h1>PyrosHarmonizer — Reporte Ejecutivo</h1><p>${region.name}, Santa Cruz, Bolivia · Temporada ${year} · ${MODE_LABEL[mode]}</p>
<h2>Indicadores armonizados</h2><table>
<tr><td>Focos crudos MODIS + VIIRS</td><td>${fmt(kpis.rawCount)}</td></tr>
<tr><td>Incendios reales unificados (ST-DBSCAN)</td><td>${fmt(kpis.events)}</td></tr>
<tr><td>Duplicación espacial eliminada</td><td>${fmt(kpis.reduction * 100, 1)}%</td></tr>
<tr><td>FRP calibrado total</td><td>${fmt(kpis.calFrp)} MW</td></tr>
<tr><td>Celdas H3 activas (res. 8)</td><td>${fmt(kpis.h3Cells)}</td></tr>
<tr><td>HFII medio de temporada</td><td>${kpis.hfii} / 100 (${severity(kpis.hfii)})</td></tr>
<tr><td>Área de huella térmica</td><td>${fmt(kpis.hullAreaKm2 * 100)} ha</td></tr>
<tr><td>Día pico</td><td>${peak.iso} · HFII ${peak.hfii}</td></tr>
<tr><td>Días con intensidad Alta/Extrema</td><td>${critical}</td></tr></table>
<h2>Recomendación operativa</h2><p>Priorizar despliegue de brigadas en la ventana julio–octubre. Los conteos crudos VIIRS sobreestiman la actividad ${fmt(kpis.dupFactor, 1)}x; utilizar exclusivamente métricas armonizadas para planificación.</p>
<p style="color:#64748b;font-size:11px">Fuente: NASA FIRMS (MODIS C6.1, VIIRS 375 m). Generado ${new Date().toISOString()}.</p>
<script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}
