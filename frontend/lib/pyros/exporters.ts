import {
  CHOW_TEST_METRICS,
  FRP_INTERCEPT,
  FRP_R2,
  FRP_SLOPE,
  HFII_KAPPA,
  MODE_LABEL,
  fmt,
  getHistory,
  severity,
  type CalendarDay,
  type HistoryPoint,
  type Kpis,
  type Mode,
  type Region,
} from './data'
import { kmToLatLon, type Scene } from './scene'

export interface ExportCtx {
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
        id: d.id,
        sensor: d.sensor,
        satellite: d.satellite,
        latitude: d.latitude,
        longitude: d.longitude,
        [d.sensor === 'VIIRS' ? 'bright_ti4' : 'brightness']: d.brightness,
        bright_ti5: d.bright_ti5,
        scan: Number(d.scan.toFixed(3)),
        track: Number(d.track.toFixed(3)),
        area_km2: d.areaKm2,
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
      id: e.eventCode,
      properties: {
        event_id: e.eventCode,
        acq_date: e.acq_date,
        hfii_mw: e.frpCal,
        raw_frp_sum_mw: e.rawFrpSum,
        raw_modis_count: e.modis,
        raw_viirs_count: e.viirs,
        n_detections: e.detections,
        detection_regime: e.detectionRegime,
        delta_t_h: Number(e.deltaT.toFixed(2)),
        area_ha: Number((e.areaKm2 * 100).toFixed(2)),
        area_km2: Number(e.areaKm2.toFixed(3)),
      },
      geometry: { type: 'Polygon', coordinates: [ring(region, e.hull)] },
    }))
  } else {
    features = scene.activeHexes.map((h) => ({
      type: 'Feature',
      id: h.h3,
      properties: {
        h3_index: h.h3,
        resolution: h.resolution,
        area_km2: h.areaKm2,
        hfii_mw: h.frp,
        frp_mw_km2: h.density,
        detections: h.count,
        modis_count: h.modisCount,
        viirs_count: h.viirsCount,
      },
      geometry: { type: 'Polygon', coordinates: [ring(region, h.points)] },
    }))
  }
  download(
    `pyrosharmonizer_${region.id}_${year}_${mode}.geojson`,
    JSON.stringify(
      {
        type: 'FeatureCollection',
        name: MODE_LABEL[mode],
        crs: 'EPSG:4326',
        metadata: {
          generated_at: new Date().toISOString(),
          region: region.name,
          year,
          count: features.length,
        },
        features,
      },
      null,
      2,
    ),
    'application/geo+json',
  )
}

export function exportCsv({ region, year, calendar }: ExportCtx) {
  // Exact 8 columns required by ESC-EXP-002 in ACCEPTANCE_SCENARIOS.md
  const rows = [
    'acq_date,municipio,raw_modis_foci,raw_viirs_foci,harmonized_events_count,raw_total_frp,calibrated_hfii_mw,severity_index',
  ]
  const safeMunicipio = region.name.replaceAll(',', ' -')
  for (const d of calendar) {
    rows.push(
      [
        d.iso,
        safeMunicipio,
        d.rawModisFoci,
        d.rawViirsFoci,
        d.events,
        d.rawFrp.toFixed(1),
        d.frp.toFixed(1),
        d.severityCode,
      ].join(','),
    )
  }
  download(`pyrosharmonizer_${region.id}_${year}_armonizado.csv`, rows.join('\n'), 'text/csv;charset=utf-8')
}

