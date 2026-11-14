'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  CHOW_TEST_METRICS,
  FRP_INTERCEPT,
  FRP_R2,
  FRP_SLOPE,
  GAMMA_DAY,
  GAMMA_NIGHT,
  HFII_ALPHA,
  HFII_BETA,
  HFII_KAPPA,
  VIIRS_START,
  fmt,
  mulberry32,
  type Filters,
  type HistoryPoint,
  type Kpis,
  type Mode,
} from '@/lib/pyros/data'
import type { Scene } from '@/lib/pyros/scene'
import { Eyebrow, Frame, chartAxis, chartTooltip } from './ui'

interface Props {
  mode: Mode
  history: HistoryPoint[]
  year: number
  scene: Scene
  kpis: Kpis
  filters: Filters
}

function Cell2({
  eyebrow,
  title,
  body,
  className,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Frame as="article" className={cn('flex flex-col gap-5 p-6', className)}>
      <header className="flex flex-col gap-1.5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-lg font-medium tracking-tight text-balance">{title}</h3>
        <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground text-pretty">{body}</p>
      </header>
      {children}
    </Frame>
  )
}

const DT_WINDOW = 3.5
const PLATFORMS = [
  { id: 'Terra', sensor: 'MODIS', from: 2000, cls: 'bg-modis' },
  { id: 'Aqua', sensor: 'MODIS', from: 2002, cls: 'bg-modis/60' },
  { id: 'Suomi-NPP', sensor: 'VIIRS', from: 2012, cls: 'bg-viirs' },
  { id: 'NOAA-20', sensor: 'VIIRS', from: 2018, cls: 'bg-viirs/65' },
  { id: 'NOAA-21', sensor: 'VIIRS', from: 2023, cls: 'bg-viirs/35' },
]
const SPAN_START = 2000
const SPAN_END = 2026

