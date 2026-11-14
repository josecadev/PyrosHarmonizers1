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

interface Props {
  mode: Mode
  history: HistoryPoint[]
  year: number
  scene: Scene
  kpis: Kpis
  filters: Filters
}

const axis = { fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-jetbrains)' }
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 11,
  fontFamily: 'var(--font-jetbrains)',
  color: 'var(--foreground)',
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card/90 p-4 backdrop-blur-md">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-[13px] font-medium text-pretty">{title}</h3>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

const DT_WINDOW = 3.5
const SENSOR_SHARE = [
  { id: 'Terra', label: 'Terra', cls: 'bg-modis', group: 'MODIS' },
  { id: 'Aqua', label: 'Aqua', cls: 'bg-modis/60', group: 'MODIS' },
  { id: 'Suomi-NPP', label: 'S-NPP', cls: 'bg-viirs', group: 'VIIRS' },
  { id: 'NOAA-20', label: 'NOAA-20', cls: 'bg-viirs/70', group: 'VIIRS' },
  { id: 'NOAA-21', label: 'NOAA-21', cls: 'bg-viirs/40', group: 'VIIRS' },
]

export function AnalyticsPanel({ mode, history, year, scene, kpis, filters }: Props) {
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
    return Array.from({ length: 70 }, () => {
      const v = 3 + rand() ** 1.6 * 85
      const m = FRP_SLOPE * v + FRP_INTERCEPT + (rand() - 0.5) * (6 + v * 0.35)
      return { viirs: Math.round(v * 10) / 10, modis: Math.max(0.5, Math.round(m * 10) / 10) }
    })
  }, [year, kpis.events])

  const dtBins = useMemo(() => {
    const rand = mulberry32(year * 17 + kpis.rawCount)
    const bins = Array.from({ length: 12 }, (_, i) => ({ bin: i * 0.5, label: `${(i * 0.5).toFixed(1)}`, n: 0 }))
    const samples = Math.max(20, Math.min(400, Math.round(kpis.viirsCount / 8)))
    for (let i = 0; i < samples; i++) {
      const dt = rand() < 0.8 ? Math.abs(2.9 + (rand() + rand() - 1) * 1.4) : rand() * 6
      const idx = Math.min(11, Math.floor(dt / 0.5))
      bins[idx].n += 1
    }
    return bins
  }, [year, kpis.rawCount, kpis.viirsCount])

  const matched = dtBins.filter((b) => b.bin < DT_WINDOW).reduce((s, b) => s + b.n, 0)
  const totalDt = dtBins.reduce((s, b) => s + b.n, 0)

  const shares = useMemo(() => {
    const viirsOn = filters.viirs && year >= VIIRS_START
    const weights: Record<string, number> = {
      Terra: filters.modis ? kpis.modisCount * 0.48 : 0,
      Aqua: filters.modis ? kpis.modisCount * 0.52 : 0,
      'Suomi-NPP': viirsOn ? kpis.viirsCount * (year >= 2023 ? 0.28 : year >= 2018 ? 0.45 : 1) : 0,
      'NOAA-20': viirsOn && year >= 2018 ? kpis.viirsCount * (year >= 2023 ? 0.38 : 0.55) : 0,
      'NOAA-21': viirsOn && year >= 2023 ? kpis.viirsCount * 0.34 : 0,
    }
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
    return SENSOR_SHARE.map((s) => ({ ...s, pct: (weights[s.id] / total) * 100 }))
  }, [filters, kpis.modisCount, kpis.viirsCount, year])

  const yearPoint = history.find((h) => h.year === year)
  const raw = mode === 'raw'

  return (
    <aside aria-label="Analítica" className="scrollbar-thin flex w-full shrink-0 flex-col gap-3 overflow-y-auto bg-background p-3 lg:w-[380px]">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Analítica</h2>
        <span className="font-mono text-[11px] text-muted-foreground">2000–2026</span>
      </div>

      <Section
        title='Corrección del "Efecto 2012" (4 Series)'
        subtitle="Comparativa multianual entre (A) MODIS, (B) VIIRS, (C) Suma Cruda y (D) Serie Armonizada PyrosHarmonizer."
      >
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <button
            type="button"
            onClick={() => toggleCurve('modis')}
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono transition-opacity',
              visibleCurves.modis ? 'border-modis/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="h-0.5 w-3 bg-modis" aria-hidden />
            MODIS
          </button>
          <button
            type="button"
            onClick={() => toggleCurve('viirs')}
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono transition-opacity',
              visibleCurves.viirs ? 'border-amber-400/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="h-0.5 w-3 bg-amber-400" aria-hidden />
            VIIRS
          </button>
          <button
            type="button"
            onClick={() => toggleCurve('raw')}
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono transition-opacity',
              visibleCurves.raw ? 'border-viirs/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="h-0 w-3 border-t-2 border-dashed border-viirs" aria-hidden />
            Σ Crudo
          </button>
          <button
            type="button"
            onClick={() => toggleCurve('harmonized')}
            className={cn(
              'flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono transition-opacity',
              visibleCurves.harmonized ? 'border-harmonized/50 text-foreground' : 'border-border text-muted-foreground opacity-50',
            )}
          >
            <span className="h-2 w-3 rounded-sm bg-harmonized/60" aria-hidden />
            Armonizado
          </button>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={history} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="harmFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--harmonized)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--harmonized)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} ticks={[2000, 2006, 2012, 2018, 2024]} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
              <ReferenceArea x1={2012} x2={2026} fill="var(--viirs)" fillOpacity={raw ? 0.05 : 0.02} />
              <ReferenceLine
                x={2012}
                stroke="var(--viirs)"
                strokeDasharray="2 3"
                label={{ value: 'S-NPP', position: 'insideTopLeft', fontSize: 10, fill: 'var(--viirs)' }}
              />
              <ReferenceLine x={year} stroke="var(--foreground)" strokeOpacity={0.5} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'var(--muted-foreground)' }}
                formatter={(v, name) => [
                  fmt(Number(v)),
                  name === 'raw'
                    ? 'Σ Crudo'
                    : name === 'harmonized'
                      ? 'Armonizado'
                      : name === 'modis'
                        ? 'MODIS (1 km)'
                        : 'VIIRS (375 m)',
                ]}
              />
              {visibleCurves.harmonized && (
                <Area
                  type="monotone"
                  dataKey="harmonized"
                  stroke="var(--harmonized)"
                  strokeWidth={1.75}
                  fill="url(#harmFill)"
                  isAnimationActive={false}
                />
              )}
              {visibleCurves.modis && (
                <Line
                  type="monotone"
                  dataKey="modis"
                  stroke="var(--modis)"
                  strokeWidth={1.25}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {visibleCurves.viirs && (
                <Line
                  type="monotone"
                  dataKey="viirs"
                  stroke="#fbbf24"
                  strokeWidth={1.25}
                  strokeDasharray="2 2"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {visibleCurves.raw && (
                <Line
                  type="monotone"
                  dataKey="raw"
                  stroke="var(--viirs)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {yearPoint && (
          <dl className="grid grid-cols-3 gap-2 border-t border-border pt-3 font-mono text-[11px]">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{year} crudo</dt>
              <dd className="text-viirs">{fmt(yearPoint.raw)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">armonizado</dt>
              <dd className="text-harmonized">{fmt(yearPoint.harmonized)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">sesgo</dt>
              <dd>{fmt(yearPoint.raw / yearPoint.harmonized, 2)}x</dd>
            </div>
          </dl>
        )}

        <div className="rounded border border-border bg-background/80 p-2.5 font-mono text-[10px]">
          <p className="font-medium text-foreground">Test de Chow (Ruptura Estructural 2012)</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">p-value Crudo: </span>
              <span className="text-viirs">{CHOW_TEST_METRICS.pValueRaw} (Ruptura)</span>
            </div>
            <div>
              <span className="text-muted-foreground">p-value Arm.: </span>
              <span className="text-harmonized">{CHOW_TEST_METRICS.pValueHarmonized} (Continuo)</span>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Regresión FRP VIIRS → MODIS y Ecuación HFII"
        subtitle="Pares de detecciones co-localizadas usadas para calibrar la potencia radiativa a la línea base MODIS."
      >
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" />
              <XAxis type="number" dataKey="viirs" name="FRP VIIRS" unit=" MW" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} domain={[0, 90]} />
              <YAxis type="number" dataKey="modis" name="FRP MODIS" tick={axis} tickLine={false} axisLine={false} domain={[0, 90]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--border)' }} />
              <ReferenceLine
                segment={[
                  { x: 0, y: FRP_INTERCEPT },
                  { x: 90, y: FRP_SLOPE * 90 + FRP_INTERCEPT },
                ]}
                stroke="var(--harmonized)"
                strokeWidth={1.5}
              />
              <Scatter data={scatter} fill="var(--modis)" fillOpacity={0.7} shape="circle" isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          HFII = ({HFII_ALPHA}·FRP<sup>{HFII_BETA}</sup> + {HFII_KAPPA}) · ψ(scan,track) · γ<sub>solar</sub> (γ<sub>D</sub>={GAMMA_DAY}, γ<sub>N</sub>={GAMMA_NIGHT}) · R²={FRP_R2}
        </p>
      </Section>

      <Section
        title="Emparejamiento orbital"
        subtitle={`Ventana de coincidencia temporal Δt < ${DT_WINDOW} h entre pasadas MODIS y VIIRS sobre el mismo píxel.`}
      >
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dtBins} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={1} unit="h" />
              <YAxis tick={axis} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--accent)' }} formatter={(v) => [v, 'pares']} labelFormatter={(l) => `Δt ${l} h`} />
              <Bar dataKey="n" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {dtBins.map((b) => (
                  <Cell key={b.label} fill={b.bin < DT_WINDOW ? 'var(--harmonized)' : 'var(--muted-foreground)'} fillOpacity={b.bin < DT_WINDOW ? 0.8 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          <span className="text-harmonized">{fmt((matched / Math.max(totalDt, 1)) * 100, 1)}%</span> de pares dentro de ventana ·{' '}
          {scene.events.filter((e) => e.deltaT > 0).length} eventos fusionados hoy
        </p>

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-[11px] text-muted-foreground">Proporción de detecciones por sensor</p>
          <div className="flex h-2.5 overflow-hidden rounded-sm bg-background" role="img" aria-label="Proporción de detecciones por satélite">
            {shares.map((s) => (
              <span key={s.id} className={cn('h-full transition-all duration-500', s.cls)} style={{ width: `${s.pct}%` }} />
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-1 font-mono text-[10px]">
            {shares.map((s) => (
              <li key={s.id} className={cn('flex items-center gap-1.5', s.pct === 0 && 'opacity-40')}>
                <span className={cn('size-2 rounded-sm', s.cls)} aria-hidden />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="ml-auto tabular-nums">{fmt(s.pct, 0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </aside>
  )
}
