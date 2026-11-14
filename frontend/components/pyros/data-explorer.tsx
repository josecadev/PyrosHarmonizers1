'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODE_LABEL, fmt, type CalendarDay, type Kpis, type Mode, type Region } from '@/lib/pyros/data'
import type { Scene } from '@/lib/pyros/scene'
import { exportCsv, exportGeoJson, exportPdf } from '@/lib/pyros/exporters'
import { Eyebrow, Frame } from './ui'

interface Props {
  mode: Mode
  region: Region
  year: number
  kpis: Kpis
  scene: Scene
  calendar: CalendarDay[]
  day: CalendarDay
}

const PAGE = 14
const clusterId = (date: string, id: number) => `PH-${date.replaceAll('-', '')}-${String(id).padStart(2, '0')}`

export function DataExplorer({ mode, region, year, kpis, scene, calendar, day }: Props) {
  const [page, setPage] = useState(0)
  const groupByH3 = mode === 'h3'

  const rows = useMemo(() => {
    const list = [...scene.detections]
    list.sort((a, b) =>
      groupByH3 ? a.h3.localeCompare(b.h3) || a.sensor.localeCompare(b.sensor) : a.clusterId - b.clusterId || a.sensor.localeCompare(b.sensor),
    )
    return list
  }, [scene, groupByH3])

  const groups = useMemo(() => new Set(rows.map((r) => (groupByH3 ? r.h3 : r.clusterId))).size, [rows, groupByH3])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const current = Math.min(page, pages - 1)
  const slice = rows.slice(current * PAGE, current * PAGE + PAGE)

  const ctx = { mode, region, year, kpis, scene, calendar }
  const exportsList = [
    {
      id: 'geojson',
      icon: FileJson,
      title: 'Capa espacial GeoJSON',
      body:
        mode === 'raw'
          ? 'Huellas scan × track de cada detección cruda del día activo.'
          : mode === 'dbscan'
            ? 'Envolventes convexas de los incendios unificados por ST-DBSCAN.'
            : 'Polígonos hexagonales H3 res. 8 con densidad FRP.',
      file: `pyrosharmonizer_${region.id}_${year}_${mode}.geojson`,
      meta: `${mode === 'raw' ? scene.detections.length : mode === 'dbscan' ? scene.events.length : scene.activeHexes.length} features · EPSG:4326`,
      run: () => exportGeoJson(ctx),
    },
    {
      id: 'csv',
      icon: FileSpreadsheet,
      title: 'Serie temporal CSV',
      body: 'HFII, eventos armonizados y FRP calibrado para cada día del año.',
      file: `pyrosharmonizer_${region.id}_${year}_armonizado.csv`,
      meta: `${calendar.length} filas · 6 columnas`,
      run: () => exportCsv(ctx),
    },
    {
      id: 'pdf',
      icon: FileText,
      title: 'Reporte ejecutivo PDF',
      body: 'Resumen de indicadores y recomendación operativa para brigadas de emergencia.',
      file: `reporte_${region.id}_${year}.pdf`,
      meta: 'Imprimir / guardar como PDF',
      run: () => exportPdf(ctx),
    },
  ]

  return (
    <div className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <Frame className="flex flex-col">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-6">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>
              Registros FIRMS · {day.iso} · {MODE_LABEL[mode]}
            </Eyebrow>
            <h2 className="text-xl font-medium tracking-tight">{groupByH3 ? 'Asignación de detecciones a celdas H3' : 'De registros crudos a clústeres armonizados'}</h2>
          </div>
          <p className="flex items-center gap-3 font-mono text-[13px]">
            <span className="text-viirs">{fmt(rows.length)} registros</span>
            <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
            <span>
              {fmt(groups)} {groupByH3 ? 'celdas' : 'clústeres'}
            </span>
          </p>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left font-mono text-[11px]">
            <caption className="sr-only">Detecciones del día {day.iso}</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {['id', 'sensor', 'satellite', 'latitude', 'longitude', 'acq_time', 'dn', 'conf', 'frp', groupByH3 ? 'h3_index' : 'cluster_id'].map((h, i) => (
                  <th key={h} scope="col" className={cn('px-4 py-2.5 font-normal uppercase tracking-wider', i === 9 && 'text-foreground', (i === 3 || i === 4 || i === 8) && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map((d, i) => {
                const group = groupByH3 ? d.h3 : clusterId(d.acq_date, d.clusterId)
                const prev = slice[i - 1]
                const newGroup = !prev || (groupByH3 ? prev.h3 !== d.h3 : prev.clusterId !== d.clusterId)
                return (
                  <tr key={d.id} className={cn('hover:bg-accent', newGroup && i > 0 ? 'border-t border-rule' : 'border-t border-border/50')}>
                    <td className="px-4 py-2 text-muted-foreground">{d.id}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        <span className={cn('size-2 shrink-0', d.sensor === 'VIIRS' ? 'bg-viirs' : 'border border-modis')} aria-hidden />
                        {d.sensor}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{d.satellite}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.latitude.toFixed(5)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.longitude.toFixed(5)}</td>
                    <td className="px-4 py-2 tabular-nums">{d.acq_time}</td>
                    <td className="px-4 py-2">{d.daynight}</td>
                    <td className="px-4 py-2 text-muted-foreground">{d.confidence}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.frp.toFixed(1)}</td>
                    <td className="px-4 py-2">
                      <span className={cn(newGroup ? 'text-foreground' : 'text-muted-foreground/60')}>{newGroup ? group : '└ ' + group}</span>
                    </td>
                  </tr>
                )
              })}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center font-sans text-[13px] text-muted-foreground">
                    Sin detecciones para este día y filtros. Selecciona un día de temporada en el Calendario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-3 font-mono text-[11px] text-muted-foreground">
          <span>
            {rows.length ? `${current * PAGE + 1}–${Math.min(rows.length, (current + 1) * PAGE)}` : '0'} de {fmt(rows.length)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, current - 1))}
              disabled={current === 0}
              className="border border-border p-1 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </button>
            <span className="tabular-nums">
              {current + 1} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pages - 1, current + 1))}
              disabled={current >= pages - 1}
              className="border border-border p-1 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </Frame>

      <section aria-labelledby="export-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Centro de exportación</Eyebrow>
          <h2 id="export-title" className="text-xl font-medium tracking-tight">
            Descargar productos armonizados
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {exportsList.map((e) => (
            <Frame key={e.id} as="article" className="flex flex-col gap-4 p-6">
              <e.icon className="size-5 text-platinum" aria-hidden />
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[15px] font-medium tracking-tight">{e.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{e.body}</p>
              </div>
              <dl className="flex flex-col gap-1 border-t border-border pt-3 font-mono text-[11px]">
                <dt className="sr-only">Archivo</dt>
                <dd className="truncate">{e.file}</dd>
                <dt className="sr-only">Contenido</dt>
                <dd className="text-muted-foreground">{e.meta}</dd>
              </dl>
              <button
                type="button"
                onClick={e.run}
                className="mt-auto flex items-center justify-center gap-2 border border-rule px-4 py-2 text-[13px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-2"
              >
                <Download className="size-3.5" aria-hidden />
                Exportar
              </button>
            </Frame>
          ))}
        </div>
      </section>
    </div>
  )
}
