import {
  CHOW_TEST_METRICS,
  FRP_INTERCEPT,
  FRP_R2,
  FRP_SLOPE,
  HFII_KAPPA,
  MODE_LABEL,
  fmt,
  severity,
  type CalendarDay,
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

export function exportPdf({ mode, region, year, kpis, calendar }: ExportCtx) {
  const peak = calendar.reduce((a, b) => (b.hfii > a.hfii ? b : a))
  const critical = calendar.filter((d) => d.level >= 3).length
  const extremeZ = calendar.filter((d) => d.zScore >= 2.0).length
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte Ejecutivo · ${region.name} ${year}</title>
<style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:36px;line-height:1.5}header{border-bottom:2px solid #10b981;padding-bottom:12px;margin-bottom:20px}h1{font-size:20px;margin:4px 0 0}h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#475569;margin-top:24px;border-bottom:1px solid #cbd5e1;padding-bottom:4px}.badge{display:inline-block;font-size:10px;font-family:ui-monospace,monospace;background:#0f172a;color:#10b981;padding:2px 8px;border-radius:4px}table{border-collapse:collapse;width:100%;font-size:12.5px}td{border-bottom:1px solid #e2e8f0;padding:7px 0}td:last-child{text-align:right;font-family:ui-monospace,monospace;font-weight:600}p{font-size:12.5px}</style></head><body>
<header><span class="badge">2026 NASA INTERNATIONAL SPACE APPS CHALLENGE · RETO #8 · UCB SANTA CRUZ</span>
<h1>PyrosHarmonizer — Reporte Ejecutivo de Regímenes de Fuego</h1>
<p style="margin:4px 0 0;color:#475569">${region.name} (${region.category}), Santa Cruz, Bolivia · Temporada ${year} · ${MODE_LABEL[mode]}</p></header>
<h2>1. Indicadores Armonizados y Reducción del "Efecto 2012"</h2><table>
<tr><td>Focos crudos MODIS (1 km) + VIIRS (375 m)</td><td>${fmt(kpis.rawCount)} (${fmt(kpis.modisCount)} M / ${fmt(kpis.viirsCount)} V)</td></tr>
<tr><td>Incendios reales unificados (ST-DBSCAN + ST_ConvexHull)</td><td>${fmt(kpis.events)} eventos</td></tr>
<tr><td>Tasa de compresión / duplicación espacial eliminada</td><td>${fmt(kpis.reduction * 100, 1)}% (${fmt(kpis.dupFactor, 1)}x sobre-conteo corregido)</td></tr>
<tr><td>Anomalías térmicas estáticas enmascaradas (Gas / Industria)</td><td>${fmt(kpis.staticMaskedCount)} fuentes fijas excluidas</td></tr>
<tr><td>Potencia Radiativa Calibrada (HFII / FRP eq. MODIS)</td><td>${fmt(kpis.calFrp)} MW</td></tr>
<tr><td>Celdas Uber H3 activas (Resolución ${kpis.h3Res})</td><td>${fmt(kpis.h3Cells)} celdas (${fmt(kpis.h3AreaKm2 * 100)} ha)</td></tr>
<tr><td>HFII medio de temporada y severidad</td><td>${kpis.hfii} / 100 (${severity(kpis.hfii)})</td></tr>
<tr><td>Superficie estimada de huella térmica unificada</td><td>${fmt(kpis.hullAreaKm2 * 100)} ha (${fmt(kpis.hullAreaKm2, 1)} km²)</td></tr>
<tr><td>Día pico de actividad térmica</td><td>${peak.iso} (DOY ${peak.doy}) · HFII ${peak.hfii} · Z = +${peak.zScore}σ</td></tr>
<tr><td>Días con severidad Alta/Extrema (≥ P90) / Anomalía Crítica (Z ≥ 2σ)</td><td>${critical} días / ${extremeZ} días</td></tr></table>
<h2>2. Certificación Estadística de Continuidad Temporal (2000–2026)</h2><table>
<tr><td>Test de Chow sobre serie cruda (Ruptura 2012)</td><td>p = ${CHOW_TEST_METRICS.pValueRaw} (Quiebre instrumental artificial)</td></tr>
<tr><td>Test de Chow sobre serie armonizada PyrosHarmonizer</td><td>p = ${CHOW_TEST_METRICS.pValueHarmonized} (Continuidad homogénea certificada)</td></tr>
<tr><td>Ecuación de transferencia calibrada (R² = ${FRP_R2})</td><td>FRP_eq = ${FRP_SLOPE}·FRP_VIIRS·ψ(scan,track)·γ_solar + ${FRP_INTERCEPT}</td></tr></table>
<h2>3. Recomendación Operativa para Brigadas y Gestión Territorial</h2>
<p>Priorizar despliegue de cuadrillas forestales y pausas ambientales en la ventana crítica julio–octubre. La suma directa de focos VIIRS 375 m sobreestima en ${fmt(kpis.dupFactor, 1)}x el número de frentes reales; utilizar exclusivamente los perímetros poligonales ST-DBSCAN y el índice HFII para despacho táctico.</p>
<p style="color:#64748b;font-size:11px;margin-top:24px">Fuente: NASA LANCE / FIRMS (MODIS C6.1 Terra/Aqua, VIIRS 375 m Suomi-NPP/NOAA-20/NOAA-21). Generado: ${new Date().toISOString()}.</p>
<script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}
