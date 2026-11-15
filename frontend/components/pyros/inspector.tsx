import { useState } from 'react'
import { FileText, Flame, Radio, ShieldCheck, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmt, type CalendarDay, type Kpis, type Mode, type Region } from '@/lib/pyros/data'
import type { Scene } from '@/lib/pyros/scene'
import type { Selection } from './map-viewer'

const fmtTime = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`

export function Inspector({
  selection,
  scene,
  day,
  region,
  year,
  kpis,
  mode = 'dbscan',
  onSelect,
  onClose,
  onExportPdf,
}: {
  selection: Selection
  scene?: Scene
  day?: CalendarDay
  region?: Region
  year?: number
  kpis?: Kpis
  mode?: Mode
  onSelect?: (s: Selection) => void
  onClose: () => void
  onExportPdf?: () => void
}) {
  const [scope, setScope] = useState<'day' | 'year'>('day')

  // Dynamic calculations from active scene (day) and annual KPIs (region + year)
  const dayRawPixels = scene ? scene.detections.length : day ? day.rawModisFoci + day.rawViirsFoci : 0
  const dayModisPixels = scene ? scene.detections.filter((d) => d.sensor === 'MODIS').length : day ? day.rawModisFoci : 0
  const dayViirsPixels = scene ? scene.detections.filter((d) => d.sensor === 'VIIRS').length : day ? day.rawViirsFoci : 0
  const dayHarmonizedFronts = scene
    ? mode === 'h3'
      ? scene.activeHexes.length
      : scene.events.length
    : day
      ? day.events
      : 0

  const yearRawPixels = kpis ? kpis.rawCount : dayRawPixels
  const yearHarmonizedFronts = kpis ? (mode === 'h3' ? Math.round(kpis.events * 1.38) : kpis.events) : dayHarmonizedFronts

  const activeRaw = scope === 'day' ? dayRawPixels : yearRawPixels
  const activeHarmonized = scope === 'day' ? dayHarmonizedFronts : yearHarmonizedFronts

  const reductionPct =
    activeRaw > 0
      ? Math.max(0, (1 - activeHarmonized / activeRaw) * 100)
      : kpis
        ? kpis.reduction * 100
        : 0
  const dupFactor =
    activeHarmonized > 0
      ? activeRaw / activeHarmonized
      : kpis
        ? kpis.dupFactor
        : 1

  // Area (ha) comparison: harmonized Convex Hull vs raw unharmonized pixel footprint sum
  const dayHullAreaHa = scene
    ? Math.round(
        (mode === 'h3'
          ? scene.activeHexes.reduce((s, h) => s + h.areaKm2, 0)
          : scene.events.reduce((s, e) => s + e.areaKm2, 0)) * 100,
      )
    : 0
  const dayRawAreaHa = scene
    ? Math.round(scene.detections.reduce((s, d) => s + d.areaKm2, 0) * 100)
    : 0

  const yearHullAreaHa = kpis ? Math.round(kpis.hullAreaKm2 * 100) : dayHullAreaHa
  const yearRawAreaHa = kpis ? Math.round(kpis.rawAreaKm2 * 100) : dayRawAreaHa

  const activeHullAreaHa = scope === 'day' ? dayHullAreaHa : yearHullAreaHa
  const activeRawAreaHa = scope === 'day' ? Math.max(dayRawAreaHa, dayHullAreaHa) : Math.max(yearRawAreaHa, yearHullAreaHa)

  // Critical foci (high FRP or high confidence detections)
  const dayCriticalFoci = scene
    ? scene.detections.filter((d) => d.frp >= 30 || d.confidence === 'high' || Number(d.confidence) >= 80).length
    : 0
  const yearCriticalFoci = kpis ? Math.round(kpis.events * 0.22) : dayCriticalFoci
  const activeCriticalFoci = scope === 'day' ? dayCriticalFoci : yearCriticalFoci

  // Severity (HFII 0-100)
  const activeHfii = scope === 'day' ? (day ? day.hfii : kpis ? kpis.hfii : 0) : kpis ? kpis.hfii : day ? day.hfii : 0
  const severityRegime =
    activeHfii >= 75
      ? 'Fuego de Copa'
      : activeHfii >= 50
        ? 'Frente Activo'
        : activeHfii >= 25
          ? 'Sotobosque'
          : 'Baja / Latente'
  let title: string
  let accent: string
  let rows: [string, string][]

  if (selection.kind === 'det') {
    const d = selection.item
    title = d.sensor === 'VIIRS' ? 'Detección VIIRS 375 m' : 'Detección MODIS 1 km'
    accent = d.sensor === 'VIIRS' ? 'bg-viirs' : 'bg-modis'
    rows = [
      ['id', d.id],
      ['latitude', d.latitude.toFixed(5)],
      ['longitude', d.longitude.toFixed(5)],
      [d.sensor === 'VIIRS' ? 'bright_ti4' : 'brightness', `${d.brightness.toFixed(1)} K`],
      ['bright_ti5 / t31', `${(d.bright_ti5 ?? 298).toFixed(1)} K`],
      ['scan × track', `${d.scan.toFixed(2)} × ${d.track.toFixed(2)} km`],
      ['area_pixel', `${d.areaKm2.toFixed(3)} km² (ψ=${d.areaCorrection.toFixed(2)})`],
      ['acq_date', d.acq_date],
      ['acq_time', `${fmtTime(d.acq_time)} UTC`],
      ['satellite', d.satellite],
      ['daynight', `${d.daynight} (γ=${d.solarGamma.toFixed(2)})`],
      ['confidence', d.confidence],
      ['frp', `${d.frp.toFixed(1)} MW`],
    ]
  } else if (selection.kind === 'event') {
    const e = selection.item
    title = 'Evento unificado ST-DBSCAN'
    accent = 'bg-harmonized'
    rows = [
      ['event_id', e.eventCode],
      ['detection_regime', e.detectionRegime],
      ['latitude', e.latitude.toFixed(5)],
      ['longitude', e.longitude.toFixed(5)],
      ['n_detections', String(e.detections)],
      ['n_modis / n_viirs', `${e.modis} MODIS / ${e.viirs} VIIRS`],
      ['Δt orbital', e.deltaT ? `${e.deltaT.toFixed(2)} h (≤ 3.5 h)` : 'Pase único'],
      ['dispersión espacial', `${e.spatialDispersionM} m`],
      ['geometry', 'ST_ConvexHull'],
      ['area_ha', `${(e.areaKm2 * 100).toFixed(1)} ha (${e.areaKm2.toFixed(2)} km²)`],
      ['acq_date / pase', `${e.acq_date} · ${e.daynight}`],
      ['raw_frp_sum', `${e.rawFrpSum.toFixed(1)} MW`],
      ['hfii_mw (calibrado)', `${e.frpCal.toFixed(1)} MW eq.`],
    ]
  } else if (selection.kind === 'hex') {
    const h = selection.item
    title = `Celda Uber H3 res. ${h.resolution}`
    accent = 'bg-heat-3'
    rows = [
      ['h3_index', h.h3],
      ['resolution', `Res ${h.resolution} (${h.areaKm2.toFixed(3)} km²)`],
      ['latitude', h.latitude.toFixed(5)],
      ['longitude', h.longitude.toFixed(5)],
      ['detections', `${h.count} (${h.modisCount} M / ${h.viirsCount} V)`],
      ['hfii_sum', `${h.frp.toFixed(1)} MW`],
      ['frp_density', `${h.density.toFixed(1)} MW/km²`],
    ]
  } else {
    const s = selection.item
    title = 'Anomalía Térmica Estática'
    accent = 'bg-amber-400'
    rows = [
      ['anomaly_id', s.id],
      ['instalación', s.name],
      ['classification', s.classification],
      ['latitude', s.latitude.toFixed(5)],
      ['longitude', s.longitude.toFixed(5)],
      ['persistencia', `${s.activeDays} / ${s.spanDays} días (> 365d)`],
      ['radio espacial', `±${s.radiusM} m`],
      ['frp_estático', `${s.frp.toFixed(1)} MW`],
      ['estado filtro', s.masked ? 'STATIC_ANOMALY_MASKED' : 'SIN ENMASCARAR (Activo)'],
    ]
  }

  return (
    <aside
      aria-label="Inspector de metadatos FIRMS"
      className="absolute right-3 top-14 z-20 flex max-h-[calc(100%-4.5rem)] w-88 sm:w-96 flex-col rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-2 duration-200"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('size-2.5 rounded-full', accent === 'bg-harmonized' ? 'bg-cyan-400' : accent)} aria-hidden />
          <h3 className="text-xs font-bold font-mono text-white tracking-tight">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar inspector"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3 space-y-3">
        {/* Panel 1: DATO CRUDO vs VERDAD ARMONIZADA (Dinámico por Día/Fecha y Región/Año) */}
        <div className="bg-[#11182c] border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex flex-col">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono">
                Comparativa de Detección
              </h4>
              <span className="text-[9px] font-mono text-cyan-400/90 truncate max-w-[175px]">
                {region ? region.name.split(' (')[0] : 'Chiquitanía'} · {scope === 'day' && day ? day.iso : `Año ${year ?? 2024}`}
              </span>
            </div>
            <div className="flex items-center rounded-md border border-slate-700/80 bg-slate-900/90 p-0.5 font-mono text-[9px]">
              <button
                type="button"
                onClick={() => setScope('day')}
                className={cn(
                  'rounded px-1.5 py-0.5 transition-colors cursor-pointer',
                  scope === 'day' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200',
                )}
                title="Ver comparativa del día seleccionado en el calendario"
              >
                Día {day ? day.iso.slice(5) : ''}
              </button>
              <button
                type="button"
                onClick={() => setScope('year')}
                className={cn(
                  'rounded px-1.5 py-0.5 transition-colors cursor-pointer',
                  scope === 'year' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200',
                )}
                title="Ver acumulado anual de la región seleccionada"
              >
                Anual {year ?? ''}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-2 text-center">
              <span className="text-[10px] text-rose-300 flex items-center justify-center gap-1 mb-0.5 font-medium">
                <Radio className="size-3 text-rose-400 shrink-0" aria-hidden />
                Píxeles Crudos
              </span>
              <div className="text-xl font-black text-rose-400 font-mono tabular-nums">
                {fmt(activeRaw)}
              </div>
              <span className="text-[9px] text-rose-300/80 bg-rose-900/40 px-1.5 py-0.5 rounded mt-0.5 inline-block font-mono">
                {scope === 'day'
                  ? `${dayModisPixels}M + ${dayViirsPixels}V (${fmt(dupFactor, 1)}x)`
                  : `Sobrecarga ${fmt(dupFactor, 1)}x`}
              </span>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2 text-center">
              <span className="text-[10px] text-emerald-300 flex items-center justify-center gap-1 mb-0.5 font-medium">
                <ShieldCheck className="size-3 text-emerald-400 shrink-0" aria-hidden />
                {mode === 'h3' ? 'Celdas H3 Activas' : 'Frentes Reales'}
              </span>
              <div className="text-xl font-black text-emerald-400 font-mono tabular-nums">
                {fmt(activeHarmonized)}
              </div>
              <span className="text-[9px] text-emerald-300/80 bg-emerald-900/40 px-1.5 py-0.5 rounded mt-0.5 inline-block font-mono">
                {scope === 'day' && kpis
                  ? `Anual: ${fmt(yearHarmonizedFronts)} frentes`
                  : 'Fuegos Únicos Validados'}
              </span>
            </div>
          </div>

          <div className="bg-cyan-950/30 border border-cyan-700/30 rounded-lg p-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-cyan-200 font-medium">
            <Zap className="size-3.5 text-cyan-400 shrink-0" aria-hidden />
            <span>
              <strong>-{fmt(reductionPct, 1)}%</strong> Reducción de Ruido • Despliegue Focalizado
            </span>
          </div>
        </div>

        {/* Panel 2: IMPACTO Y KPIS CLAVE (Dinámico por Día/Año y Región) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#11182c] border border-slate-800 rounded-lg p-2 text-center">
            <span className="text-[9px] text-slate-400 block font-mono">ÁREA REAL</span>
            <span className="text-xs font-bold text-slate-100 font-mono tabular-nums">
              {fmt(activeHullAreaHa)} ha
            </span>
            <span className="text-[8px] text-slate-500 block line-through font-mono tabular-nums">
              vs {fmt(activeRawAreaHa)} ha
            </span>
          </div>
          <div className="bg-[#11182c] border border-slate-800 rounded-lg p-2 text-center">
            <span className="text-[9px] text-slate-400 block font-mono">FOCOS CRÍTICOS</span>
            <span className="text-xs font-bold text-amber-400 font-mono tabular-nums">
              {fmt(activeCriticalFoci)}
            </span>
            <span className="text-[8px] text-amber-400/80 block font-mono">
              {activeCriticalFoci > 0 ? 'Prioridad Brigada' : 'Sin alerta crítica'}
            </span>
          </div>
          <div className="bg-[#11182c] border border-slate-800 rounded-lg p-2 text-center">
            <span className="text-[9px] text-slate-400 block font-mono">SEVERIDAD</span>
            <span
              className={cn(
                'text-xs font-bold font-mono tabular-nums',
                activeHfii >= 75
                  ? 'text-rose-400'
                  : activeHfii >= 50
                    ? 'text-amber-400'
                    : activeHfii >= 25
                      ? 'text-yellow-300'
                      : 'text-emerald-400',
              )}
            >
              {activeHfii}%
            </span>
            <span className="text-[8px] text-slate-300 block font-mono">{severityRegime}</span>
          </div>
        </div>

        {/* Panel 3: DETALLE DEL EVENTO */}
        <div className="bg-[#11182c] border border-cyan-900/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
              Telemetría del Elemento
            </span>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              En Vivo
            </span>
          </div>

          <dl className="flex flex-col divide-y divide-slate-800/50">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-1 font-mono text-[11px]">
                <dt className="text-slate-400">{k}</dt>
                <dd className="truncate text-right tabular-nums text-slate-200 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {selection.kind === 'event' && selection.item.members.length > 0 && (
          <div className="border border-slate-800 rounded-xl bg-[#11182c] p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <Flame className="size-3 text-cyan-400" aria-hidden />
                Trazabilidad de Puntos Hijos ({selection.item.members.length})
              </span>
              <span className="font-mono text-[9px] text-slate-400">Clic p/ detalle</span>
            </div>
            <div className="max-h-32 overflow-y-auto rounded border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left font-mono text-[10px]">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr className="border-b border-slate-800">
                    <th className="px-2 py-1">ID / Sensor</th>
                    <th className="px-1.5 py-1">Scan×Trk</th>
                    <th className="px-2 py-1 text-right">FRP</th>
                  </tr>
                </thead>
                <tbody>
                  {selection.item.members.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => onSelect?.({ kind: 'det', item: m })}
                      className="cursor-pointer border-b border-slate-800/40 last:border-0 hover:bg-slate-800/60"
                    >
                      <td className="px-2 py-1">
                        <span className={cn('mr-1.5 inline-block size-1.5 rounded-full', m.sensor === 'MODIS' ? 'bg-sky-400' : 'bg-amber-400')} />
                        <span className="text-slate-300">{m.id}</span>
                      </td>
                      <td className="px-1.5 py-1 text-slate-400">
                        {m.scan.toFixed(2)}×{m.track.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums text-amber-300 font-medium">
                        {m.frp.toFixed(1)} MW
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Button at Bottom */}
        <button
          type="button"
          onClick={() => {
            if (onExportPdf) onExportPdf()
          }}
          className="w-full bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-rose-900/30 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-[0.99]"
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          <span>Despacho de Cuadrillas &amp; Generar Reporte PDF</span>
        </button>
      </div>

      <p className="shrink-0 border-t border-slate-800 px-3 py-1.5 text-[10px] text-slate-400 font-mono">
        Fuente: NASA FIRMS · Trazabilidad ST-DBSCAN / H3
      </p>
    </aside>
  )
}
