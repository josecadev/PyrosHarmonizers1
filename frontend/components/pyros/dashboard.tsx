'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { API_BASE_URL, checkApiHealth, type ApiStatus } from '@/lib/pyros/api'
import { REGIONS, getCalendar, getHistory, getKpis, type Filters, type Mode } from '@/lib/pyros/data'
import type { ColorPalette, Locale, RbacRole } from '@/lib/pyros/i18n-rbac'
import { buildScene } from '@/lib/pyros/scene'
import { AppSidebar, type View } from './app-sidebar'
import { BurnCalendar } from './burn-calendar'
import { CalendarView } from './calendar-view'
import { ControlHeader } from './control-header'
import { DataExplorer } from './data-explorer'
import { LabView } from './lab-view'
import { MapViewer } from './map-viewer'

interface DashboardProps {
  initialView?: View
  initialSplitScreen?: boolean
  initialMode?: Mode
}

export function Dashboard({
  initialView = 'map',
  initialSplitScreen = false,
  initialMode = 'raw',
}: DashboardProps = {}) {
  const [view, setView] = useState<View>(initialView)
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [splitScreen, setSplitScreen] = useState(initialSplitScreen)
  const [regionId, setRegionId] = useState(REGIONS[0].id)
  const [year, setYear] = useState(2024)
  const [doy, setDoy] = useState(245)
  const [locale, setLocale] = useState<Locale>('es')
  const [palette, setPalette] = useState<ColorPalette>('standard')
  const [role, setRole] = useState<RbacRole>('analyst')
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    mode: 'fallback',
    endpoint: API_BASE_URL,
    latencyMs: 1,
    lastChecked: '',
    message: 'Motor Determinista Local Activo (Fallback NFR-006)',
  })

  const [filters, setFilters] = useState<Filters>({
    orbit: 'all',
    confidence: true,
    staticMask: true,
    modis: true,
    viirs: true,
    h3Res: 8,
    nrtWindow: 'historic',
  })

  const refreshApiStatus = useCallback(() => {
    checkApiHealth().then(setApiStatus)
  }, [])

  useEffect(() => {
    refreshApiStatus()
  }, [refreshApiStatus])

  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0]
  const history = useMemo(() => getHistory(region), [region])
  const calendar = useMemo(() => getCalendar(region, year), [region, year])
  const safeDoy = Math.min(doy, calendar.length)
  const day = calendar[safeDoy - 1]
  const kpis = useMemo(() => getKpis(region, year, filters, calendar), [region, year, filters, calendar])
  const scene = useMemo(
    () => buildScene(region, year, safeDoy, day.hfii, filters),
    [region, year, safeDoy, day.hfii, filters],
  )

  return (
    <div
      className={cn(
        'flex min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden',
        palette === 'viridis' && 'palette-viridis',
      )}
    >
      <AppSidebar
        view={view}
        onViewChange={(v) => {
          setView(v)
          if (v !== 'map') setSplitScreen(false)
        }}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        locale={locale}
        splitScreen={splitScreen}
        onOpenCompare={() => {
          setView('map')
          setMode('dbscan')
          setSplitScreen(true)
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ControlHeader
          view={view}
          mode={mode}
          onModeChange={setMode}
          regionId={regionId}
          onRegionChange={setRegionId}
          filters={filters}
          onFiltersChange={setFilters}
          year={year}
          kpis={kpis}
          region={region}
          scene={scene}
          calendar={calendar}
          splitScreen={splitScreen}
          onSplitScreenChange={setSplitScreen}
          locale={locale}
          onLocaleChange={setLocale}
          palette={palette}
          onPaletteChange={setPalette}
          role={role}
          onRoleChange={setRole}
          apiStatus={apiStatus}
          onRefreshApiStatus={refreshApiStatus}
        />
        <main className="flex min-h-0 flex-1 flex-col">
          {view === 'map' && (
            <>
              <MapViewer
                mode={mode}
                scene={scene}
                region={region}
                day={day}
                year={year}
                filters={filters}
                splitScreen={splitScreen}
                onSplitScreenChange={setSplitScreen}
              />
              <BurnCalendar
                calendar={calendar}
                year={year}
                onYearChange={setYear}
                doy={safeDoy}
                onDoyChange={setDoy}
                mode={mode}
                region={region}
              />
            </>
          )}
          {view === 'calendar' && (
            <CalendarView
              calendar={calendar}
              year={year}
              onYearChange={setYear}
              doy={safeDoy}
              onDoyChange={setDoy}
              mode={mode}
              region={region}
              scene={scene}
              onOpenMap={() => setView('map')}
            />
          )}
          {view === 'lab' && <LabView mode={mode} history={history} year={year} scene={scene} kpis={kpis} filters={filters} />}
          {view === 'data' && (
            <DataExplorer mode={mode} region={region} year={year} kpis={kpis} scene={scene} calendar={calendar} day={day} role={role} />
          )}
        </main>
      </div>
    </div>
  )
}