export function LabView({ mode, history, year, scene, kpis, filters }: Props) {
  const [visibleCurves, setVisibleCurves] = useState({
    modis: true,
    viirs: true,
    raw: true,
    harmonized: true,
  })

  const toggleCurve = (key: keyof typeof visibleCurves) =>
    setVisibleCurves((prev) => ({ ...prev, [key]: !prev[key] }))

  const scatter = useMemo(() => {
    const rand = mulberry32(year * 31 + kpis.events)
    return Array.from({ length: 90 }, () => {
      const v = 3 + rand() ** 1.6 * 85
      const m = FRP_SLOPE * v + FRP_INTERCEPT + (rand() - 0.5) * (6 + v * 0.35)
      return { viirs: Math.round(v * 10) / 10, modis: Math.max(0.5, Math.round(m * 10) / 10) }
    })
  }, [year, kpis.events])
  const rmse = Math.sqrt(scatter.reduce((s, p) => s + (p.modis - (FRP_SLOPE * p.viirs + FRP_INTERCEPT)) ** 2, 0) / scatter.length)

  const dtBins = useMemo(() => {
    const rand = mulberry32(year * 17 + kpis.rawCount)
    const bins = Array.from({ length: 12 }, (_, i) => ({ bin: i * 0.5, label: (i * 0.5).toFixed(1), n: 0 }))
    const samples = Math.max(20, Math.min(400, Math.round(kpis.viirsCount / 8)))
    for (let i = 0; i < samples; i++) {
      const dt = rand() < 0.8 ? Math.abs(2.9 + (rand() + rand() - 1) * 1.4) : rand() * 6
      bins[Math.min(11, Math.floor(dt / 0.5))].n += 1
    }
    return bins
  }, [year, kpis.rawCount, kpis.viirsCount])
  const matched = dtBins.filter((b) => b.bin < DT_WINDOW).reduce((s, b) => s + b.n, 0)
  const totalDt = dtBins.reduce((s, b) => s + b.n, 0)

  const shares = useMemo(() => {
    const viirsOn = filters.viirs && year >= VIIRS_START
    const w: Record<string, number> = {
      Terra: filters.modis ? kpis.modisCount * 0.48 : 0,
      Aqua: filters.modis && year >= 2002 ? kpis.modisCount * 0.52 : 0,
      'Suomi-NPP': viirsOn ? kpis.viirsCount * (year >= 2023 ? 0.28 : year >= 2018 ? 0.45 : 1) : 0,
      'NOAA-20': viirsOn && year >= 2018 ? kpis.viirsCount * (year >= 2023 ? 0.38 : 0.55) : 0,
      'NOAA-21': viirsOn && year >= 2023 ? kpis.viirsCount * 0.34 : 0,
    }
    const total = Object.values(w).reduce((a, b) => a + b, 0) || 1
    return PLATFORMS.map((p) => ({ ...p, n: Math.round(w[p.id]), pct: (w[p.id] / total) * 100 }))
  }, [filters, kpis.modisCount, kpis.viirsCount, year])

  const yearPoint = history.find((h) => h.year === year)
  const raw = mode === 'raw'

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <Cell2
          className="lg:col-span-8"
          eyebrow="Serie 2000–2026 · 4 Series Comparativas (Ticket #4.3)"
          title='Corrección del "Efecto 2012" y Certificación Test de Chow'
          body="Con la entrada de Suomi-NPP en 2012, la suma cruda MODIS + VIIRS salta artificialmente (> 3.4x) porque un mismo incendio se registra en decenas de píxeles de 375 m. La curva armonizada fusiona esas detecciones y restaura la continuidad estadística con la línea base MODIS."
        >
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => toggleCurve('modis')}
              className={cn(
                'flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] transition-opacity',
                visibleCurves.modis ? 'border-modis/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
              )}
            >
              <span className="h-0.5 w-4 bg-modis" aria-hidden />
              (A) MODIS 1 km
            </button>
            <button
              type="button"
              onClick={() => toggleCurve('viirs')}
              className={cn(
                'flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] transition-opacity',
                visibleCurves.viirs ? 'border-amber-400/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
              )}
            >
              <span className="h-0.5 w-4 bg-amber-400" aria-hidden />
              (B) VIIRS 375 m
            </button>
            <button
              type="button"
              onClick={() => toggleCurve('raw')}
              className={cn(
                'flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] transition-opacity',
                visibleCurves.raw ? 'border-viirs/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
              )}
            >
              <span className="h-0 w-4 border-t-2 border-dashed border-viirs" aria-hidden />
              (C) Suma Cruda
            </button>
            <button
              type="button"
              onClick={() => toggleCurve('harmonized')}
              className={cn(
                'flex items-center gap-2 border px-2.5 py-1 font-mono text-[11px] transition-opacity',
                visibleCurves.harmonized ? 'border-harmonized/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
              )}
            >
              <span className="h-0 w-4 border-t-2 border-harmonized" aria-hidden />
              (D) Serie Armonizada
            </button>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={history} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="labHarm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--platinum)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--platinum)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="year" tick={chartAxis} tickLine={false} axisLine={{ stroke: 'var(--rule)' }} ticks={[2000, 2004, 2008, 2012, 2016, 2020, 2024]} />
                <YAxis tick={chartAxis} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
                <ReferenceArea x1={2012} x2={2026} fill="var(--viirs)" fillOpacity={raw ? 0.05 : 0.02} />
                <ReferenceLine x={2012} stroke="var(--viirs)" strokeDasharray="2 3" label={{ value: 'S-NPP 2012', position: 'insideTopLeft', fontSize: 10, fill: 'var(--viirs)' }} />
                <ReferenceLine x={year} stroke="var(--foreground)" strokeOpacity={0.4} />
                <Tooltip
                  contentStyle={chartTooltip}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                  formatter={(v, name) => [
                    fmt(Number(v)),
                    name === 'raw'
                      ? '(C) Suma Cruda'
                      : name === 'harmonized'
                        ? '(D) Armonizado'
                        : name === 'modis'
                          ? '(A) MODIS Crudo'
                          : '(B) VIIRS Crudo',
                  ]}
                />
                {visibleCurves.harmonized && (
                  <Area
                    type="monotone"
                    dataKey="harmonized"
                    stroke="var(--harmonized)"
                    strokeWidth={1.75}
                    fill="url(#labHarm)"
                    isAnimationActive={false}
                  />
                )}
                {visibleCurves.modis && (
                  <Line type="monotone" dataKey="modis" stroke="var(--modis)" strokeWidth={1.35} dot={false} isAnimationActive={false} />
                )}
                {visibleCurves.viirs && (
                  <Line type="monotone" dataKey="viirs" stroke="#fbbf24" strokeWidth={1.35} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
                )}
                {visibleCurves.raw && (
                  <Line type="monotone" dataKey="raw" stroke="var(--viirs)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {yearPoint && (
            <dl className="grid grid-cols-2 gap-y-3 border-t border-border pt-4 font-mono text-[11px] sm:grid-cols-4">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">{year} crudo (M+V)</dt>
                <dd className="text-lg text-viirs">{fmt(yearPoint.raw)}</dd>
              </div>
              <div className="flex flex-col gap-1 border-l border-border pl-4">
                <dt className="text-muted-foreground">armonizado</dt>
                <dd className="text-lg text-harmonized">{fmt(yearPoint.harmonized)}</dd>
              </div>
              <div className="flex flex-col gap-1 sm:border-l sm:border-border sm:pl-4">
                <dt className="text-muted-foreground">Test de Chow (Crudo)</dt>
                <dd className="text-sm text-viirs">p = {CHOW_TEST_METRICS.pValueRaw} (Ruptura)</dd>
              </div>
              <div className="flex flex-col gap-1 border-l border-border pl-4">
                <dt className="text-muted-foreground">Test de Chow (Arm.)</dt>
                <dd className="text-sm text-calibrated">p = {CHOW_TEST_METRICS.pValueHarmonized} (Continuo)</dd>
              </div>
            </dl>
          )}
        </Cell2>

        <Cell2
          className="lg:col-span-4"
          eyebrow="Calibración radiométrica"
          title="Regresión FRP VIIRS → MODIS y Ecuación HFII"
          body="Ajuste sobre pares co-localizados (< 1 km, Δt < 3.5 h) incorporando el factor de área off-nadir ψ(scan,track) y atenuación diurna/nocturna γ_solar."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis type="number" dataKey="viirs" name="FRP VIIRS" unit=" MW" tick={chartAxis} tickLine={false} axisLine={{ stroke: 'var(--rule)' }} domain={[0, 90]} />
                <YAxis type="number" dataKey="modis" name="FRP MODIS" tick={chartAxis} tickLine={false} axisLine={false} domain={[0, 90]} />
                <Tooltip contentStyle={chartTooltip} cursor={{ stroke: 'var(--rule)' }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 90, y: 90 }]} stroke="var(--muted-foreground)" strokeDasharray="2 4" />
                <ReferenceLine
                  segment={[
                    { x: 0, y: FRP_INTERCEPT },
                    { x: 90, y: FRP_SLOPE * 90 + FRP_INTERCEPT },
                  ]}
                  stroke="var(--calibrated)"
                  strokeWidth={1.75}
                />
                <Scatter data={scatter} fill="var(--platinum)" fillOpacity={0.55} shape="circle" isAnimationActive={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 border-t border-border pt-4 font-mono text-[11px]">
            <p className="text-[12px] text-foreground">
              HFII = (<span className="text-calibrated">{HFII_ALPHA}</span>·FRP<sup>{HFII_BETA}</sup> +{' '}
              <span className="text-calibrated">{HFII_KAPPA}</span>) · ψ(scan,track) · γ<sub>solar</sub>
            </p>
            <p className="text-[11px] text-muted-foreground">
              γ<sub>D</sub> = {GAMMA_DAY} · γ<sub>N</sub> = {GAMMA_NIGHT} · Conservación Energética:{' '}
              <span className="text-foreground">{fmt(CHOW_TEST_METRICS.energyConservationIndex * 100, 1)}%</span>
            </p>
            <dl className="grid grid-cols-3 text-muted-foreground">
              <div>
                <dt>R²</dt>
                <dd className="text-foreground">{FRP_R2}</dd>
              </div>
              <div>
                <dt>RMSE</dt>
                <dd className="text-foreground">{fmt(rmse, 2)} MW</dd>
              </div>
              <div>
                <dt>F-Score</dt>
                <dd className="text-foreground">{CHOW_TEST_METRICS.fScoreClustering}</dd>
              </div>
            </dl>
          </div>
        </Cell2>

        <Cell2
          className="lg:col-span-6"
          eyebrow="Emparejamiento temporal"
          title="Histograma de Δt entre pasadas"
          body={`MODIS (Terra 10:30, Aqua 13:30) y VIIRS (≈ 13:30) observan el mismo punto con horas de diferencia. Solo los pares con Δt < ${DT_WINDOW} h se consideran el mismo evento.`}
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dtBins} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={chartAxis} tickLine={false} axisLine={{ stroke: 'var(--rule)' }} unit="h" />
                <YAxis tick={chartAxis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltip} cursor={{ fill: 'var(--accent)' }} formatter={(v) => [v, 'pares']} labelFormatter={(l) => `Δt ${l} h`} />
                <Bar dataKey="n" radius={[1, 1, 0, 0]} isAnimationActive={false}>
                  {dtBins.map((b) => (
                    <Cell key={b.label} fill={b.bin < DT_WINDOW ? 'var(--harmonized)' : 'var(--muted-foreground)'} fillOpacity={b.bin < DT_WINDOW ? 0.85 : 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
            <span className="text-foreground">{fmt((matched / Math.max(totalDt, 1)) * 100, 1)}%</span> de pares dentro de ventana ·{' '}
            {scene.events.filter((e) => e.deltaT > 0).length} eventos multi-pasada en el día activo
          </p>
        </Cell2>

        <Cell2
          className="lg:col-span-6"
          eyebrow={`Constelación · ${year}`}
          title="Distribución por plataforma satelital"
          body="Aporte de cada plataforma al conteo crudo del año. La barra de cobertura muestra desde cuándo opera cada satélite dentro de la serie 2000–2026."
        >
          <ul className="flex flex-col">
            {shares.map((s) => {
              const left = ((s.from - SPAN_START) / (SPAN_END - SPAN_START)) * 100
              const marker = ((year - SPAN_START) / (SPAN_END - SPAN_START)) * 100
              return (
                <li key={s.id} className={cn('grid grid-cols-[96px_1fr_64px] items-center gap-4 border-b border-border py-2.5 last:border-0', s.pct === 0 && 'opacity-45')}>
                  <span className="flex flex-col">
                    <span className="text-[13px]">{s.id}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {s.sensor} · {s.from}
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="h-1.5 bg-heat-0">
                      <span className={cn('block h-full transition-all duration-500', s.cls)} style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="relative h-px bg-border" aria-hidden>
                      <span className="absolute inset-y-0 right-0 bg-platinum/50" style={{ left: `${left}%` }} />
                      <span className="absolute -top-1 h-2 w-px bg-foreground" style={{ left: `${marker}%` }} />
                    </span>
                  </span>
                  <span className="text-right font-mono text-[11px] tabular-nums">
                    {fmt(s.pct, 0)}%<span className="block text-[10px] text-muted-foreground">{fmt(s.n)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Cell2>
      </div>
    </div>
  )
}
