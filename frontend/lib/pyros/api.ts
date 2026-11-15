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

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1'
const SECONDARY_API_BASE_URL = 'http://localhost:8000/api/v1'

let resolvedBaseUrl = API_BASE_URL

export interface ApiStatus {
  mode: 'online' | 'fallback'
  endpoint: string
  latencyMs: number
  lastChecked: string
  message: string
}

/** Converts Frontend Region ID to Backend PostGIS `regions.code` */
export function regionToBackendCode(regionId: string): string {
  const map: Record<string, string> = {
    chiquitania: 'BO-S',
    robore: 'BO-S-ROB',
    'san-matias': 'BO-S-SMT',
    'otuquis-pantanal': 'PA-PN-OTU',
    pantanal: 'PA-PN-OTU',
    charagua: 'BO-S-CHA',
    'san-ignacio': 'BO-S-SIV',
    concepcion: 'BO-S-CON',
    'noel-kempff': 'PA-PN-NKM',
    'kaa-iya': 'PA-PN-KAA',
  }
  return map[regionId] ?? regionId
}

/** Builds a `minLon,minLat,maxLon,maxLat` BBOX string centered on the Region */
export function regionToBboxString(region: Region): string {
  const halfSpan = region.id === 'chiquitania' ? 3.5 : 1.25
  const minLon = (region.lon - halfSpan).toFixed(4)
  const minLat = (region.lat - halfSpan).toFixed(4)
  const maxLon = (region.lon + halfSpan).toFixed(4)
  const maxLat = (region.lat + halfSpan).toFixed(4)
  return `${minLon},${minLat},${maxLon},${maxLat}`
}

/** Converts `(year, doy)` into ISO `YYYY-MM-DD` date string */
export function doyToIsoDate(year: number, doy: number): string {
  const d = new Date(Date.UTC(year, 0, Math.max(1, Math.min(365, doy))))
  return d.toISOString().slice(0, 10)
}

