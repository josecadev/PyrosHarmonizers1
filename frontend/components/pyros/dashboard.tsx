'use client'

import { useMemo, useState } from 'react'
import { REGIONS, getCalendar, getHistory, getKpis, type Filters, type Mode } from '@/lib/pyros/data'
import { buildScene } from '@/lib/pyros/scene'
import { AppSidebar, type View } from './app-sidebar'
import { ControlHeader } from './control-header'
import { MapViewer } from './map-viewer'
import { CalendarView } from './calendar-view'
import { LabView } from './lab-view'
import { DataExplorer } from './data-explorer'

export function Dashboard() {
  const [view, setView] = useState<View>('map')
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<Mode>('raw')
  const [regionId, setRegionId] = useState(REGIONS[0].id)
  const [year, setYear] = useState(2024)
  const [doy, setDoy] = useState(245)
  const [filters, setFilters] = useState<Filters>({ orbit: 'all', confidence: true, modis: true, viirs: true })

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
    <div className="flex min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <AppSidebar view={view} onViewChange={setView} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
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
        />
        <main className="flex min-h-0 flex-1 flex-col">
          {view === 'map' && (
            <MapViewer
              mode={mode}
              scene={scene}
              region={region}
              day={day}
              year={year}
              total={calendar.length}
              onDoyChange={setDoy}
            />
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
            <DataExplorer mode={mode} region={region} year={year} kpis={kpis} scene={scene} calendar={calendar} day={day} />
          )}
        </main>
      </div>
    </div>
  )
}
