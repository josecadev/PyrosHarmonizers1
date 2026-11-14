export type Mode = 'raw' | 'dbscan' | 'h3'
export type Orbit = 'all' | 'D' | 'N'

export interface Filters {
  orbit: Orbit
  confidence: boolean
  modis: boolean
  viirs: boolean
}

export interface Region {
  id: string
  name: string
  lat: number
  lon: number
  base: number
  seed: number
  peakDay: number
}

export const REGIONS: Region[] = [
  { id: 'chiquitania', name: 'Chiquitanía - General', lat: -16.82, lon: -61.48, base: 764, seed: 11, peakDay: 244 },
  { id: 'san-ignacio', name: 'San Ignacio de Velasco', lat: -16.37, lon: -60.96, base: 318, seed: 23, peakDay: 238 },
  { id: 'robore', name: 'Roboré', lat: -18.33, lon: -59.76, base: 214, seed: 37, peakDay: 250 },
  { id: 'san-matias', name: 'San Matías', lat: -16.36, lon: -58.4, base: 262, seed: 41, peakDay: 232 },
  { id: 'charagua', name: 'Charagua', lat: -19.79, lon: -63.2, base: 176, seed: 53, peakDay: 256 },
]

export const MODE_LABEL: Record<Mode, string> = {
  raw: 'Datos Crudos (Sin Armonizar)',
  dbscan: 'Armonizado ST-DBSCAN (Poligonal)',
  h3: 'Armonizado Grilla Uber H3 (Hexagonal)',
}

