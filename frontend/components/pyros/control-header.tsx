'use client'

import { useState } from 'react'
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, Flame, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODE_LABEL, REGIONS, VIIRS_START, type CalendarDay, type Filters, type Kpis, type Mode, type Region } from '@/lib/pyros/data'
import type { Scene } from '@/lib/pyros/scene'
import { exportCsv, exportGeoJson, exportPdf } from '@/lib/pyros/exporters'

interface Props {
  mode: Mode
  onModeChange: (m: Mode) => void
  regionId: string
  onRegionChange: (id: string) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
  region: Region
  year: number
  kpis: Kpis
  scene: Scene
  calendar: CalendarDay[]
}

const MODES: { id: Mode; short: string }[] = [
  { id: 'raw', short: 'Crudo' },
  { id: 'dbscan', short: 'ST-DBSCAN' },
  { id: 'h3', short: 'Grilla H3' },
]

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
}: {
  value: T
  options: { id: T; label: string; title?: string }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center rounded-md border border-border bg-background p-0.5">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              'rounded-[4px] font-medium transition-colors focus-visible:outline-2',
              size === 'md' ? 'px-3 py-1.5 text-[13px]' : 'px-2 py-1 text-xs',
              active ? 'bg-accent text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function ControlHeader(props: Props) {
  const { mode, onModeChange, regionId, onRegionChange, filters, onFiltersChange, year } = props
  const [exportOpen, setExportOpen] = useState(false)
  const viirsUnavailable = year < VIIRS_START

  const toggleSat = (key: 'modis' | 'viirs') => onFiltersChange({ ...filters, [key]: !filters[key] })

  return (
    <header className="relative z-30 shrink-0 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-background">
            <Flame className="size-4 text-harmonized" aria-hidden />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">PyrosHarmonizer</span>
            <span className="text-[11px] text-muted-foreground">Calendario Unificado de Regímenes de Fuego</span>
          </div>
          <span className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            NASA FIRMS C6.1 / 375m
          </span>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-border md:block" aria-hidden />

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Caso de estudio</span>
          <span className="relative">
            <select
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              className="appearance-none rounded-md border border-border bg-background py-1.5 pl-2.5 pr-7 text-[13px] text-foreground focus-visible:outline-2"
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </span>
        </label>

        <div className="flex flex-1 items-center justify-end gap-3 lg:justify-center">
          <span className="hidden text-xs text-muted-foreground xl:inline">Modo de Procesamiento</span>
          <Segmented
            label="Modo de Procesamiento"
            size="md"
            value={mode}
            onChange={onModeChange}
            options={MODES.map((m) => ({ id: m.id, label: m.short, title: MODE_LABEL[m.id] }))}
          />
        </div>

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-medium hover:bg-accent focus-visible:outline-2"
          >
            <Download className="size-3.5" aria-hidden />
            Exportar
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </button>
          {exportOpen && (
            <>
              <button
                type="button"
                aria-label="Cerrar menú"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setExportOpen(false)}
              />
              <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-md border border-border bg-card p-1 shadow-xl">
                {[
                  { icon: FileJson, label: 'GeoJSON', hint: 'Geometrías de la capa activa', run: () => exportGeoJson(props) },
                  { icon: FileSpreadsheet, label: 'CSV Armonizado', hint: 'Serie diaria HFII + eventos', run: () => exportCsv(props) },
                  { icon: FileText, label: 'Reporte Ejecutivo PDF', hint: 'Resumen para brigadas', run: () => exportPdf(props) },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      item.run()
                      setExportOpen(false)
                    }}
                    className="flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <item.icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                    <span className="flex flex-col">
                      <span className="text-[13px]">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-4 py-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Pasada orbital</span>
          <Segmented
            label="Pasada orbital"
            value={filters.orbit}
            onChange={(orbit) => onFiltersChange({ ...filters, orbit })}
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'D', label: 'Día (D)' },
              { id: 'N', label: 'Noche (N)' },
            ]}
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={filters.confidence}
          onClick={() => onFiltersChange({ ...filters, confidence: !filters.confidence })}
          className="flex items-center gap-2 rounded-md px-1 py-0.5 focus-visible:outline-2"
        >
          <span className={cn('relative h-4 w-7 rounded-full border border-border transition-colors', filters.confidence ? 'bg-harmonized/80' : 'bg-background')}>
            <span className={cn('absolute top-0.5 size-2.5 rounded-full bg-foreground transition-all', filters.confidence ? 'left-3.5' : 'left-0.5')} />
          </span>
          <span className="font-mono text-[11px]">
            {'> 30% Nominal/High'}{' '}
            <span className={filters.confidence ? 'text-harmonized' : 'text-muted-foreground'}>
              {filters.confidence ? '(Filtro Activo)' : '(Inactivo)'}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Satélites</span>
          <button
            type="button"
            aria-pressed={filters.modis}
            onClick={() => toggleSat('modis')}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors focus-visible:outline-2',
              filters.modis ? 'border-modis/50 text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            <span className={cn('size-2 rounded-sm border border-modis', filters.modis && 'bg-modis/40')} aria-hidden />
            Terra/Aqua (MODIS)
          </button>
          <button
            type="button"
            aria-pressed={filters.viirs}
            onClick={() => toggleSat('viirs')}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors focus-visible:outline-2',
              filters.viirs ? 'border-viirs/50 text-foreground' : 'border-border text-muted-foreground',
              viirsUnavailable && 'opacity-50',
            )}
          >
            <span className={cn('size-2 rounded-sm bg-viirs', !filters.viirs && 'opacity-30')} aria-hidden />
            S-NPP / NOAA-20 / NOAA-21 (VIIRS)
          </button>
          <span className="group relative">
            <button type="button" aria-describedby="viirs-tip" className="flex rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2">
              <Info className="size-3.5" aria-hidden />
              <span className="sr-only">Información sobre la constelación VIIRS</span>
            </button>
            <span
              id="viirs-tip"
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-md border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground opacity-0 shadow-xl transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <span className="mb-1 block font-medium text-foreground">Transición operativa VIIRS</span>
              Suomi-NPP (2012) inició la serie de 375 m. NOAA-20 (JPSS-1, 2018) asumió la órbita primaria y NOAA-21
              (JPSS-2, 2023) completa la constelación; S-NPP pasó a rol secundario. PyrosHarmonizer intercalibra los
              tres para evitar conteos múltiples entre pasadas cercanas.
            </span>
          </span>
        </div>

        {viirsUnavailable && (
          <span className="font-mono text-[11px] text-modis">VIIRS no disponible antes de {VIIRS_START} · solo MODIS</span>
        )}

        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground xl:inline">
          EPSG:4326 · FIRMS NRT/SP · {MODE_LABEL[mode]}
        </span>
      </div>
    </header>
  )
}
