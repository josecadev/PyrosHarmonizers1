import {
  CHOW_TEST_METRICS,
  REGIONS,
  getCalendar,
  getHistory,
  getMonthlyMatrix,
  type CalendarDay,
  type Filters,
  type HistoryPoint,
  type MonthlyMatrixResult,
  type Region,
} from './data'
import { buildScene, type Detection, type FireEvent, type HexCell } from './scene'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export interface ApiStatus {
  mode: 'online' | 'fallback'
  endpoint: string
  latencyMs: number
  lastChecked: string
  message: string
}

async function fetchWithTimeout<T>(path: string, init?: RequestInit, timeoutMs = 2000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Probes the FastAPI + PostGIS backend (/api/v1/health).
 * Falls back cleanly to the deterministic local engine per NFR-006 if offline.
 */
export async function checkApiHealth(): Promise<ApiStatus> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  try {
    await fetchWithTimeout<{ status: string }>('/health', { method: 'GET' }, 1800)
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    return {
      mode: 'online',
      endpoint: API_BASE_URL,
      latencyMs: Math.max(1, Math.round(t1 - t0)),
      lastChecked: new Date().toISOString(),
      message: 'Conectado a PostGIS + FastAPI v1',
    }
  } catch {
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    return {
      mode: 'fallback',
      endpoint: API_BASE_URL,
      latencyMs: Math.max(1, Math.round(t1 - t0)),
      lastChecked: new Date().toISOString(),
      message: 'Motor Determinista Local Activo (Fallback NFR-006)',
    }
  }
}

/** GET /api/v1/regions */
export async function fetchRegions(): Promise<{ source: 'api' | 'local'; data: Region[] }> {
  try {
    const data = await fetchWithTimeout<Region[]>('/regions')
    return { source: 'api', data }
  } catch {
    return { source: 'local', data: REGIONS }
  }
}

/** GET /api/v1/hotspots/modis */
export async function fetchModisHotspots(
  region: Region,
  year: number,
  doy: number,
  hfii: number,
  filters: Filters,
): Promise<{ source: 'api' | 'local'; data: Detection[] }> {
  try {
    const params = new URLSearchParams({
      region: region.id,
      year: String(year),
      doy: String(doy),
      orbit: filters.orbit,
      min_confidence: filters.confidence ? '30' : '0',
    })
    const data = await fetchWithTimeout<Detection[]>(`/hotspots/modis?${params.toString()}`)
    return { source: 'api', data }
  } catch {
    const scene = buildScene(region, year, doy, hfii, filters)
    return { source: 'local', data: scene.detections.filter((d) => d.sensor === 'MODIS') }
  }
}

/** GET /api/v1/hotspots/viirs */
export async function fetchViirsHotspots(
  region: Region,
  year: number,
  doy: number,
  hfii: number,
  filters: Filters,
): Promise<{ source: 'api' | 'local'; data: Detection[] }> {
  try {
    const params = new URLSearchParams({
      region: region.id,
      year: String(year),
      doy: String(doy),
      orbit: filters.orbit,
      exclude_low: String(filters.confidence),
    })
    const data = await fetchWithTimeout<Detection[]>(`/hotspots/viirs?${params.toString()}`)
    return { source: 'api', data }
  } catch {
    const scene = buildScene(region, year, doy, hfii, filters)
    return { source: 'local', data: scene.detections.filter((d) => d.sensor === 'VIIRS') }
  }
}

/** GET /api/v1/hotspots/compare */
export async function fetchHotspotsCompare(region: Region): Promise<{
  source: 'api' | 'local'
  timeline: HistoryPoint[]
  chowTest: typeof CHOW_TEST_METRICS
}> {
  try {
    const data = await fetchWithTimeout<{ timeline: HistoryPoint[]; chowTest: typeof CHOW_TEST_METRICS }>(
      `/hotspots/compare?region=${encodeURIComponent(region.id)}`,
    )
    return { source: 'api', ...data }
  } catch {
    return { source: 'local', timeline: getHistory(region), chowTest: CHOW_TEST_METRICS }
  }
}

/** GET /api/v1/harmonized/events */
export async function fetchHarmonizedEvents(
  region: Region,
  year: number,
  doy: number,
  hfii: number,
  filters: Filters,
): Promise<{ source: 'api' | 'local'; data: FireEvent[] }> {
  try {
    const params = new URLSearchParams({
      region: region.id,
      year: String(year),
      doy: String(doy),
      eps_meters: '750',
      min_time_hours: '3.5',
      static_mask: String(filters.staticMask),
    })
    const data = await fetchWithTimeout<FireEvent[]>(`/harmonized/events?${params.toString()}`)
    return { source: 'api', data }
  } catch {
    const scene = buildScene(region, year, doy, hfii, filters)
    return { source: 'local', data: scene.events }
  }
}

/** GET /api/v1/harmonized/h3 */
export async function fetchHarmonizedH3(
  region: Region,
  year: number,
  doy: number,
  hfii: number,
  filters: Filters,
): Promise<{ source: 'api' | 'local'; data: HexCell[] }> {
  try {
    const params = new URLSearchParams({
      region: region.id,
      year: String(year),
      doy: String(doy),
      h3_res: String(filters.h3Res),
    })
    const data = await fetchWithTimeout<HexCell[]>(`/harmonized/h3?${params.toString()}`)
    return { source: 'api', data }
  } catch {
    const scene = buildScene(region, year, doy, hfii, filters)
    return { source: 'local', data: scene.activeHexes }
  }
}

/** GET /api/v1/calendar/heatmap */
export async function fetchCalendarHeatmap(
  region: Region,
  year: number,
): Promise<{ source: 'api' | 'local'; data: CalendarDay[] }> {
  try {
    const data = await fetchWithTimeout<CalendarDay[]>(
      `/calendar/heatmap?region=${encodeURIComponent(region.id)}&year=${year}`,
    )
    return { source: 'api', data }
  } catch {
    return { source: 'local', data: getCalendar(region, year) }
  }
}

/** GET /api/v1/calendar/timeline */
export async function fetchCalendarTimeline(
  region: Region,
): Promise<{ source: 'api' | 'local'; data: HistoryPoint[] }> {
  try {
    const data = await fetchWithTimeout<HistoryPoint[]>(
      `/calendar/timeline?region=${encodeURIComponent(region.id)}`,
    )
    return { source: 'api', data }
  } catch {
    return { source: 'local', data: getHistory(region) }
  }
}

/** GET /api/v1/calendar/anomalies */
export async function fetchCalendarAnomalies(
  region: Region,
): Promise<{ source: 'api' | 'local'; data: MonthlyMatrixResult }> {
  try {
    const data = await fetchWithTimeout<MonthlyMatrixResult>(
      `/calendar/anomalies?region=${encodeURIComponent(region.id)}`,
    )
    return { source: 'api', data }
  } catch {
    return { source: 'local', data: getMonthlyMatrix(region) }
  }
}
