'use client'

import { useMemo, useState } from 'react'
import { REGIONS, getCalendar, getHistory, getKpis, type Filters, type Mode } from '@/lib/pyros/data'
import { buildScene } from '@/lib/pyros/scene'
import { ControlHeader } from './control-header'
import { KpiPanel } from './kpi-panel'
import { MapViewer } from './map-viewer'
import { AnalyticsPanel } from './analytics-panel'
import { BurnCalendar } from './burn-calendar'

export function Dashboard() {
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
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <ControlHeader
        mode={mode}
        onModeChange={setMode}
        regionId={regionId}
        onRegionChange={setRegionId}
        filters={filters}
        onFiltersChange={setFilters}
        region={region}
        year={year}
        kpis={kpis}
        scene={scene}
        calendar={calendar}
      />
      <main className="flex flex-1 flex-col gap-px bg-border lg:min-h-0 lg:flex-row">
        <KpiPanel mode={mode} kpis={kpis} year={year} region={region} />
        <section aria-label="Visor geoespacial" className="relative flex min-h-[520px] flex-1 flex-col bg-canvas lg:min-h-0">
          <MapViewer mode={mode} scene={scene} region={region} day={day} year={year} />
        </section>
        <AnalyticsPanel mode={mode} history={history} year={year} scene={scene} kpis={kpis} filters={filters} />
      </main>
      <BurnCalendar
        calendar={calendar}
        year={year}
        onYearChange={setYear}
        doy={safeDoy}
        onDoyChange={setDoy}
        mode={mode}
      />
    </div>
  )
}
