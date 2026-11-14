'use client'

import { ChevronDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HFII_LEVELS,
  MODE_LABEL,
  REGIONS,
  VIIRS_START,
  fmt,
  hfiiLevel,
  type Filters,
  type Kpis,
  type Mode,
} from '@/lib/pyros/data'
import { Segmented } from './ui'
import { VIEWS, type View } from './app-sidebar'

interface Props {
  view: View
  mode: Mode
  onModeChange: (m: Mode) => void
  regionId: string
  onRegionChange: (id: string) => void
  filters: Filters
  onFiltersChange: (f: Filters) => void
  year: number
  kpis: Kpis
}

const MODES: { id: Mode; short: string }[] = [
  { id: 'raw', short: 'Crudo' },
  { id: 'dbscan', short: 'ST-DBSCAN' },
  { id: 'h3', short: 'Grilla H3' },
]

type Tone = 'raw' | 'ok' | 'neutral'
interface Tick {
  id: string
  label: string
  value: string
  unit: string
  note: string
  tone: Tone
}

function buildTicker(mode: Mode, k: Kpis): Tick[] {
  const raw = mode === 'raw'
  const hfii = raw ? k.hfiiRaw : k.hfii
  const level = HFII_LEVELS[hfiiLevel(hfii)].label
  if (raw) {
    return [
      {
        id: 'k1',
        label: 'Conteo de fuegos',
        value: fmt(k.rawCount),
        unit: 'focos',
        note: k.viirsCount ? `${fmt(k.dupFactor, 1)}x sobre-conteo` : 'solo MODIS',
        tone: 'raw',
      },
      {
        id: 'k2',
        label: 'FRP',
        value: fmt(k.rawFrp),
        unit: 'MW',
        note: `+${fmt((k.rawFrp / Math.max(k.calFrp, 1) - 1) * 100, 0)}% sin calibrar`,
        tone: 'raw',
      },
      { id: 'k3', label: 'Índice HFII', value: String(hfii), unit: '/100', note: `${level} · inflado`, tone: 'raw' },
      { id: 'k4', label: 'Área quemada', value: fmt(k.rawAreaKm2), unit: 'km²', note: 'Σ scan × track', tone: 'raw' },
    ]
  }
  const dbscan = mode === 'dbscan'
  return [
    {
      id: 'k1',
      label: 'Conteo de fuegos',
      value: dbscan ? fmt(k.events) : fmt(k.h3Cells),
      unit: dbscan ? 'incendios' : 'celdas',
      note: dbscan ? `−${fmt(k.reduction * 100, 1)}% duplicación` : `${fmt(k.cellsPerDay, 1)} celdas / día`,
      tone: 'ok',
    },
    {
      id: 'k2',
      label: 'FRP calibrado',
      value: dbscan ? fmt(k.calFrp) : fmt(k.frpDensity, 1),
      unit: dbscan ? 'MW' : 'MW/km²',
      note: 'base MODIS',
      tone: 'ok',
    },
    { id: 'k3', label: 'Índice HFII', value: String(hfii), unit: '/100', note: level, tone: 'neutral' },
    {
      id: 'k4',
      label: 'Área quemada',
      value: fmt((dbscan ? k.hullAreaKm2 : k.h3AreaKm2) * 100),
      unit: 'ha',
      note: dbscan ? 'ST_ConvexHull' : 'H3 res. 8',
      tone: 'neutral',
    },
  ]
}

