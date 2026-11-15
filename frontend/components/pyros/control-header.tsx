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

  const riskIndex = kpis.hfii >= 0.65 ? 4 : kpis.hfii >= 0.45 ? 3 : kpis.hfii >= 0.25 ? 2 : 1
  const riskLabel = riskIndex === 4 ? 'Crítico (4/4)' : riskIndex === 3 ? 'Alto (3/4)' : riskIndex === 2 ? 'Alerta (2/4)' : 'Bajo (1/4)'

  useEffect(() => {
    if (!exportOpen) return
    const onDown = (e: MouseEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [exportOpen])

  return (
    <header className="relative z-30 shrink-0 border-b border-surface-border bg-slate-950/90 backdrop-blur-md">
      {/* Top Bar with Brand, Region, Environmental Risk, and Quick Export */}
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-slate-50 uppercase">
              Pyros<span className="text-amber-400">Harmonizer</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/30 text-sky-400 font-medium">
              NASA Reto #8
            </span>
          </div>
          <span className="hidden xl:inline text-slate-600">|</span>
          <p className="hidden xl:block text-[11px] text-slate-400 leading-none">
            Armonización Satelital Multiespectral • Chiquitanía
          </p>
        </div>

        {/* Center / Controls: Region & Environmental Risk */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Region Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/60 rounded-md px-2.5 py-1 text-xs">
            <span className="text-amber-400 mr-1.5 text-xs">📍</span>
            <label className="sr-only">Región</label>
            <select
              value={regionId}
              onChange={(e) => onRegionChange(e.target.value)}
              className="bg-transparent border-none text-slate-200 text-xs py-0 pl-0 pr-6 focus:ring-0 cursor-pointer font-medium"
            >
              {CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat} className="bg-slate-900 text-slate-200">
                  {REGIONS.filter((r) => r.category === cat).map((r) => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Sync Status / Live API */}
          <button
            type="button"
            onClick={onRefreshApiStatus}
            title={`${apiStatus.message} (Clic para verificar)`}
            className="hidden md:flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded text-xs text-emerald-300 font-mono transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{apiStatus.mode === 'online' ? 'MODIS + VIIRS Sincronizados' : 'API Local Fallback'}</span>
          </button>

          {/* Environmental Risk Meter */}
          <div className="flex items-center bg-slate-900/90 border border-rose-900/50 rounded-lg p-1 px-2.5 gap-2">
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full', riskIndex === 4 ? 'bg-rose-500 status-pulse-red' : riskIndex === 3 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400')} />
              <span className={cn('text-xs font-semibold', riskIndex === 4 ? 'text-rose-300' : riskIndex === 3 ? 'text-amber-300' : 'text-emerald-300')}>
                {riskLabel}
              </span>
            </div>
            {/* Segmented 4-level bar */}
            <div className="flex gap-1 items-center">
              <span className={cn('w-2.5 h-2 rounded-xs', riskIndex >= 1 ? 'bg-emerald-500' : 'bg-emerald-500/20')} title="Bajo" />
              <span className={cn('w-2.5 h-2 rounded-xs', riskIndex >= 2 ? 'bg-yellow-500' : 'bg-yellow-500/20')} title="Alerta" />
              <span className={cn('w-2.5 h-2 rounded-xs', riskIndex >= 3 ? 'bg-amber-500' : 'bg-amber-500/20')} title="Alto" />
              <span className={cn('w-2.5 h-2 rounded-xs', riskIndex >= 4 ? 'bg-rose-500 shadow-xs shadow-rose-500' : 'bg-rose-500/20')} title="Crítico" />
            </div>
            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <div className="text-[10px] font-mono text-slate-300 hidden sm:flex items-center gap-1.5">
              <span>💨 28 km/h NO</span>
              <span>💧 18% HR</span>
            </div>
          </div>
        </div>

        {/* Right CTA Actions: Quick PDF Export and Format Dropdown */}
        <div className="flex items-center gap-2">
          {/* Quick PDF button */}
          <button
            type="button"
            onClick={() => exportPdf(exportCtx)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            <span>Exportar PDF</span>
          </button>

          {/* More Formats Dropdown */}
          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              title="Más formatos de exportación"
              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-300 hover:text-white transition-colors"
            >
              <FileText className="size-3.5" aria-hidden />
              <ChevronDown className="size-3" aria-hidden />
            </button>

            {exportOpen && (
              <div
                role="menu"
                aria-label="Formatos de exportación"
                className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-2xl backdrop-blur-xl"
              >
                <div className="border-b border-slate-800 px-2.5 py-1.5 font-mono text-[10px] text-slate-400">
                  Rol activo: <span className="text-white font-semibold">{locale === 'es' ? roleSpec.labelEs : roleSpec.labelEn}</span>
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
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-slate-800 text-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <FileJson className="size-3.5 text-cyan-400" aria-hidden />
                  <span className="flex flex-col">
                    <span>Exportar GeoJSON (RFC 7946)</span>
                    <span className="font-mono text-[10px] text-slate-400">Huellas / cascos / celdas H3</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportCsv(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-slate-800 text-slate-200"
                >
                  <FileSpreadsheet className="size-3.5 text-orange-400" aria-hidden />
                  <span className="flex flex-col">
                    <span>Exportar CSV (ESC-EXP-002)</span>
                    <span className="font-mono text-[10px] text-slate-400">Serie diaria · 8 columnas canónicas</span>
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
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-slate-800 text-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <FileCode2 className="size-3.5 text-cyan-400" aria-hidden />
                  <span className="flex flex-col">
                    <span>Auditoría Científica JSON</span>
                    <span className="font-mono text-[10px] text-slate-400">Test de Chow · α, β, κ, ψ, γ</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportPdf(exportCtx)
                    setExportOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-xs hover:bg-slate-800 text-slate-200"
                >
                  <FileText className="size-3.5 text-amber-400" aria-hidden />
                  <span className="flex flex-col">
                    <span>Boletín Oficial (PDF)</span>
                    <span className="font-mono text-[10px] text-slate-400">Boletín A4 con gráficas vectoriales</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Viridis Toggle */}
          <button
            type="button"
            aria-pressed={palette === 'viridis'}
            onClick={() => onPaletteChange(palette === 'viridis' ? 'standard' : 'viridis')}
            title="Paleta daltónicos (Viridis)"
            className={cn(
              'hidden sm:flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-colors',
              palette === 'viridis' ? 'border-yellow-400/60 bg-yellow-400/15 text-yellow-200' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white',
            )}
          >
            <Eye className="size-3.5" aria-hidden />
            <span className="hidden lg:inline">{palette === 'viridis' ? dict.header.viridisLabel : 'Viridis'}</span>
          </button>

          {/* Bilingual Switcher ES / EN */}
          <button
            type="button"
            onClick={() => onLocaleChange(locale === 'es' ? 'en' : 'es')}
            title="Cambiar idioma / Switch language"
            className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-300 hover:text-white"
          >
            <Globe className="size-3.5 text-slate-400" aria-hidden />
            <span>{locale.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Sub-Header: Mode Selector & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800/80 px-4 py-2 text-xs bg-slate-950/60">
        <div className="flex flex-wrap items-center gap-3">
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

          {view === 'map' && (
            <button
              type="button"
              aria-pressed={splitScreen}
              onClick={() => onSplitScreenChange(!splitScreen)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors focus-visible:outline-2 cursor-pointer',
                splitScreen
                  ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white',
              )}
              title="Comparador de Cortina (Split-Screen: Crudo vs Armonizado)"
            >
              <Columns2 className="size-3.5" aria-hidden />
              <span className="hidden md:inline">{dict.header.splitScreen}</span>
            </button>
          )}

          {/* RBAC Role Selector */}
          <label className="hidden items-center gap-1.5 sm:flex" title={locale === 'es' ? roleSpec.orgEs : roleSpec.orgEn}>
            <UserCheck className="size-3.5 text-slate-400" aria-hidden />
            <span className="sr-only">Rol RBAC</span>
            <select
              aria-label="Rol RBAC"
              value={role}
              onChange={(e) => onRoleChange(e.target.value as RbacRole)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-300 focus-visible:outline-none cursor-pointer"
            >
              {RBAC_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  RBAC: {locale === 'es' ? r.labelEs : r.labelEn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
