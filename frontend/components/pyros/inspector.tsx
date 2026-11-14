import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Selection } from './map-viewer'

const fmtTime = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`

export function Inspector({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  let title: string
  let accent: string
  let rows: [string, string][]

  if (selection.kind === 'det') {
    const d = selection.item
    title = d.sensor === 'VIIRS' ? 'Detección VIIRS 375 m' : 'Detección MODIS 1 km'
    accent = d.sensor === 'VIIRS' ? 'bg-viirs' : 'bg-modis'
    rows = [
      ['latitude', d.latitude.toFixed(5)],
      ['longitude', d.longitude.toFixed(5)],
      [d.sensor === 'VIIRS' ? 'bright_ti4' : 'brightness', `${d.brightness.toFixed(1)} K`],
      ['scan', `${d.scan.toFixed(2)} km`],
      ['track', `${d.track.toFixed(2)} km`],
      ['acq_date', d.acq_date],
      ['acq_time', `${fmtTime(d.acq_time)} UTC`],
      ['satellite', d.satellite],
      ['daynight', d.daynight],
      ['confidence', d.confidence],
      ['frp', `${d.frp.toFixed(1)} MW`],
    ]
  } else if (selection.kind === 'event') {
    const e = selection.item
    title = 'Evento unificado ST-DBSCAN'
    accent = 'bg-harmonized'
    rows = [
      ['event_id', `PH-${e.acq_date.replaceAll('-', '')}-${String(e.id).padStart(2, '0')}`],
      ['latitude', e.latitude.toFixed(5)],
      ['longitude', e.longitude.toFixed(5)],
      ['n_detections', String(e.detections)],
      ['n_modis / n_viirs', `${e.modis} / ${e.viirs}`],
      ['Δt orbital', e.deltaT ? `${e.deltaT.toFixed(2)} h` : '—'],
      ['geometry', 'ST_ConvexHull'],
      ['area', `${(e.areaKm2 * 100).toFixed(1)} ha`],
      ['acq_date', e.acq_date],
      ['daynight', e.daynight],
      ['frp_cal', `${e.frpCal.toFixed(1)} MW`],
    ]
  } else {
    const h = selection.item
    title = 'Celda H3 resolución 8'
    accent = 'bg-heat-3'
    rows = [
      ['h3_index', h.h3],
      ['latitude', h.latitude.toFixed(5)],
      ['longitude', h.longitude.toFixed(5)],
      ['area', '0.737 km²'],
      ['detections', String(h.count)],
      ['frp_sum', `${h.frp.toFixed(1)} MW`],
      ['frp_density', `${h.density.toFixed(1)} MW/km²`],
    ]
  }

  return (
    <aside
      aria-label="Inspector de metadatos FIRMS"
      className="absolute right-3 top-14 z-20 w-72 rounded-md border border-border bg-card/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-2 duration-200"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-sm', accent)} aria-hidden />
          <h3 className="text-xs font-medium">{title}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2" aria-label="Cerrar inspector">
          <X className="size-3.5" aria-hidden />
        </button>
      </header>
      <dl className="flex flex-col px-3 py-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-1 font-mono text-[11px]">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">Fuente: NASA FIRMS · atributos del dataset</p>
    </aside>
  )
}
