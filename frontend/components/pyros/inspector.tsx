import { Flame, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Selection } from './map-viewer'

const fmtTime = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`

export function Inspector({
  selection,
  onSelect,
  onClose,
}: {
  selection: Selection
  onSelect?: (s: Selection) => void
  onClose: () => void
}) {
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
      className="absolute right-3 top-14 z-20 flex max-h-[calc(100%-4.5rem)] w-80 flex-col rounded-md border border-border bg-card/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-sm', accent)} aria-hidden />
          <h3 className="text-xs font-medium">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2"
          aria-label="Cerrar inspector"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <dl className="flex flex-col px-3 py-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-1 font-mono text-[11px]">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-right tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        {selection.kind === 'event' && selection.item.members.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                <Flame className="size-3 text-harmonized" aria-hidden />
                Trazabilidad de Puntos Hijos ({selection.item.members.length})
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">US-07 · Click p/ detalle</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded border border-border bg-background/70">
              <table className="w-full text-left font-mono text-[10px]">
                <thead className="sticky top-0 bg-card text-muted-foreground">
                  <tr className="border-b border-border">
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
                      className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-accent"
                    >
                      <td className="px-2 py-1">
                        <span className={cn('mr-1.5 inline-block size-1.5 rounded-full', m.sensor === 'MODIS' ? 'bg-modis' : 'bg-viirs')} />
                        {m.id} <span className="text-muted-foreground">({m.satellite})</span>
                      </td>
                      <td className="px-1.5 py-1 text-muted-foreground">
                        {m.scan.toFixed(2)}×{m.track.toFixed(2)}
                      </td>
                      <td className="px-2 py-1 text-right tabular-nums">{m.frp.toFixed(1)} MW</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selection.kind === 'static' && (
          <div className="border-t border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <p className="flex items-start gap-1.5 text-amber-400">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                Fuente térmica persistente no asociada a vegetación (ESC-FIL-003). Excluida del cálculo de HFII y del Calendario de Quemas.
              </span>
            </p>
          </div>
        )}
      </div>

      <p className="shrink-0 border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        Fuente: NASA FIRMS · Trazabilidad ST-DBSCAN / H3
      </p>
    </aside>
  )
}