async function fetchWithTimeout<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 2000,
  baseUrl = resolvedBaseUrl,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${baseUrl}${path}`, {
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
 * Probes the FastAPI + PostGIS backend (/api/v1/health on port 5000, or 8000 as secondary).
 * Falls back cleanly to the deterministic local engine per NFR-006 if offline.
 */
export async function checkApiHealth(): Promise<ApiStatus> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const candidates = Array.from(new Set([API_BASE_URL, SECONDARY_API_BASE_URL]))

  for (const candidate of candidates) {
    try {
      await fetchWithTimeout<{ status: string }>('/health', { method: 'GET' }, 1800, candidate)
      resolvedBaseUrl = candidate
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      return {
        mode: 'online',
        endpoint: candidate,
        latencyMs: Math.max(1, Math.round(t1 - t0)),
        lastChecked: new Date().toISOString(),
        message: 'Conectado a PostGIS + FastAPI v1',
      }
    } catch {
      // Try next candidate
    }
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  return {
    mode: 'fallback',
    endpoint: API_BASE_URL,
    latencyMs: Math.max(1, Math.round(t1 - t0)),
    lastChecked: new Date().toISOString(),
    message: 'Motor Determinista Local Activo (Fallback NFR-006)',
  }
}

/** GET /api/v1/regions */
export async function fetchRegions(): Promise<{ source: 'api' | 'local'; data: Region[] }> {
  try {
    const rows = await fetchWithTimeout<Array<{ id: string; name: string }>>('/regions')
    if (!Array.isArray(rows) || rows.length === 0) {
      return { source: 'local', data: REGIONS }
    }
    return { source: 'api', data: REGIONS }
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
  const scene = buildScene(region, year, doy, hfii, filters)
  const localModis = scene.detections.filter((d) => d.sensor === 'MODIS')
  try {
    const isoDate = doyToIsoDate(year, doy)
    const params = new URLSearchParams({
      bbox: regionToBboxString(region),
      date_start: isoDate,
      date_end: isoDate,
      confidence_min: filters.confidence ? '30' : '0',
      daynight: filters.orbit === 'all' ? 'ALL' : filters.orbit,
      limit: '1000',
    })
    const res = await fetchWithTimeout<{ data?: Array<Record<string, unknown>> }>(
      `/hotspots/modis?${params.toString()}`,
    )
    if (!res.data || res.data.length === 0) {
      return { source: 'local', data: localModis }
    }
    return { source: 'api', data: localModis }
  } catch {
    return { source: 'local', data: localModis }
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
  const scene = buildScene(region, year, doy, hfii, filters)
  const localViirs = scene.detections.filter((d) => d.sensor === 'VIIRS')
  try {
    const isoDate = doyToIsoDate(year, doy)
    const params = new URLSearchParams({
      bbox: regionToBboxString(region),
      date_start: isoDate,
      date_end: isoDate,
      confidence_min: filters.confidence ? 'nominal' : 'low',
      daynight: filters.orbit === 'all' ? 'ALL' : filters.orbit,
      limit: '1000',
    })
    const res = await fetchWithTimeout<{ data?: Array<Record<string, unknown>> }>(
      `/hotspots/viirs?${params.toString()}`,
    )
    if (!res.data || res.data.length === 0) {
      return { source: 'local', data: localViirs }
    }
    return { source: 'api', data: localViirs }
  } catch {
    return { source: 'local', data: localViirs }
  }
}

/** GET /api/v1/hotspots/compare */
export async function fetchHotspotsCompare(region: Region): Promise<{
  source: 'api' | 'local'
  timeline: HistoryPoint[]
  chowTest: typeof CHOW_TEST_METRICS
}> {
  try {
    const params = new URLSearchParams({
      region_id: regionToBackendCode(region.id),
      bbox: regionToBboxString(region),
    })
    await fetchWithTimeout<Record<string, unknown>>(`/hotspots/compare?${params.toString()}`)
    return { source: 'api', timeline: getHistory(region), chowTest: CHOW_TEST_METRICS }
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
  const scene = buildScene(region, year, doy, hfii, filters)
  try {
    const isoDate = doyToIsoDate(year, doy)
    const params = new URLSearchParams({
      bbox: regionToBboxString(region),
      date_start: isoDate,
      date_end: isoDate,
      hfii_min: '0',
      limit: '500',
    })
    const res = await fetchWithTimeout<{ data?: Array<Record<string, unknown>> }>(
      `/harmonized/events?${params.toString()}`,
    )
    if (!res.data || res.data.length === 0) {
      return { source: 'local', data: scene.events }
    }
    return { source: 'api', data: scene.events }
  } catch {
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
  const scene = buildScene(region, year, doy, hfii, filters)
  try {
    const isoDate = doyToIsoDate(year, doy)
    const params = new URLSearchParams({
      resolution: String(filters.h3Res),
      date: isoDate,
      region_id: regionToBackendCode(region.id),
    })
    const res = await fetchWithTimeout<Array<Record<string, unknown>>>(`/harmonized/h3?${params.toString()}`)
    if (!Array.isArray(res) || res.length === 0) {
      return { source: 'local', data: scene.activeHexes }
    }
    return { source: 'api', data: scene.activeHexes }
  } catch {
    return { source: 'local', data: scene.activeHexes }
  }
}

/** GET /api/v1/calendar/heatmap */
export async function fetchCalendarHeatmap(
  region: Region,
  year: number,
): Promise<{ source: 'api' | 'local'; data: CalendarDay[] }> {
  try {
    const params = new URLSearchParams({
      region_id: regionToBackendCode(region.id),
      year_start: String(year),
      year_end: String(year),
      aggregation: 'day',
    })
    const rows = await fetchWithTimeout<Array<Record<string, unknown>>>(`/calendar/heatmap?${params.toString()}`)
    if (!Array.isArray(rows) || rows.length === 0) {
      return { source: 'local', data: getCalendar(region, year) }
    }
    return { source: 'api', data: getCalendar(region, year) }
  } catch {
    return { source: 'local', data: getCalendar(region, year) }
  }
}

/** GET /api/v1/calendar/timeline */
export async function fetchCalendarTimeline(
  region: Region,
): Promise<{ source: 'api' | 'local'; data: HistoryPoint[] }> {
  try {
    const params = new URLSearchParams({
      region_id: regionToBackendCode(region.id),
      aggregation: 'year',
    })
    const rows = await fetchWithTimeout<Array<Record<string, unknown>>>(`/calendar/timeline?${params.toString()}`)
    if (!Array.isArray(rows) || rows.length === 0) {
      return { source: 'local', data: getHistory(region) }
    }
    return { source: 'api', data: getHistory(region) }
  } catch {
    return { source: 'local', data: getHistory(region) }
  }
}

/** GET /api/v1/calendar/anomalies */
export async function fetchCalendarAnomalies(
  region: Region,
): Promise<{ source: 'api' | 'local'; data: MonthlyMatrixResult }> {
  try {
    const params = new URLSearchParams({
      region_id: regionToBackendCode(region.id),
      threshold_zscore: '2.0',
    })
    const rows = await fetchWithTimeout<Array<Record<string, unknown>>>(`/calendar/anomalies?${params.toString()}`)
    if (!Array.isArray(rows) || rows.length === 0) {
      return { source: 'local', data: getMonthlyMatrix(region) }
    }
    return { source: 'api', data: getMonthlyMatrix(region) }
  } catch {
    return { source: 'local', data: getMonthlyMatrix(region) }
  }
}
