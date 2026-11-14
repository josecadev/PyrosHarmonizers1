'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Calendar, ChevronDown, ChevronLeft, ChevronRight, Grid3X3, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  HFII_LEVELS,
  MONTH_SHORT,
  YEARS,
  fmt,
  getMonthlyMatrix,
  type CalendarDay,
  type Mode,
  type Region,
} from '@/lib/pyros/data'

interface Props {
  calendar: CalendarDay[]
  year: number
  onYearChange: (y: number) => void
  doy: number
  onDoyChange: React.Dispatch<React.SetStateAction<number>>
  mode: Mode
  region: Region
}

const WEEKDAYS = ['L', '', 'X', '', 'V', '', 'D']
const LEVEL_BG = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4']
const dateFmt = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function BurnCalendar({ calendar, year, onYearChange, doy, onDoyChange, mode, region }: Props) {
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const [calMode, setCalMode] = useState<'daily' | 'matrix'>('daily')
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
    const starts = MONTH_SHORT.map((_, m) => {
      const first = calendar.findIndex((d) => d.date.getUTCMonth() === m)
      return Math.floor((first + offset) / 7)
    })
    return { weeks: cols, monthStarts: starts }
  }, [calendar])

  const matrix = useMemo(() => getMonthlyMatrix(region), [region])

  const focus = calendar[(hovered ?? doy) - 1] ?? calendar[0]
  const currentMonthIdx = focus.date.getUTCMonth()
  const yearRow = matrix.cells[year - YEARS[0]] ?? matrix.cells[0]
  const activeMonthCell = yearRow?.[currentMonthIdx]
  const onsetDelta = matrix.onsetDeltaDays[year] ?? 0

  const seasonTotal = calendar.filter((d) => d.date.getUTCMonth() >= 6 && d.date.getUTCMonth() <= 9)
  const seasonShare =
    seasonTotal.reduce((s, d) => s + d.events, 0) / Math.max(1, calendar.reduce((s, d) => s + d.events, 0))

  const togglePlay = () => {
    if (!playing && doy >= total) onDoyChange(1)
    setPlaying((p) => !p)
  }

  return (
    <section aria-label="Calendario de Actividad de Quemas" className="shrink-0 border-t border-border bg-card/90 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:gap-6">
        <div className="flex shrink-0 flex-col gap-2.5 xl:w-72">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-medium">Calendario de Quemas</h2>
            <div className="flex rounded border border-border bg-background p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setCalMode('daily')}
                className={cn(
                  'flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono transition-colors',
                  calMode === 'daily' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Calendar className="size-2.5" aria-hidden />
                365d
              </button>
              <button
                type="button"
                onClick={() => setCalMode('matrix')}
                className={cn(
                  'flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono transition-colors',
                  calMode === 'matrix' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Grid3X3 className="size-2.5" aria-hidden />
                2000–2026
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onYearChange(Math.max(YEARS[0], year - 1))}
              disabled={year <= YEARS[0]}
              className="rounded border border-border p-1 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Año anterior"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </button>
            <span className="relative">
              <select
                aria-label="Año"
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="appearance-none rounded border border-border bg-background py-1 pl-2 pr-6 font-mono text-xs focus-visible:outline-2"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </span>
            <button
              type="button"
              onClick={() => onYearChange(Math.min(YEARS[YEARS.length - 1], year + 1))}
              disabled={year >= YEARS[YEARS.length - 1]}
              className="rounded border border-border p-1 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
              aria-label="Año siguiente"
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className={cn(
                'ml-auto flex items-center gap-1.5 rounded border px-2 py-1 text-xs focus-visible:outline-2',
                playing ? 'border-harmonized/60 text-harmonized' : 'border-border hover:bg-accent',
              )}
            >
              {playing ? <Pause className="size-3" aria-hidden /> : <Play className="size-3" aria-hidden />}
              {playing ? 'Pausa' : 'Reproducir'}
            </button>
          </div>

          <div className="rounded border border-border bg-background px-3 py-2" aria-live="polite">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs capitalize">{dateFmt.format(focus.date)}</p>
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
                P{Math.round(focus.percentileRank * 100)} · Z={focus.zScore >= 0 ? `+${focus.zScore}` : focus.zScore}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="flex flex-col">
                <span className="text-muted-foreground">HFII ({focus.severityCode})</span>
                <span>{focus.hfii} / 100</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">{mode === 'h3' ? 'celdas' : 'eventos'}</span>
                <span>{fmt(mode === 'h3' ? Math.round(focus.events * 1.38) : focus.events)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">FRP Cal.</span>
                <span>{fmt(focus.frp)} MW</span>
              </div>
            </div>
            {activeMonthCell && (
              <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5 font-mono text-[10px]">
                <span
                  className={cn(
                    'flex items-center gap-1',
                    activeMonthCell.alertLevel === 'RED'
                      ? 'text-viirs'
                      : activeMonthCell.alertLevel === 'ORANGE'
                        ? 'text-amber-400'
                        : 'text-muted-foreground',
                  )}
                >
                  {activeMonthCell.zScore >= 1.5 && <AlertTriangle className="size-3 shrink-0" aria-hidden />}
                  Mes {MONTH_SHORT[currentMonthIdx]}: Z={activeMonthCell.zScore >= 0 ? `+${activeMonthCell.zScore}` : activeMonthCell.zScore} (
                  {activeMonthCell.alertLevel})
                </span>
                <span className="text-muted-foreground">
                  Inicio: {onsetDelta < 0 ? `${Math.abs(onsetDelta)}d antes` : onsetDelta > 0 ? `+${onsetDelta}d` : 'Normal'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {calMode === 'daily' ? (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="flex min-w-[720px] gap-1.5">
                <div className="flex flex-col gap-[3px] pt-4" aria-hidden>
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="flex h-3 items-center font-mono text-[9px] leading-none text-muted-foreground">
                      {w}
                    </span>
                  ))}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="relative h-3" aria-hidden>
                    {MONTH_SHORT.map((m, i) => (
                      <span
                        key={m}
                        className={cn(
                          'absolute font-mono text-[10px] leading-none',
                          i >= 6 && i <= 9 ? 'text-foreground' : 'text-muted-foreground',
                        )}
                        style={{ left: `${(monthStarts[i] / weeks.length) * 100}%` }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <div
                    className="flex gap-[3px]"
                    role="grid"
                    aria-label={`Intensidad diaria HFII ${year}`}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {weeks.map((week, wi) => (
                      <div key={wi} role="row" className="flex flex-1 flex-col gap-[3px]">
                        {week.map((d, di) =>
                          d ? (
                            <button
                              key={d.doy}
                              type="button"
                              role="gridcell"
                              aria-label={`${d.iso}: HFII ${d.hfii}, ${HFII_LEVELS[d.level].label}, Z=${d.zScore}`}
                              aria-selected={d.doy === doy}
                              onMouseEnter={() => setHovered(d.doy)}
                              onFocus={() => setHovered(d.doy)}
                              onClick={() => {
                                setPlaying(false)
                                onDoyChange(d.doy)
                              }}
                              className={cn(
                                'h-3 w-full rounded-[2px] transition-[outline] focus-visible:outline-2 focus-visible:outline-foreground',
                                LEVEL_BG[d.level],
                                d.doy === doy && 'outline outline-2 outline-offset-1 outline-harmonized',
                                hovered === d.doy && d.doy !== doy && 'outline outline-1 outline-foreground/60',
                              )}
                            />
                          ) : (
                            <span key={`e${di}`} className="h-3 w-full" aria-hidden />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-1 h-1" aria-hidden>
                    <span
                      className="absolute top-0 h-px bg-heat-4/60"
                      style={{
                        left: `${(monthStarts[6] / weeks.length) * 100}%`,
                        width: `${((monthStarts[10] - monthStarts[6]) / weeks.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <div className="flex min-w-[760px] flex-col gap-1">
                <div className="flex items-center gap-1 pl-10 font-mono text-[9px] text-muted-foreground">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => onYearChange(y)}
                      className={cn(
                        'flex-1 text-center transition-colors hover:text-foreground',
                        y === year && 'font-bold text-harmonized',
                      )}
                    >
                      {String(y).slice(2)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-[2px]" role="grid" aria-label="Matriz multianual 2000-2026">
                  {[6, 7, 8, 9, 10].map((mIdx) => (
                    <div key={mIdx} role="row" className="flex items-center gap-1">
                      <span className="w-9 shrink-0 font-mono text-[9px] text-muted-foreground">{MONTH_SHORT[mIdx]}</span>
                      <div className="flex flex-1 gap-[2px]">
                        {matrix.cells.map((yRow) => {
                          const cell = yRow[mIdx]
                          const isSelected = cell.year === year && currentMonthIdx === mIdx
                          return (
                            <button
                              key={`${cell.year}-${mIdx}`}
                              type="button"
                              role="gridcell"
                              title={`${MONTH_SHORT[mIdx]} ${cell.year} · HFII medio ${cell.hfiiMean} · Z=${cell.zScore >= 0 ? '+' : ''}${cell.zScore} (${cell.alertLevel})`}
                              onClick={() => {
                                setPlaying(false)
                                onYearChange(cell.year)
                                onDoyChange(cell.peakDoy)
                              }}
                              className={cn(
                                'h-3.5 flex-1 rounded-[2px] transition-all',
                                LEVEL_BG[cell.level],
                                cell.alertLevel === 'RED' && 'ring-1 ring-viirs',
                                isSelected && 'outline outline-2 outline-offset-1 outline-harmonized',
                              )}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="flex min-w-[240px] flex-1 items-center gap-3">
              <span className="font-mono text-[11px] text-muted-foreground">DOY {String(doy).padStart(3, '0')}</span>
              <input
                type="range"
                min={1}
                max={total}
                value={doy}
                onChange={(e) => {
                  setPlaying(false)
                  onDoyChange(Number(e.target.value))
                }}
                className="h-1 flex-1 cursor-pointer accent-harmonized"
                aria-label="Línea de tiempo diaria"
              />
            </label>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>HFII</span>
              {HFII_LEVELS.map((l, i) => (
                <span key={l.label} className="flex items-center gap-1" title={`${l.label} (${l.range} · ${l.percentile})`}>
                  <span className={cn('size-2.5 rounded-[2px]', LEVEL_BG[i])} aria-hidden />
                  <span className="hidden sm:inline">
                    {l.label} ({l.percentile})
                  </span>
                </span>
              ))}
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Jul–Oct: <span className="text-foreground">{fmt(seasonShare * 100, 0)}%</span> de la actividad anual
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
