import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Selection } from './map-viewer'
import { Eyebrow } from './ui'

const fmtTime = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`

export function Inspector({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  let title: string
  let kind: string
  let accent: string
  let rows: [string, string][]

  if (selection.kind === 'det') {
    const d = selection.item
    kind = 'Detección cruda'
    title = d.sensor === 'VIIRS' ? 'VIIRS 375 m' : 'MODIS 1 km'
    accent = d.sensor === 'VIIRS' ? 'bg-viirs' : 'border border-modis'
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
      ['cluster_id', `PH-${d.acq_date.replaceAll('-', '')}-${String(d.clusterId).padStart(2, '0')}`],
      ['h3_index', d.h3],
    ]
  } else if (selection.kind === 'event') {
    const e = selection.item
    kind = 'Evento armonizado'
    title = 'ST-DBSCAN'
    accent = 'border border-harmonized'
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
    kind = 'Celda hexagonal'
    title = 'H3 resolución 8'
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
      className="absolute inset-y-0 right-0 z-20 flex w-80 max-w-full flex-col border-l border-rule bg-card/95 backdrop-blur-xl animate-in slide-in-from-right duration-300"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>{kind}</Eyebrow>
          <h3 className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
            <span className={cn('size-2.5 shrink-0', accent)} aria-hidden />
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2"
          aria-label="Cerrar inspector"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <dl className="scrollbar-thin flex flex-1 flex-col overflow-y-auto px-5 py-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 border-b border-border py-2 font-mono text-[11px] last:border-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-border px-5 py-3 font-mono text-[10px] text-muted-foreground">Fuente: NASA FIRMS · atributos del dataset</p>
    </aside>
  )
}
