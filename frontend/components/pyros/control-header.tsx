'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ChevronDown,
  Columns2,
  Download,
  Eye,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  Info,
  Lock,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ApiStatus } from '@/lib/pyros/api'
import {
  HFII_LEVELS,
  MODE_LABEL,
  REGIONS,
  VIIRS_START,
  fmt,
  hfiiLevel,
  type CalendarDay,
  type Filters,
  type H3Res,
  type Kpis,
  type Mode,
  type NrtWindow,
  type Region,
  type RegionCategory,
} from '@/lib/pyros/data'
import {
  RBAC_ROLES,
  UI_DICT,
  getRoleSpec,
  type ColorPalette,
  type Locale,
  type RbacRole,
} from '@/lib/pyros/i18n-rbac'
import type { Scene } from '@/lib/pyros/scene'
import { exportAuditJson, exportCsv, exportGeoJson, exportPdf } from '@/lib/pyros/exporters'
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
  region: Region
  scene: Scene
  calendar: CalendarDay[]
  splitScreen: boolean
  onSplitScreenChange: (v: boolean) => void
  locale: Locale
  onLocaleChange: (l: Locale) => void
  palette: ColorPalette
  onPaletteChange: (p: ColorPalette) => void
  role: RbacRole
  onRoleChange: (r: RbacRole) => void
  apiStatus: ApiStatus
  onRefreshApiStatus: () => void
}

const CATEGORIES: RegionCategory[] = ['Ecorregión', 'Municipio', 'Área Protegida SNAP']

type Tone = 'raw' | 'ok' | 'neutral'
interface Tick {
  id: string
  label: string
  value: string
  unit: string
  note: string
  tone: Tone
}

function buildTicker(mode: Mode, k: Kpis, locale: Locale): Tick[] {
  const dict = UI_DICT[locale].kpis
  const raw = mode === 'raw'
  const hfii = raw ? k.hfiiRaw : k.hfii
  const levelObj = HFII_LEVELS[hfiiLevel(hfii)]
  if (raw) {
    return [
      {
        id: 'k1',
        label: dict.k1,
        value: fmt(k.rawCount),
        unit: dict.foci,
        note: k.viirsCount ? `${fmt(k.dupFactor, 1)}x ${dict.overcount}` : dict.modisOnly,
        tone: 'raw',
      },
      {
        id: 'k2',
        label: dict.k2Raw,
        value: fmt(k.rawFrp),
        unit: 'MW',
        note: `+${fmt((k.rawFrp / Math.max(k.calFrp, 1) - 1) * 100, 0)}% ${dict.uncalibrated}`,
        tone: 'raw',
      },
      { id: 'k3', label: dict.k3, value: String(hfii), unit: '/100', note: `${levelObj.label} · ${dict.inflated}`, tone: 'raw' },
      { id: 'k4', label: dict.k4, value: fmt(k.rawAreaKm2), unit: 'km²', note: 'Σ scan × track', tone: 'raw' },
    ]
  }
  const dbscan = mode === 'dbscan'
  return [
    {
      id: 'k1',
      label: dict.k1,
      value: dbscan ? fmt(k.events) : fmt(k.h3Cells),
      unit: dbscan ? dict.fires : dict.cells,
      note: dbscan ? `−${fmt(k.reduction * 100, 1)}% ${dict.duplication}` : `${fmt(k.cellsPerDay, 1)} ${dict.cellsPerDay}`,
      tone: 'ok',
    },
    {
      id: 'k2',
      label: dict.k2Cal,
      value: dbscan ? fmt(k.calFrp) : fmt(k.frpDensity, 1),
      unit: dbscan ? 'MW' : 'MW/km²',
      note: 'ψ(s,t) · γ_solar',
      tone: 'ok',
    },
    { id: 'k3', label: dict.k3, value: String(hfii), unit: '/100', note: `${levelObj.label} (${levelObj.percentile})`, tone: 'neutral' },
    {
      id: 'k4',
      label: dict.k4,
      value: fmt((dbscan ? k.hullAreaKm2 : k.h3AreaKm2) * 100),
      unit: 'ha',
      note: dbscan ? 'ST_ConvexHull' : `H3 res. ${k.h3Res}`,
      tone: 'neutral',
    },
  ]
}