export const YEARS = Array.from({ length: 27 }, (_, i) => 2000 + i)
export const VIIRS_START = 2012
export const H3_CELL_KM2 = 0.737
export const H3_EDGE_KM = 0.461
export const FRP_SLOPE = 0.842
export const FRP_INTERCEPT = 2.31
export const FRP_R2 = 0.87

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(...nums: number[]) {
  let h = 2166136261
  for (const n of nums) {
    h ^= Math.floor(n * 1000)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const CLIMATE_PEAKS: Record<number, number> = {
  2004: 1.25,
  2005: 1.22,
  2007: 1.15,
  2010: 1.45,
  2016: 1.12,
  2019: 1.62,
  2020: 1.32,
  2021: 1.12,
  2024: 1.55,
}

export function climate(year: number, region: Region) {
  if (CLIMATE_PEAKS[year]) return CLIMATE_PEAKS[year]
  const r = mulberry32(hash(year, region.seed))
  return 0.72 + r() * 0.32
}

export interface HistoryPoint {
  year: number
  modis: number
  viirs: number
  raw: number
  harmonized: number
}

export function getHistory(region: Region): HistoryPoint[] {
  return YEARS.map((year) => {
    const harmonized = Math.round(region.base * (0.55 + 0.012 * (year - 2000)) * climate(year, region))
    const modis = Math.round(harmonized * 1.05)
    const constellation = year >= 2023 ? 1.14 : year >= 2018 ? 1.08 : 1
    const viirs = year >= VIIRS_START ? Math.round(harmonized * 3.4 * constellation) : 0
    return { year, modis, viirs, raw: modis + viirs, harmonized }
  })
}

export function isLeap(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export interface CalendarDay {
  doy: number
  date: Date
  iso: string
  hfii: number
  level: 0 | 1 | 2 | 3 | 4
  events: number
  frp: number
}

export function hfiiLevel(v: number): 0 | 1 | 2 | 3 | 4 {
  if (v < 8) return 0
  if (v < 25) return 1
  if (v < 45) return 2
  if (v < 65) return 3
  return 4
}

export const HFII_LEVELS = [
  { label: 'Sin actividad', range: '0–7' },
  { label: 'Baja', range: '8–24' },
  { label: 'Moderada', range: '25–44' },
  { label: 'Alta', range: '45–64' },
  { label: 'Extrema', range: '65–100' },
]

export function getCalendar(region: Region, year: number): CalendarDay[] {
  const days = isLeap(year) ? 366 : 365
  const rand = mulberry32(hash(region.seed, year, 7))
  const c = climate(year, region) / 1.62
  const out: CalendarDay[] = []
  for (let doy = 1; doy <= days; doy++) {
    const date = new Date(Date.UTC(year, 0, doy))
    const d = doy - region.peakDay
    const season = Math.exp(-(d * d) / (2 * 38 * 38))
    const secondary = 0.25 * Math.exp(-((doy - 150) ** 2) / (2 * 20 * 20))
    const noise = 0.55 + rand() * 0.7
    const background = rand() < 0.08 ? rand() * 14 : rand() * 4
    const hfii = Math.min(100, Math.round(100 * c * (season + secondary) * noise + background))
    const events = Math.round((hfii / 100) * (region.base / 14) * (0.6 + rand() * 0.8))
    out.push({
      doy,
      date,
      iso: date.toISOString().slice(0, 10),
      hfii,
      level: hfiiLevel(hfii),
      events,
      frp: Math.round(events * (28 + rand() * 22)),
    })
  }
  return out
}

export function satelliteAvailability(filters: Filters, year: number) {
  const modis = filters.modis
  const viirs = filters.viirs && year >= VIIRS_START
  return { modis, viirs }
}

export interface Kpis {
  rawCount: number
  modisCount: number
  viirsCount: number
  events: number
  dupFactor: number
  reduction: number
  h3Cells: number
  cellsPerDay: number
  rawFrp: number
  calFrp: number
  frpDensity: number
  hfiiRaw: number
  hfii: number
  rawAreaKm2: number
  hullAreaKm2: number
  h3AreaKm2: number
}

export function getKpis(region: Region, year: number, filters: Filters, calendar: CalendarDay[]): Kpis {
  const h = getHistory(region).find((p) => p.year === year)!
  const { modis, viirs } = satelliteAvailability(filters, year)
  const orbitMult = filters.orbit === 'all' ? 1 : filters.orbit === 'D' ? 0.68 : 0.32
  const confMult = filters.confidence ? 1 : 1.14
  const k = orbitMult * confMult
  const modisCount = modis ? Math.round(h.modis * k) : 0
  const viirsCount = viirs ? Math.round(h.viirs * k) : 0
  const rawCount = modisCount + viirsCount
  const events = rawCount === 0 ? 0 : Math.round(h.harmonized * k * (viirs && !modis ? 0.98 : 1))
  const reduction = rawCount ? 1 - events / rawCount : 0
  const activeDays = Math.max(1, calendar.filter((d) => d.level > 0).length)
  const h3Cells = Math.round(events * 1.38)
  const rawFrp = modisCount * 24.1 + viirsCount * 9.8
  const calFrp = events * (FRP_SLOPE * 34 + FRP_INTERCEPT)
  const seasonal = calendar.filter((d) => d.level > 0)
  const hfii = seasonal.length ? Math.round(seasonal.reduce((s, d) => s + d.hfii, 0) / seasonal.length) : 0
  const dupFactor = events ? rawCount / events : 1
  return {
    rawCount,
    modisCount,
    viirsCount,
    events,
    dupFactor,
    reduction,
    h3Cells,
    cellsPerDay: h3Cells / activeDays,
    rawFrp,
    calFrp,
    frpDensity: h3Cells ? calFrp / (h3Cells * H3_CELL_KM2) : 0,
    hfiiRaw: Math.min(100, Math.round(hfii * (viirs ? 1 + (dupFactor - 1) * 0.22 : 1.04))),
    hfii,
    rawAreaKm2: modisCount * 1.21 + viirsCount * 0.16,
    hullAreaKm2: events * 0.84,
    h3AreaKm2: h3Cells * H3_CELL_KM2,
  }
}

export function severity(v: number) {
  return HFII_LEVELS[hfiiLevel(v)].label
}

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
