'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Moon, Pause, Play, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HFII_LEVELS,
  MONTH_SHORT,
  YEARS,
  fmt,
  formatDateEs,
  getSubunitBreakdown,
  type CalendarDay,
  type Mode,
  type Region,
} from '@/lib/pyros/data'
import type { Scene } from '@/lib/pyros/scene'
import { Eyebrow, Frame } from './ui'

interface Props {
  calendar: CalendarDay[]
  year: number
  onYearChange: (y: number) => void
  doy: number
  onDoyChange: React.Dispatch<React.SetStateAction<number>>
  mode: Mode
  region: Region
  scene: Scene
  onOpenMap: () => void
}

const WEEKDAYS = ['Lun', '', 'Mié', '', 'Vie', '', 'Dom']
const LEVEL_BG = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']

export function CalendarView({ calendar, year, onYearChange, doy, onDoyChange, mode, region, scene, onOpenMap }: Props) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const total = calendar.length

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      onDoyChange((d) => {
        if (d >= total) {
          setPlaying(false)
          return d
        }
        return d + 1
      })
    }, 160)
    return () => clearInterval(id)
  }, [playing, total, onDoyChange])

  const { weeks, monthStarts } = useMemo(() => {
    const offset = (calendar[0].date.getUTCDay() + 6) % 7
    const cols: (CalendarDay | null)[][] = []
    calendar.forEach((d, i) => {
      const idx = i + offset
      const w = Math.floor(idx / 7)
      if (!cols[w]) cols[w] = Array(7).fill(null)
      cols[w][idx % 7] = d
    })
    const starts = MONTH_SHORT.map((_, m) => Math.floor((calendar.findIndex((d) => d.date.getUTCMonth() === m) + offset) / 7))
    return { weeks: cols, monthStarts: starts }
  }, [calendar])

  const months = useMemo(() => {
    const sums = MONTH_SHORT.map((label, m) => ({ label, m, events: 0 }))
    for (const d of calendar) sums[d.date.getUTCMonth()].events += d.events
    const max = Math.max(1, ...sums.map((s) => s.events))
    const all = sums.reduce((a, s) => a + s.events, 0)
    return { sums, max, seasonShare: sums.slice(6, 10).reduce((a, s) => a + s.events, 0) / Math.max(1, all) }
  }, [calendar])

  const day = calendar[doy - 1]
  const preview = hovered !== null ? calendar[hovered - 1] : null
  const breakdown = useMemo(() => getSubunitBreakdown(region, day), [region, day])

  const orbit = useMemo(() => {
    const split = { D: { det: 0, frp: 0, ev: 0 }, N: { det: 0, frp: 0, ev: 0 } }
    for (const d of scene.detections) {
      split[d.daynight].det += 1
      split[d.daynight].frp += d.frp
    }
    for (const e of scene.events) split[e.daynight].ev += 1
    return split
  }, [scene])
  const orbitTotal = Math.max(1, orbit.D.det + orbit.N.det)
  const unitLabel = mode === 'h3' ? 'celdas' : 'eventos'
  const unitValue = (n: number) => fmt(mode === 'h3' ? Math.round(n * 1.38) : n)

  const togglePlay = () => {
    if (!playing && doy >= total) onDoyChange(1)
    setPlaying((p) => !p)
  }

  return (
    <div className="scrollbar-thin flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <Frame className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Intensidad diaria HFII · {region.name}</Eyebrow>
            <h2 className="text-2xl font-medium tracking-tight text-balance">Temporada de quemas {year}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onYearChange(Math.max(YEARS[0], year - 1))}
              disabled={year <= YEARS[0]}
              className="border border-border p-1.5 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Año anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="relative">
              <select
                aria-label="Año"
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="appearance-none border border-border bg-background py-1.5 pl-3 pr-7 font-mono text-[13px] focus-visible:outline-2"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </span>
            <button
              type="button"
              onClick={() => onYearChange(Math.min(YEARS[YEARS.length - 1], year + 1))}
              disabled={year >= YEARS[YEARS.length - 1]}
              className="border border-border p-1.5 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Año siguiente"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className={cn(
                'ml-2 flex items-center gap-2 border px-3 py-1.5 text-[13px] focus-visible:outline-2',
                playing ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-accent',
              )}
            >
              {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              {playing ? 'Pausa' : 'Reproducir temporada'}
            </button>
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto pb-1">
          <div className="flex min-w-[820px] gap-2">
            <div className="flex flex-col gap-1 pt-6" aria-hidden>
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="flex flex-1 items-center font-mono text-[10px] leading-none text-muted-foreground">
                  {w || '\u00a0'}
                </span>
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="relative h-4" aria-hidden>
                {MONTH_SHORT.map((m, i) => (
                  <span
                    key={m}
                    className={cn('absolute font-mono text-[11px] leading-none', i >= 6 && i <= 9 ? 'text-foreground' : 'text-muted-foreground')}
                    style={{ left: `${(monthStarts[i] / weeks.length) * 100}%` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex gap-1" role="grid" aria-label={`Intensidad diaria HFII ${year}`} onMouseLeave={() => setHovered(null)}>
                {weeks.map((week, wi) => (
                  <div key={wi} role="row" className="flex flex-1 flex-col gap-1">
                    {week.map((d, di) =>
                      d ? (
                        <button
                          key={d.doy}
                          type="button"
                          role="gridcell"
                          aria-label={`${d.iso}: HFII ${d.hfii}, ${HFII_LEVELS[d.level].label}`}
                          aria-selected={d.doy === doy}
                          onMouseEnter={() => setHovered(d.doy)}
                          onFocus={() => setHovered(d.doy)}
                          onClick={() => {
                            setPlaying(false)
                            onDoyChange(d.doy)
                          }}
                          className={cn(
                            'aspect-square w-full rounded-[2px] focus-visible:outline-2 focus-visible:outline-foreground',
                            LEVEL_BG[d.level],
                            d.doy === doy && 'outline outline-2 outline-offset-1 outline-harmonized',
                            hovered === d.doy && d.doy !== doy && 'outline outline-1 outline-platinum',
                          )}
                        />
                      ) : (
                        <span key={`e${di}`} className="aspect-square w-full" aria-hidden />
                      ),
                    )}
                  </div>
                ))}
              </div>
              <div className="relative h-4" aria-hidden>
                <span
                  className="absolute top-1 h-px bg-heat-4"
                  style={{
                    left: `${(monthStarts[6] / weeks.length) * 100}%`,
                    width: `${((monthStarts[10] - monthStarts[6]) / weeks.length) * 100}%`,
                  }}
                />
                <span
                  className="absolute top-2 font-mono text-[10px] text-viirs"
                  style={{ left: `${(monthStarts[6] / weeks.length) * 100}%` }}
                >
                  Temporada crítica Jul–Oct · {fmt(months.seasonShare * 100, 0)}% de la actividad
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
          <label className="flex min-w-[260px] flex-1 items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">DOY {String(doy).padStart(3, '0')}</span>
            <input
              type="range"
              min={1}
              max={total}
              value={doy}
              onChange={(e) => {
                setPlaying(false)
                onDoyChange(Number(e.target.value))
              }}
              className="h-1 flex-1 cursor-pointer accent-foreground"
              aria-label="Línea de tiempo diaria"
            />
          </label>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {HFII_LEVELS.map((l, i) => (
              <span key={l.label} className="flex items-center gap-1.5" title={`${l.label} (${l.range})`}>
                <span className={cn('size-3 rounded-[2px]', LEVEL_BG[i])} aria-hidden />
                {l.label}
              </span>
            ))}
          </div>
          <p className="w-full font-mono text-[11px] text-muted-foreground lg:w-auto" aria-live="polite">
            {preview ? `${preview.iso} · HFII ${preview.hfii} · clic para seleccionar` : '\u00a0'}
          </p>
        </div>
      </Frame>

      <div className="grid gap-6 lg:grid-cols-12">
        <Frame className="flex flex-col gap-5 p-6 lg:col-span-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Día seleccionado · {day.iso}</Eyebrow>
            <h3 className="text-xl font-medium capitalize tracking-tight">{formatDateEs(day.date)}</h3>
          </div>
          <div className="flex items-end gap-4">
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-5xl font-medium tracking-tighter tabular-nums">{day.hfii}</span>
              <span className="text-sm text-muted-foreground">/ 100 HFII</span>
            </p>
            <span className={cn('mb-2 flex items-center gap-1.5 border border-rule px-2 py-0.5 text-xs')}>
              <span className={cn('size-2 rounded-[1px]', LEVEL_BG[day.level])} aria-hidden />
              {HFII_LEVELS[day.level].label}
            </span>
          </div>
          <dl className="grid grid-cols-2 border-t border-border pt-4 font-mono text-[11px]">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">{unitLabel} armonizados</dt>
              <dd className="text-lg text-foreground">{unitValue(day.events)}</dd>
            </div>
            <div className="flex flex-col gap-1 border-l border-border pl-4">
              <dt className="text-muted-foreground">FRP calibrado</dt>
              <dd className="text-lg text-foreground">
                {fmt(day.frp)} <span className="text-[11px] text-muted-foreground">MW</span>
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onOpenMap}
            className="mt-auto flex items-center justify-between border border-foreground bg-foreground px-4 py-2.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Ver este día en el Visor Espacial
            <ArrowUpRight className="size-4" aria-hidden />
          </button>
        </Frame>

        <Frame className="flex flex-col gap-5 p-6 lg:col-span-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Pasada orbital</Eyebrow>
            <h3 className="text-[15px] font-medium tracking-tight">Actividad diurna frente a nocturna</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Las pasadas nocturnas (01:30 / 13:30 local) capturan fuegos persistentes; las diurnas, el pico de propagación.
            </p>
          </div>
          {(['D', 'N'] as const).map((k) => {
            const s = orbit[k]
            const pct = (s.det / orbitTotal) * 100
            return (
              <div key={k} className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    {k === 'D' ? <Sun className="size-3.5 text-modis" aria-hidden /> : <Moon className="size-3.5 text-platinum" aria-hidden />}
                    {k === 'D' ? 'Diurna' : 'Nocturna'}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">{fmt(pct, 0)}%</span>
                </div>
                <div className="h-1.5 bg-heat-0">
                  <div className={cn('h-full transition-all duration-500', k === 'D' ? 'bg-modis' : 'bg-platinum')} style={{ width: `${pct}%` }} />
                </div>
                <p className="flex gap-4 font-mono text-[11px] text-muted-foreground">
                  <span>{s.det} detecciones</span>
                  <span>{s.ev} eventos</span>
                  <span>{fmt(s.frp)} MW</span>
                </p>
              </div>
            )
          })}
          {scene.detections.length === 0 && (
            <p className="text-[13px] text-muted-foreground">Sin pasadas con detecciones para este día y filtros.</p>
          )}
        </Frame>

        <Frame className="flex flex-col gap-5 p-6 lg:col-span-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Desglose territorial</Eyebrow>
            <h3 className="text-[15px] font-medium tracking-tight">{breakdown.label} más afectados</h3>
          </div>
          <ol className="flex flex-col">
            {breakdown.rows.map((r, i) => (
              <li key={r.name} className="flex flex-col gap-1.5 border-b border-border py-2.5 first:pt-0 last:border-0">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {unitValue(r.events)} {unitLabel} · {fmt(r.frp)} MW
                  </span>
                </div>
                <div className="h-1 bg-heat-0">
                  <div
                    className={cn('h-full', i === 0 ? 'bg-viirs' : 'bg-platinum/60')}
                    style={{ width: `${(r.share / breakdown.rows[0].share) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Frame>
      </div>

      <Frame className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Estacionalidad</Eyebrow>
            <h3 className="text-[15px] font-medium tracking-tight">{unitLabel === 'celdas' ? 'Celdas' : 'Eventos'} armonizados por mes</h3>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Σ {unitValue(months.sums.reduce((a, s) => a + s.events, 0))}</span>
        </div>
        <div className="flex h-32 items-end gap-2" role="img" aria-label="Eventos armonizados por mes">
          {months.sums.map((s) => (
            <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{s.events ? unitValue(s.events) : ''}</span>
              <div
                className={cn('w-full transition-all duration-500', s.m >= 6 && s.m <= 9 ? 'bg-viirs' : 'bg-heat-2')}
                style={{ height: `${Math.max(2, (s.events / months.max) * 80)}%` }}
              />
              <span className={cn('font-mono text-[10px]', s.m === day.date.getUTCMonth() ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  )
}