export function ControlHeader({
  view,
  mode,
  onModeChange,
  regionId,
  onRegionChange,
  filters,
  onFiltersChange,
  year,
  kpis,
  region,
  scene,
  calendar,
  splitScreen,
  onSplitScreenChange,
  locale,
  onLocaleChange,
  palette,
  onPaletteChange,
  role,
  onRoleChange,
  apiStatus,
  onRefreshApiStatus,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const viirsUnavailable = year < VIIRS_START
  const toggleSat = (key: 'modis' | 'viirs') => onFiltersChange({ ...filters, [key]: !filters[key] })
  const current = VIEWS.find((v) => v.id === view)!
  const dict = UI_DICT[locale]
  const roleSpec = getRoleSpec(role)
  const ticker = buildTicker(mode, kpis, locale)
  const exportCtx = { mode, region, year, kpis, scene, calendar }

  useEffect(() => {
    if (!exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [exportOpen])

  return (
    <header className="relative z-30 shrink-0 border-b border-border bg-background">
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-2">
        <h1 className="flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{current.index} /</span>
          <span className="text-[15px] font-medium tracking-tight">{dict.views[view].label}</span>
        </h1>

        <span className="hidden rounded border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground xl:inline">
          {dict.header.challengeBadge}
        </span>

        <label className="flex items-center gap-2">
          <span className="sr-only">Área de estudio</span>
          <span className="relative">
            <select
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              className="appearance-none rounded-[3px] border border-border bg-card py-1.5 pl-2.5 pr-7 text-[13px] text-foreground focus-visible:outline-2"
            >
              {CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {REGIONS.filter((r) => r.category === cat).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </span>
        </label>

        {/* Live API Status Indicator (NFR-006) */}
        <button
          type="button"
          onClick={onRefreshApiStatus}
          title={`${apiStatus.message} · Endpoint: ${apiStatus.endpoint} · Latencia: ${apiStatus.latencyMs}ms (Clic para reconectar)`}
          className={cn(
            'hidden items-center gap-1.5 rounded-[3px] border px-2 py-1 font-mono text-[10px] transition-colors md:flex',
            apiStatus.mode === 'online'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          <Activity className={cn('size-3', apiStatus.mode === 'online' ? 'text-emerald-400' : 'text-amber-400')} aria-hidden />
          <span>{apiStatus.mode === 'online' ? dict.header.apiOnline : dict.header.apiFallback}</span>
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* RBAC Role Selector */}
          <label className="hidden items-center gap-1.5 sm:flex" title={locale === 'es' ? roleSpec.orgEs : roleSpec.orgEn}>
            <UserCheck className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="sr-only">Rol RBAC</span>
            <select
              aria-label="Rol RBAC"
              value={role}
              onChange={(e) => onRoleChange(e.target.value as RbacRole)}
              className="rounded-[3px] border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground focus-visible:outline-2"
            >
              {RBAC_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  RBAC: {locale === 'es' ? r.labelEs : r.labelEn}
                </option>
              ))}
            </select>
          </label>

          {/* Colorblind Palette Toggle (NFR-010: Viridis) */}
          <button
            type="button"
            aria-pressed={palette === 'viridis'}
            onClick={() => onPaletteChange(palette === 'viridis' ? 'standard' : 'viridis')}
            title="Alternar paleta de alto contraste apta para daltónicos (Viridis · NFR-010)"
            className={cn(
              'flex items-center gap-1 rounded-[3px] border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:outline-2',
              palette === 'viridis'
                ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-200'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
            <span className="hidden lg:inline">{palette === 'viridis' ? dict.header.viridisLabel : 'Viridis'}</span>
          </button>

          {/* Bilingual Switcher ES / EN (NFR-011) */}
          <button
            type="button"
            onClick={() => onLocaleChange(locale === 'es' ? 'en' : 'es')}
            title="Cambiar idioma / Switch language (ES / EN · NFR-011)"
            className="flex items-center gap-1 rounded-[3px] border border-border bg-card px-2 py-1 font-mono text-[11px] text-foreground hover:bg-accent focus-visible:outline-2"
          >
            <Globe className="size-3.5 text-muted-foreground" aria-hidden />
            <span>{locale.toUpperCase()}</span>
          </button>

          {view === 'map' && (
            <button
              type="button"
              aria-pressed={splitScreen}
              onClick={() => onSplitScreenChange(!splitScreen)}
              className={cn(
                'flex items-center gap-1.5 rounded-[3px] border px-2.5 py-1.5 font-mono text-xs transition-colors focus-visible:outline-2',
                splitScreen
                  ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
              title="Comparador de Cortina (Split-Screen: Crudo vs Armonizado)"
            >
              <Columns2 className="size-3.5" aria-hidden />
              <span className="hidden md:inline">{dict.header.splitScreen}</span>
            </button>
          )}

          <Segmented
            label="Modo de procesamiento"
            size="md"
            value={mode}
            onChange={onModeChange}
            options={[
              { id: 'raw', label: dict.modes.raw, title: MODE_LABEL.raw },
              { id: 'dbscan', label: dict.modes.dbscan, title: MODE_LABEL.dbscan },
              { id: 'h3', label: dict.modes.h3, title: MODE_LABEL.h3 },
            ]}
          />

          <div ref={exportRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-[3px] border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-accent focus-visible:outline-2"
            >
              <Download className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{dict.header.export}</span>
              <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
            </button>
            {exportOpen && (
              <div
                role="menu"
                aria-label="Formatos de exportación"
                className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-[3px] border border-rule bg-card p-1 shadow-xl"
              >
                <div className="border-b border-border px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground">
                  Rol activo: <span className="text-foreground">{locale === 'es' ? roleSpec.labelEs : roleSpec.labelEn}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!roleSpec.canExportGeoJson}
                  onClick={() => {
                    if (!roleSpec.canExportGeoJson) return
                    exportGeoJson(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {roleSpec.canExportGeoJson ? (
                    <FileJson className="size-3.5 text-harmonized" aria-hidden />
                  ) : (
                    <Lock className="size-3.5 text-muted-foreground" aria-hidden />
                  )}
                  <span className="flex flex-col">
                    <span>Exportar GeoJSON (RFC 7946)</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {roleSpec.canExportGeoJson ? 'Huellas / cascos / celdas H3' : 'Requiere rol Operador o superior'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportCsv(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-accent"
                >
                  <FileSpreadsheet className="size-3.5 text-modis" aria-hidden />
                  <span className="flex flex-col">
                    <span>Exportar CSV (ESC-EXP-002)</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Serie diaria · 8 columnas canónicas</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!roleSpec.canExportAuditJson}
                  onClick={() => {
                    if (!roleSpec.canExportAuditJson) return
                    exportAuditJson(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {roleSpec.canExportAuditJson ? (
                    <FileCode2 className="size-3.5 text-cyan-400" aria-hidden />
                  ) : (
                    <Lock className="size-3.5 text-muted-foreground" aria-hidden />
                  )}
                  <span className="flex flex-col">
                    <span>Auditoría Científica JSON</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {roleSpec.canExportAuditJson ? 'Test de Chow · α, β, κ, ψ, γ' : 'Requiere rol Analista o Admin'}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportPdf(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs hover:bg-accent"
                >
                  <FileText className="size-3.5 text-viirs" aria-hidden />
                  <span className="flex flex-col">
                    <span>Boletín Oficial (PDF)</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Boletín A4 con gráficas vectoriales</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-2 text-xs">
        <Segmented
          label="Pasada orbital"
          value={filters.orbit}
          onChange={(orbit) => onFiltersChange({ ...filters, orbit })}
          options={[
            { id: 'all', label: dict.header.orbitAll },
            { id: 'D', label: dict.header.orbitDay },
            { id: 'N', label: dict.header.orbitNight },
          ]}
        />

        <button
          type="button"
          role="switch"
          aria-checked={filters.confidence}
          onClick={() => onFiltersChange({ ...filters, confidence: !filters.confidence })}
          className="flex items-center gap-2 focus-visible:outline-2"
        >
          <span
            className={cn(
              'relative h-3.5 w-6 rounded-full border transition-colors',
              filters.confidence ? 'border-harmonized bg-harmonized' : 'border-rule bg-transparent',
            )}
          >
            <span
              className={cn(
                'absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-all',
                filters.confidence ? 'left-3 bg-background' : 'left-0.5 bg-muted-foreground',
              )}
            />
          </span>
          <span className="font-mono text-[11px]">
            {dict.header.confidence}{' '}
            <span className="text-muted-foreground">{filters.confidence ? dict.header.active : dict.header.inactive}</span>
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={filters.staticMask}
          onClick={() => onFiltersChange({ ...filters, staticMask: !filters.staticMask })}
          className="flex items-center gap-2 focus-visible:outline-2"
          title="Enmascarar fuentes térmicas persistentes no-vegetacionales (>15 días/año en radio ≤100m)"
        >
          <span
            className={cn(
              'relative h-3.5 w-6 rounded-full border transition-colors',
              filters.staticMask ? 'border-amber-400 bg-amber-400' : 'border-rule bg-transparent',
            )}
          >
            <span
              className={cn(
                'absolute top-1/2 size-2 -translate-y-1/2 rounded-full transition-all',
                filters.staticMask ? 'left-3 bg-background' : 'left-0.5 bg-muted-foreground',
              )}
            />
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <ShieldAlert className="size-3 text-amber-400" aria-hidden />
            {dict.header.staticMask}{' '}
            <span className="text-muted-foreground">
              {filters.staticMask ? `(${kpis.staticMaskedCount} ${dict.header.filtered})` : dict.header.inactive}
            </span>
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

        <Segmented
          label="Resolución H3"
          value={String(filters.h3Res) as '7' | '8'}
          onChange={(v) => onFiltersChange({ ...filters, h3Res: Number(v) as H3Res })}
          options={[
            { id: '7', label: 'H3 Res 7 (5.16 km²)' },
            { id: '8', label: 'H3 Res 8 (0.74 km²)' },
          ]}
        />

        <Segmented
          label="Ventana temporal"
          value={filters.nrtWindow}
          onChange={(nrtWindow: NrtWindow) => onFiltersChange({ ...filters, nrtWindow })}
          options={[
            { id: 'historic', label: dict.header.historic },
            { id: '24h', label: 'NRT 24h' },
            { id: '48h', label: '48h' },
            { id: '7d', label: '7d' },
          ]}
        />

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