export function ControlHeader({ view, mode, onModeChange, regionId, onRegionChange, filters, onFiltersChange, year, kpis }: Props) {
  const viirsUnavailable = year < VIIRS_START
  const toggleSat = (key: 'modis' | 'viirs') => onFiltersChange({ ...filters, [key]: !filters[key] })
  const current = VIEWS.find((v) => v.id === view)!
  const ticker = buildTicker(mode, kpis)

  return (
    <header className="relative z-30 shrink-0 border-b border-border bg-background">
      <div className="flex h-14 flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-5">
        <h1 className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{current.index} /</span>
          <span className="text-[15px] font-medium tracking-tight">{current.label}</span>
        </h1>

        <label className="flex items-center gap-2">
          <span className="sr-only">Área de estudio</span>
          <span className="relative">
            <select
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              className="appearance-none rounded-[3px] border border-border bg-card py-1.5 pl-2.5 pr-7 text-[13px] text-foreground focus-visible:outline-2"
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

        <div className="ml-auto flex items-center gap-3">
          <span className="eyebrow hidden xl:inline">Procesamiento</span>
          <Segmented
            label="Modo de procesamiento"
            size="md"
            value={mode}
            onChange={onModeChange}
            options={MODES.map((m) => ({ id: m.id, label: m.short, title: MODE_LABEL[m.id] }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-5 py-2 text-xs">
        <Segmented
          label="Pasada orbital"
          value={filters.orbit}
          onChange={(orbit) => onFiltersChange({ ...filters, orbit })}
          options={[
            { id: 'all', label: 'D + N' },
            { id: 'D', label: 'Día' },
            { id: 'N', label: 'Noche' },
          ]}
        />

        <button
          type="button"
          role="switch"
          aria-checked={filters.confidence}
          onClick={() => onFiltersChange({ ...filters, confidence: !filters.confidence })}
          className="flex items-center gap-2 focus-visible:outline-2"
        >
          <span className={cn('relative h-3.5 w-6 rounded-full border transition-colors', filters.confidence ? 'border-harmonized bg-harmonized' : 'border-rule bg-transparent')}>
            <span
              className={cn(
                'absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-all',
                filters.confidence ? 'left-3 bg-background' : 'left-0.5 bg-muted-foreground',
              )}
            />
          </span>
          <span className="font-mono text-[11px]">
            {'Confianza > 30%'}{' '}
            <span className="text-muted-foreground">{filters.confidence ? 'activo' : 'inactivo'}</span>
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={filters.modis}
            onClick={() => toggleSat('modis')}
            className={cn(
              'flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-2',
              filters.modis ? 'border-modis/50 text-foreground' : 'border-border text-muted-foreground',
            )}
          >
            <span className={cn('size-2 border border-modis', filters.modis && 'bg-modis/40')} aria-hidden />
            MODIS
          </button>
          <button
            type="button"
            aria-pressed={filters.viirs}
            onClick={() => toggleSat('viirs')}
            className={cn(
              'flex items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-2',
              filters.viirs ? 'border-viirs/50 text-foreground' : 'border-border text-muted-foreground',
              viirsUnavailable && 'opacity-50',
            )}
          >
            <span className={cn('size-2 bg-viirs', !filters.viirs && 'opacity-30')} aria-hidden />
            VIIRS
          </button>
          <span className="group relative">
            <button type="button" aria-describedby="viirs-tip" className="flex p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2">
              <Info className="size-3.5" aria-hidden />
              <span className="sr-only">Transición de la constelación VIIRS</span>
            </button>
            <span
              id="viirs-tip"
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 border border-rule bg-card p-3 text-[11px] leading-relaxed text-platinum opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <span className="eyebrow mb-1.5 block">S-NPP → NOAA-20 → NOAA-21</span>
              Suomi-NPP (2012) inició la serie de 375 m. NOAA-20 (JPSS-1, 2018) asumió la órbita primaria y NOAA-21 (JPSS-2,
              2023) completa la constelación. PyrosHarmonizer intercalibra los tres para evitar conteos múltiples entre pasadas
              cercanas.
            </span>
          </span>
        </div>

        {viirsUnavailable && <span className="font-mono text-[11px] text-modis">VIIRS no disponible antes de {VIIRS_START}</span>}

        <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground 2xl:inline">EPSG:4326 · {MODE_LABEL[mode]}</span>
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4" aria-label={`Indicadores ${year}`}>
        {ticker.map((t, i) => (
          <div
            key={t.id}
            className={cn(
              'flex min-w-0 flex-col gap-0.5 px-5 py-2',
              i > 0 && 'lg:border-l lg:border-border',
              i % 2 === 1 && 'border-l border-border',
              i > 1 && 'border-t border-border lg:border-t-0',
            )}
          >
            <dt className="eyebrow flex items-center justify-between gap-2">
              <span className="truncate">{t.label}</span>
              <span className="tabular-nums">KPI-0{i + 1}</span>
            </dt>
            <dd className="flex min-w-0 items-baseline gap-1.5">
              <span
                className={cn(
                  'font-mono text-lg font-medium tracking-tight tabular-nums transition-colors',
                  t.tone === 'raw' ? 'text-viirs' : 'text-foreground',
                )}
              >
                {t.value}
              </span>
              <span className="text-[11px] text-muted-foreground">{t.unit}</span>
              <span
                className={cn(
                  'ml-auto truncate font-mono text-[11px]',
                  t.tone === 'raw' ? 'text-viirs/80' : t.tone === 'ok' ? 'text-calibrated' : 'text-platinum',
                )}
              >
                {t.note}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </header>
  )
}
