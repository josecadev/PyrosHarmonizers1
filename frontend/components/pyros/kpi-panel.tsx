import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FRP_R2,
  GAMMA_DAY,
  GAMMA_NIGHT,
  HFII_ALPHA,
  HFII_BETA,
  HFII_KAPPA,
  HFII_LEVELS,
  fmt,
  getH3Specs,
  hfiiLevel,
  type Kpis,
  type Mode,
  type Region,
} from '@/lib/pyros/data'

interface Props {
  mode: Mode
  kpis: Kpis
  year: number
  region: Region
}

function Card({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border bg-card/90 p-4 backdrop-blur-md">
      <header className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <span className="font-mono text-[10px] text-muted-foreground">{index}</span>
      </header>
      {children}
    </article>
  )
}

function Value({ value, unit, tone }: { value: string; unit: string; tone: 'raw' | 'ok' }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span
        className={cn(
          'font-mono text-3xl font-medium tracking-tight tabular-nums transition-colors',
          tone === 'raw' ? 'text-viirs' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{unit}</span>
    </p>
  )
}

function Note({ tone, children }: { tone: 'warn' | 'ok' | 'neutral'; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        'flex items-start gap-1.5 text-[11px] leading-relaxed',
        tone === 'warn' && 'text-viirs',
        tone === 'ok' && 'text-harmonized',
        tone === 'neutral' && 'text-muted-foreground',
      )}
    >
      {tone === 'warn' && <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />}
      {tone === 'ok' && <CheckCircle2 className="mt-0.5 size-3 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

export function KpiPanel({ mode, kpis, year, region }: Props) {
  const raw = mode === 'raw'
  const hfiiValue = raw ? kpis.hfiiRaw : kpis.hfii
  const level = hfiiLevel(hfiiValue)
  const h3Spec = getH3Specs(kpis.h3Res)

  return (
    <aside
      aria-label="Telemetría"
      className="scrollbar-thin flex w-full shrink-0 flex-col gap-3 overflow-y-auto bg-background p-3 lg:w-80"
    >
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telemetría</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {region.name.split(' - ')[0]} · {year}
        </span>
      </div>

      <Card index="KPI-01" title="Eventos de fuego contabilizados">
        {mode === 'raw' && (
          <>
            <Value value={fmt(kpis.rawCount)} unit="focos" tone="raw" />
            {kpis.viirsCount > 0 ? (
              <Note tone="warn">Sesgo por sobre-conteo VIIRS {fmt(kpis.dupFactor, 1)}x sobre el mismo incendio</Note>
            ) : (
              <Note tone="neutral">Serie solo MODIS: sin duplicación inter-sensor</Note>
            )}
          </>
        )}
        {mode === 'dbscan' && (
          <>
            <Value value={fmt(kpis.events)} unit="incendios reales unificados" tone="ok" />
            <Note tone="ok">-{fmt(kpis.reduction * 100, 1)}% duplicación espacial (ε 750 m · Δt ≤ 3.5 h)</Note>
          </>
        )}
        {mode === 'h3' && (
          <>
            <Value value={fmt(kpis.h3Cells)} unit="celdas H3 activas" tone="ok" />
            <Note tone="ok">
              {fmt(kpis.cellsPerDay, 1)} celdas activas / día de temporada · Res. {kpis.h3Res}
            </Note>
          </>
        )}
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <Row label="MODIS 1 km" value={fmt(kpis.modisCount)} />
          <Row label="VIIRS 375 m" value={fmt(kpis.viirsCount)} />
          <Row label="Anomalías estáticas filtradas" value={fmt(kpis.staticMaskedCount)} />
        </div>
      </Card>

      <Card index="KPI-02" title="Potencia radiativa calibrada (HFII)">
        {raw ? (
          <>
            <Value value={fmt(kpis.rawFrp)} unit="MW sin calibrar" tone="raw" />
            <Note tone="warn">Suma directa: +{fmt((kpis.rawFrp / Math.max(kpis.calFrp, 1) - 1) * 100, 0)}% vs línea base MODIS</Note>
          </>
        ) : mode === 'dbscan' ? (
          <>
            <Value value={fmt(kpis.calFrp)} unit="MW" tone="ok" />
            <Note tone="neutral">FRP fusionado por evento, calibrado con factor off-nadir y solar</Note>
          </>
        ) : (
          <>
            <Value value={fmt(kpis.frpDensity, 1)} unit="MW / km²" tone="ok" />
            <Note tone="neutral">Densidad energética media por celda activa H3 Res. {kpis.h3Res}</Note>
          </>
        )}
        <div className="rounded border border-border bg-background px-2.5 py-2 font-mono text-[10px] leading-relaxed">
          <span className="text-muted-foreground">HFII</span> = ({HFII_ALPHA}·FRP<sup>{HFII_BETA}</sup> + {HFII_KAPPA}) · ψ(s,t) · γ<sub>solar</sub>
          <div className="mt-0.5 text-muted-foreground">
            γ<sub>D</sub>={GAMMA_DAY} · γ<sub>N</sub>={GAMMA_NIGHT} · R²={FRP_R2}
          </div>
        </div>
      </Card>

      <Card index="KPI-03" title="Índice armonizado de intensidad (HFII)">
        <div className="flex items-end justify-between">
          <Value value={String(hfiiValue)} unit="/ 100" tone={raw ? 'raw' : 'ok'} />
          <span className="mb-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">
            {HFII_LEVELS[level].label} · {HFII_LEVELS[level].percentile}
          </span>
        </div>
        <div className="flex gap-1" role="img" aria-label={`Severidad ${HFII_LEVELS[level].label}`}>
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className={cn(
                'h-1.5 flex-1 rounded-sm transition-opacity',
                ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'][l],
                l <= level ? 'opacity-100' : 'opacity-25',
              )}
            />
          ))}
        </div>
        <Note tone={raw ? 'warn' : 'neutral'}>
          {raw ? 'Índice inflado por conteo múltiple de píxeles VIIRS' : `Clasificación por percentil histórico (${HFII_LEVELS[level].code})`}
        </Note>
      </Card>

      <Card index="KPI-04" title="Área real de huella térmica">
        {raw && (
          <>
            <Value value={fmt(kpis.rawAreaKm2)} unit="km² (Σ scan × track)" tone="raw" />
            <Note tone="warn">Huellas superpuestas contadas múltiples veces</Note>
          </>
        )}
        {mode === 'dbscan' && (
          <>
            <Value value={fmt(kpis.hullAreaKm2 * 100)} unit="ha" tone="ok" />
            <Note tone="neutral">ST_ConvexHull sobre huellas scan × track fusionadas · {fmt(kpis.hullAreaKm2)} km²</Note>
          </>
        )}
        {mode === 'h3' && (
          <>
            <Value value={fmt(kpis.h3AreaKm2 * 100)} unit="ha" tone="ok" />
            <Note tone="neutral">
              {fmt(kpis.h3Cells)} celdas × {h3Spec.areaKm2} km² (H3 Res. {kpis.h3Res})
            </Note>
          </>
        )}
      </Card>
    </aside>
  )
}