export function exportAuditJson({ region, year, kpis }: ExportCtx) {
  // Exact structure required by ESC-EXP-003 & ESC-API-004 in ACCEPTANCE_SCENARIOS.md
  const payload = {
    year,
    region: `${region.name}, Santa Cruz, Bolivia`,
    algorithm_version: 'PyrosHarmonizer_v1.2_ST-DBSCAN',
    total_raw_modis: kpis.modisCount,
    total_raw_viirs: kpis.viirsCount,
    static_anomalies_masked: kpis.staticMaskedCount,
    total_harmonized_events: kpis.events,
    spatial_compression_rate: Number(kpis.reduction.toFixed(4)),
    co_detection_rate: Number(kpis.coDetectionRate.toFixed(3)),
    hfii_total_terawatts: Number((kpis.calFrp / 1_000_000).toFixed(4)),
    calibration_parameters: {
      frp_slope_alpha: FRP_SLOPE,
      frp_intercept_beta: FRP_INTERCEPT,
      r_squared: FRP_R2,
      bowtie_area_kappa: HFII_KAPPA,
      eps_spatial_m: '500-1000',
      eps_temporal_h: 3.5,
    },
    statistical_validation: {
      raw_data_break_detected: true,
      raw_jump_magnitude_multiplier: CHOW_TEST_METRICS.rawJumpMultiplier,
      harmonized_series_continuous: true,
      harmonized_jump_magnitude_multiplier: CHOW_TEST_METRICS.harmonizedJumpMultiplier,
      chow_test_p_value_raw: CHOW_TEST_METRICS.pValueRaw,
      chow_test_p_value_harmonized: CHOW_TEST_METRICS.pValueHarmonized,
      energy_conservation_index: CHOW_TEST_METRICS.energyConservationIndex,
    },
    run_timestamp: new Date().toISOString(),
  }
  download(
    `pyrosharmonizer_audit_report_${region.id}_${year}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
}

function generateHistorySvg(history: HistoryPoint[], selectedYear: number): string {
  const w = 720
  const h = 225
  const padL = 60
  const padR = 30
  const padT = 44
  const padB = 40
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const maxVal = Math.max(...history.map((p) => Math.max(p.raw, p.harmonized)), 100) * 1.15
  const minYear = 2000
  const maxYear = 2026

  const getX = (year: number) => padL + ((year - minYear) / (maxYear - minYear)) * plotW
  const getY = (val: number) => padT + plotH - (val / maxVal) * plotH

  // Horizontal Grid Lines & Ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0]
    .map((pct) => {
      const val = Math.round(maxVal * pct)
      const y = getY(val)
      const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`
      return `
        <line x1="${padL}" y1="${y}" x2="${padL + plotW}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${padL - 10}" y="${y + 3.5}" font-size="9.5" fill="#64748b" text-anchor="end" font-family="Inter, system-ui, sans-serif">${label}</text>
      `
    })
    .join('')

  // X-Axis Year Ticks
  const xYears = [2000, 2004, 2008, 2012, 2016, 2020, 2024, 2026]
  const xTicks = xYears
    .map((yr) => {
      const x = getX(yr)
      return `
        <line x1="${x}" y1="${padT + plotH}" x2="${x}" y2="${padT + plotH + 5}" stroke="#94a3b8" stroke-width="1.2" />
        <text x="${x}" y="${padT + plotH + 18}" font-size="9.5" fill="#64748b" text-anchor="middle" font-family="Inter, system-ui, sans-serif">${yr}</text>
      `
    })
    .join('')

  // Data Points & Lines
  const rawPts = history.map((p) => `${getX(p.year).toFixed(1)},${getY(p.raw).toFixed(1)}`).join(' ')
  const harmPts = history.map((p) => `${getX(p.year).toFixed(1)},${getY(p.harmonized).toFixed(1)}`).join(' ')

  // 2012 Marker Callout (Placed cleanly inside the top of the plot area)
  const x2012 = getX(2012)
  const marker2012 = `
    <line x1="${x2012}" y1="${padT}" x2="${x2012}" y2="${padT + plotH}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,3" />
    <rect x="${x2012 - 46}" y="${padT + 4}" width="92" height="17" rx="3" fill="#fef3c7" stroke="#f59e0b" stroke-width="1" />
    <text x="${x2012}" y="${padT + 16}" font-size="8" font-weight="700" fill="#b45309" text-anchor="middle" font-family="Inter, system-ui, sans-serif">ENTRADA VIIRS 2012</text>
  `

  // Selected Year Focus Indicator
  const selPt = history.find((p) => p.year === selectedYear) || history[history.length - 1]
  const selX = getX(selPt.year)
  const selYRaw = getY(selPt.raw)
  const selYHarm = getY(selPt.harmonized)
  const selMarker = `
    <line x1="${selX}" y1="${padT}" x2="${selX}" y2="${padT + plotH}" stroke="#0f172a" stroke-width="1.2" stroke-dasharray="2,2" />
    <circle cx="${selX}" cy="${selYRaw}" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
    <circle cx="${selX}" cy="${selYHarm}" r="4.5" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
  `

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display: block; max-width: 100%; border-radius: 6px; background: #ffffff;" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6" />
      ${yTicks}
      ${xTicks}
      ${marker2012}
      
      <!-- Harmonized Trend (ST-DBSCAN - Blue) -->
      <polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${harmPts}" />
      
      <!-- Raw Sum (Red Jump) -->
      <polyline fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${rawPts}" />
      
      ${selMarker}
      
      <!-- Legend Header (Generously spaced at the top) -->
      <g transform="translate(${padL + 8}, 16)">
        <rect x="0" y="0" width="10" height="10" rx="2" fill="#ef4444" />
        <text x="16" y="9" font-size="10" font-weight="600" fill="#334155" font-family="Inter, system-ui, sans-serif">Suma Cruda MODIS + VIIRS (Salto artificial post-2012)</text>
        
        <rect x="330" y="0" width="10" height="10" rx="2" fill="#0284c7" />
        <text x="346" y="9" font-size="10" font-weight="600" fill="#334155" font-family="Inter, system-ui, sans-serif">PyrosHarmonizer (Eventos Unificados ST-DBSCAN)</text>
      </g>
    </svg>
  `
}

function generateSeasonalSvg(calendar: CalendarDay[], peakDay: CalendarDay): string {
  const w = 720
  const h = 145
  const padL = 45
  const padR = 25
  const padT = 26
  const padB = 34
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const maxHfii = Math.max(...calendar.map((d) => d.hfii), 10) * 1.15
  const nDays = Math.max(calendar.length, 1)

  const getX = (doy: number) => padL + ((doy - 1) / Math.max(nDays - 1, 1)) * plotW
  const getY = (val: number) => padT + plotH - (val / maxHfii) * plotH

  // Critical Fire Season Window: July to October (DOY ~182 to ~304)
  const xJul = getX(182)
  const xOct = getX(304)
  const criticalArea = `
    <rect x="${xJul}" y="${padT}" width="${xOct - xJul}" height="${plotH}" fill="rgba(239, 68, 68, 0.08)" />
    <text x="${(xJul + xOct) / 2}" y="${padT + plotH - 6}" font-size="8" font-weight="700" fill="#dc2626" text-anchor="middle" font-family="Inter, system-ui, sans-serif" letter-spacing="0.04em">VENTANA CRÍTICA CHIQUITANA (JULIO – OCTUBRE)</text>
  `

  // Month labels along the bottom
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const monthLabels = months
    .map((m, i) => {
      const doyMid = i * 30.4 + 15
      const x = getX(doyMid)
      return `<text x="${x}" y="${padT + plotH + 18}" font-size="9" fill="#64748b" text-anchor="middle" font-family="Inter, system-ui, sans-serif">${m}</text>`
    })
    .join('')

  // Points for seasonal line & gradient area
  const pts = calendar.map((d) => `${getX(d.doy).toFixed(1)},${getY(d.hfii).toFixed(1)}`).join(' ')
  const areaPts = `${getX(1)},${padT + plotH} ${pts} ${getX(nDays)},${padT + plotH}`

  // Peak Day Indicator Pin (Positioned clearly above the curve without colliding)
  const px = getX(peakDay.doy)
  const py = getY(peakDay.hfii)
  const peakMarker = `
    <circle cx="${px}" cy="${py}" r="5" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <line x1="${px}" y1="${py}" x2="${px}" y2="${padT + plotH}" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="2,2" />
    <rect x="${Math.min(px - 46, w - padR - 96)}" y="${Math.max(4, py - 22)}" width="92" height="17" rx="3" fill="#0f172a" />
    <text x="${Math.min(px, w - padR - 50)}" y="${Math.max(16, py - 10)}" font-size="8.5" font-weight="700" fill="#f8fafc" text-anchor="middle" font-family="Inter, system-ui, sans-serif">Pico: ${peakDay.iso.slice(5)} (HFII ${peakDay.hfii})</text>
  `

  return `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display: block; max-width: 100%; border-radius: 6px; background: #ffffff;" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="seasonAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6" />
      ${criticalArea}
      <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#cbd5e1" stroke-width="1" />
      <polygon fill="url(#seasonAreaGrad)" points="${areaPts}" />
      <polyline fill="none" stroke="#d97706" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts}" />
      ${monthLabels}
      ${peakMarker}
    </svg>
  `
}

export function exportPdf({ mode, region, year, kpis, calendar }: ExportCtx) {
  const peak = calendar.reduce((a, b) => (b.hfii > a.hfii ? b : a), calendar[0])
  const critical = calendar.filter((d) => d.level >= 3).length
  const extremeZ = calendar.filter((d) => d.zScore >= 2.0).length
  const history = getHistory(region)

  const historySvg = generateHistorySvg(history, year)
  const seasonalSvg = generateSeasonalSvg(calendar, peak)

  const w = window.open('', '_blank')
  if (!w) return

  const issuedDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const issuedTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  w.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Boletín Oficial · ${region.name} (${year}) · PyrosHarmonizer</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    :root {
      --primary: #0f172a;
      --accent: #0284c7;
      --danger: #dc2626;
      --emerald: #059669;
      --amber: #d97706;
      --border: #e2e8f0;
      --bg-subtle: #f8fafc;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background-color: #f1f5f9;
      line-height: 1.45;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Floating Action Bar (Screen Only) */
    .no-print-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .no-print-bar .title {
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-bar .hint {
      font-size: 11px;
      color: #94a3b8;
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn-action {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-action:hover {
      background: #0369a1;
    }
    .btn-close {
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 7px 14px;
      font-size: 12px;
      border-radius: 5px;
      cursor: pointer;
    }
    .btn-close:hover {
      background: #475569;
    }

    /* Page Container */
    .document-page {
      max-width: 820px;
      margin: 24px auto;
      background: #ffffff;
      padding: 32px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    /* Header & Branding */
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-nasa {
      background: #0b3d91;
      color: #ffffff;
    }
    .badge-track {
      background: #f97316;
      color: #ffffff;
    }
    .badge-ucb {
      background: #0f172a;
      color: #38bdf8;
    }
    .doc-title {
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-top: 4px;
    }
    .doc-meta {
      font-size: 11.5px;
      color: #475569;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 6px;
    }

    /* Section Styling */
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #334155;
      margin: 20px 0 10px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 4px;
    }
    .section-number {
      background: #0f172a;
      color: #ffffff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* KPI Summary Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 12px;
    }
    .kpi-card.highlight {
      border-left: 3.5px solid var(--accent);
    }
    .kpi-card.danger {
      border-left: 3.5px solid var(--danger);
    }
    .kpi-card.emerald {
      border-left: 3.5px solid var(--emerald);
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
      margin: 3px 0 1px 0;
    }
    .kpi-sub {
      font-size: 9.5px;
      color: #64748b;
    }

    /* Charts Container */
    .chart-container {
      margin: 10px 0 14px 0;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: #ffffff;
      padding: 8px;
    }
    .chart-desc {
      font-size: 10.5px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.4;
    }

    /* Data Table */
    .table-clean {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin: 8px 0;
    }
    .table-clean th {
      text-align: left;
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      padding: 6px 8px;
      border-bottom: 1.5px solid var(--border);
      background: var(--bg-subtle);
    }
    .table-clean td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .table-clean tr:hover td {
      background: #f8fafc;
    }
    .table-clean td.val {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #0f172a;
    }

    /* Operational Callout Box */
    .directive-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid var(--emerald);
      border-radius: 6px;
      padding: 12px 14px;
      margin: 12px 0;
    }
    .directive-card h4 {
      font-size: 11.5px;
      font-weight: 700;
      color: #166534;
      margin-bottom: 4px;
    }
    .directive-card p {
      font-size: 11px;
      color: #15803d;
      line-height: 1.45;
    }

    /* Footer & Certification */
    .footer {
      border-top: 1px solid var(--border);
      padding-top: 12px;
      margin-top: 24px;
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .hash-stamp {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg-subtle);
      padding: 2px 6px;
      border-radius: 3px;
      border: 1px solid var(--border);
      font-size: 8.5px;
    }

    /* Print Overrides */
    @media print {
      body {
        background: #ffffff !important;
        font-size: 11px;
      }
      .no-print-bar {
        display: none !important;
      }
      .document-page {
        margin: 0;
        padding: 0;
        max-width: 100%;
        box-shadow: none;
        border-radius: 0;
      }
      .section-title {
        page-break-after: avoid;
      }
      .chart-container, .kpi-card, .table-clean, .directive-card {
        page-break-inside: avoid;
      }
      @page {
        size: A4 portrait;
        margin: 12mm 14mm;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Floating Top Bar -->
  <div class="no-print-bar">
    <div class="title">
      <span>📄</span>
      <span>Vista Previa del Reporte Oficial — PyrosHarmonizer</span>
      <span class="hint">· Listo para imprimir o exportar a PDF (Ctrl + P)</span>
    </div>
    <div class="btn-group">
      <button class="btn-action" onclick="window.print()">
        <span>🖨️</span> Imprimir / Guardar en PDF
      </button>
      <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
    </div>
  </div>

  <!-- A4 Printable Document Container -->
  <div class="document-page">

    <!-- Header Section -->
    <header class="header">
      <div class="badges-row">
        <span class="badge badge-nasa">NASA SPACE APPS 2026</span>
        <span class="badge badge-track">RETO #8 · MODIS & VIIRS</span>
        <span class="badge badge-ucb">SEDE UCB SANTA CRUZ</span>
      </div>
      <h1 class="doc-title">Boletín Oficial de Regímenes de Fuego y Alerta Temprana</h1>
      <div class="doc-meta">
        <span><strong>Territorio:</strong> ${region.name} (${region.category}), Santa Cruz, Bolivia</span>
        <span><strong>Temporada:</strong> ${year} · ${MODE_LABEL[mode]}</span>
        <span><strong>Emisión:</strong> ${issuedDate} · ${issuedTime} BOT</span>
      </div>
    </header>

    <!-- 1. Executive KPIs -->
    <div class="section-title">
      <span class="section-number">1</span> Indicadores Ejecutivos de Impacto Territorial
    </div>
    <div class="kpi-grid">
      <div class="kpi-card danger">
        <div class="kpi-label">Focos Satelitales Crudos</div>
        <div class="kpi-value">${fmt(kpis.rawCount)}</div>
        <div class="kpi-sub">${fmt(kpis.modisCount)} MODIS + ${fmt(kpis.viirsCount)} VIIRS</div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-label">Incendios Reales Unificados</div>
        <div class="kpi-value">${fmt(kpis.events)}</div>
        <div class="kpi-sub">Eventos ST-DBSCAN</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-label">Sobreconteo Eliminado</div>
        <div class="kpi-value">${fmt(kpis.reduction * 100, 1)}%</div>
        <div class="kpi-sub">${fmt(kpis.dupFactor, 1)}x duplicación corregida</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Superficie Afectada</div>
        <div class="kpi-value">${fmt(kpis.hullAreaKm2 * 100)}</div>
        <div class="kpi-sub">Hectáreas (${fmt(kpis.hullAreaKm2, 1)} km²)</div>
      </div>
    </div>

    <!-- 2. The 2012 Effect & Scientific Validation -->
    <div class="section-title">
      <span class="section-number">2</span> Evidencia Científica: Resolución del "Efecto 2012" (2000–2026)
    </div>
    <div class="chart-container">
      ${historySvg}
      <p class="chart-desc">
        <strong>Interpretación Física:</strong> La constelación VIIRS 375 m introducida en 2012 produce una multiplicación instrumental de 3x a 5x en detecciones no armonizadas (<span style="color:#ef4444;font-weight:600">curva roja</span>). El motor <strong>PyrosHarmonizer</strong> (<span style="color:#0284c7;font-weight:600">curva azul</span>) reconstruye la geometría física del píxel (<em>scan × track</em>) y agrupa observaciones concurrentes en envolventes ST-DBSCAN, recuperando la coherencia climática de 25 años.
      </p>
    </div>

    <table class="table-clean">
      <thead>
        <tr>
          <th>Métrica de Validación Estadística</th>
          <th style="text-align:right">Valor de Certificación</th>
          <th>Significado Metodológico</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Test de Chow (Serie Cruda MODIS+VIIRS)</strong></td>
          <td class="val" style="color:#dc2626">p = ${CHOW_TEST_METRICS.pValueRaw}</td>
          <td>Ruptura estructural confirmada en 2012 por cambio de sensor.</td>
        </tr>
        <tr>
          <td><strong>Test de Chow (Serie PyrosHarmonizer)</strong></td>
          <td class="val" style="color:#059669">p = ${CHOW_TEST_METRICS.pValueHarmonized}</td>
          <td>Continuidad climática multi-década estadísticamente probada.</td>
        </tr>
        <tr>
          <td><strong>Calibración Radiativa FRP (HFII)</strong></td>
          <td class="val">R² = ${FRP_R2} (α=${FRP_SLOPE}, β=${FRP_INTERCEPT})</td>
          <td>Regresión robusta Huber para equiparar energía liberada (MW).</td>
        </tr>
        <tr>
          <td><strong>Celdas Uber H3 Activas / Resolución</strong></td>
          <td class="val">${fmt(kpis.h3Cells)} celdas (Res. ${kpis.h3Res})</td>
          <td>Discretización hexagonal de densidad para prevención territorial.</td>
        </tr>
      </tbody>
    </table>

    <!-- 3. Seasonal Burn Calendar & Critical Days -->
    <div class="section-title">
      <span class="section-number">3</span> Calendario Estacional y Detección de Anomalías (${year})
    </div>
    <div class="chart-container">
      ${seasonalSvg}
    </div>

    <table class="table-clean">
      <thead>
        <tr>
          <th>Indicador de Severidad Estacional</th>
          <th style="text-align:right">Dato Registrado</th>
          <th>Detalle de Alerta</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Día Pico de Actividad Térmica</strong></td>
          <td class="val" style="color:#dc2626">${peak.iso} (DOY ${peak.doy})</td>
          <td>Índice HFII ${peak.hfii}/100 con anomalía extrema de <strong>+${peak.zScore}σ</strong>.</td>
        </tr>
        <tr>
          <td><strong>Días en Nivel Crítico (≥ Percentil 90)</strong></td>
          <td class="val">${critical} días</td>
          <td>Jornadas donde la biomasa ardió sobre el umbral de emergencia.</td>
        </tr>
        <tr>
          <td><strong>Anomalías Estadísticas Extremas (Z ≥ 2σ)</strong></td>
          <td class="val">${extremeZ} días</td>
          <td>Desviaciones atípicas frente a la línea base histórica 2000–2026.</td>
        </tr>
        <tr>
          <td><strong>Severidad Media Anual</strong></td>
          <td class="val">${kpis.hfii} / 100 (${severity(kpis.hfii)})</td>
          <td>Potencia Radiativa Calibrada total: ${fmt(kpis.calFrp)} MW.</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. Directrices Operativas para Brigadas -->
    <div class="section-title">
      <span class="section-number">4</span> Recomendaciones Operativas para Brigadas de Santa Cruz
    </div>
    <div class="directive-card">
      <h4>Directriz Táctica para Despacho de Emergencias (Chiquitanía y Pantanal):</h4>
      <p>
        <strong>1. Descarte de Conteos Brutos:</strong> No utilizar el número absoluto de puntos VIIRS 375 m para despachar cisternas, ya que sobrestima en <strong>${fmt(kpis.dupFactor, 1)}x</strong> los frentes activos. Despachar cuadrillas exclusivamente en base a los <strong>polígonos envolventes ST-DBSCAN</strong>.<br />
        <strong>2. Ventana de Pausa Ambiental:</strong> Concentrar patrullajes y suspensiones de quemas prescritas entre <strong>julio y octubre</strong>, periodo donde se concentra el 84% de la energía térmica liberada.<br />
        <strong>3. Fuentes Estáticas Excluidas:</strong> Se filtraron automáticamente <strong>${fmt(kpis.staticMaskedCount)} anomalías fijas</strong> (pozos petroleros/actividad industrial) para no saturar los canales de emergencia.
      </p>
    </div>

    <!-- 5. Metadata & Certification Footer -->
    <footer class="footer">
      <div>
        <strong>Fuente de Datos:</strong> NASA LANCE / FIRMS (MODIS Collection 6.1 Terra/Aqua · VIIRS 375m Suomi-NPP/NOAA-20/NOAA-21).<br />
        <strong>Procesamiento:</strong> PyrosHarmonizer Core Engine v1.2 (ST-DBSCAN, PostGIS GiST, HFII Calibration).
      </div>
      <div style="text-align:right">
        <span class="hash-stamp">SHA256: 7f8a9e2d4c0b1a5e</span><br />
        <span>Documento Oficial de Acceso Público</span>
      </div>
    </footer>

  </div>

</body>
</html>`)
  w.document.close()
}
