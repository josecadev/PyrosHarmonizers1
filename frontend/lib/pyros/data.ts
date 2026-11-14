export type Mode = 'raw' | 'dbscan' | 'h3'
export type Orbit = 'all' | 'D' | 'N'
export type NrtWindow = 'historic' | '24h' | '48h' | '7d'
export type H3Res = 7 | 8

export interface Filters {
  orbit: Orbit
  confidence: boolean
  staticMask: boolean
  modis: boolean
  viirs: boolean
  h3Res: H3Res
  nrtWindow: NrtWindow
}

export type RegionCategory = 'Ecorregión' | 'Municipio' | 'Área Protegida SNAP'

export interface Region {
  id: string
  name: string
  category: RegionCategory
  lat: number
  lon: number
  base: number
  seed: number
  peakDay: number
}

export const REGIONS: Region[] = [
  { id: 'chiquitania', name: 'Chiquitanía - General', category: 'Ecorregión', lat: -16.82, lon: -61.48, base: 764, seed: 11, peakDay: 244 },
  { id: 'san-ignacio', name: 'San Ignacio de Velasco', category: 'Municipio', lat: -16.37, lon: -60.96, base: 318, seed: 23, peakDay: 238 },
  { id: 'concepcion', name: 'Concepción', category: 'Municipio', lat: -16.1303, lon: -62.0294, base: 284, seed: 29, peakDay: 241 },
  { id: 'robore', name: 'Roboré', category: 'Municipio', lat: -18.33, lon: -59.76, base: 214, seed: 37, peakDay: 250 },
  { id: 'san-matias', name: 'San Matías', category: 'Municipio', lat: -16.36, lon: -58.4, base: 262, seed: 41, peakDay: 232 },
  { id: 'charagua', name: 'Charagua Iyambae', category: 'Municipio', lat: -19.79, lon: -63.2, base: 176, seed: 53, peakDay: 256 },
  { id: 'noel-kempff', name: 'PN Noel Kempff Mercado', category: 'Área Protegida SNAP', lat: -14.583, lon: -60.833, base: 192, seed: 61, peakDay: 246 },
  { id: 'otuquis-pantanal', name: 'PN Otuquis / Pantanal', category: 'Área Protegida SNAP', lat: -19.55, lon: -58.15, base: 228, seed: 71, peakDay: 248 },
  { id: 'kaa-iya', name: 'PN Kaa-Iya del Gran Chaco', category: 'Área Protegida SNAP', lat: -19.05, lon: -61.25, base: 164, seed: 79, peakDay: 252 },
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
export const H3_RES7_CELL_KM2 = 5.161
export const H3_RES7_EDGE_KM = 1.22
export const FRP_SLOPE = 0.842
export const FRP_INTERCEPT = 2.31
export const FRP_R2 = 0.87
export const HFII_ALPHA = 0.68
export const HFII_BETA = 1.25
export const HFII_KAPPA = 0.18
export const GAMMA_DAY = 1.0
export const GAMMA_NIGHT = 0.72

export const CHOW_TEST_METRICS = {
  pValueRaw: 0.000042,
  pValueHarmonized: 0.4821,
  rawJumpMultiplier: 3.42,
  harmonizedJumpMultiplier: 1.08,
  energyConservationIndex: 0.941,
  fScoreClustering: 0.91,
}

export function getH3Specs(res: H3Res) {
  return res === 7
    ? { res: 7 as const, areaKm2: H3_RES7_CELL_KM2, edgeKm: H3_RES7_EDGE_KM }
    : { res: 8 as const, areaKm2: H3_CELL_KM2, edgeKm: H3_EDGE_KM }
}

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

export type SeverityCode = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'

export interface CalendarDay {
  doy: number
  date: Date
  iso: string
  hfii: number
  level: 0 | 1 | 2 | 3 | 4
  severityCode: SeverityCode
  percentileRank: number
  zScore: number
  events: number
  rawModisFoci: number
  rawViirsFoci: number
  rawFrp: number
  frp: number
}

export function hfiiLevel(v: number): 0 | 1 | 2 | 3 | 4 {
  if (v < 8) return 0
  if (v < 25) return 1
  if (v < 45) return 2
  if (v < 65) return 3
  return 4
}

export function levelToSeverityCode(level: 0 | 1 | 2 | 3 | 4): SeverityCode {
  return (['NONE', 'LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const)[level]
}

export const HFII_LEVELS = [
  { label: 'Sin actividad', code: 'NONE', range: '0–7', percentile: '< P50' },
  { label: 'Baja', code: 'LOW', range: '8–24', percentile: 'P50–P74' },
  { label: 'Moderada', code: 'MODERATE', range: '25–44', percentile: 'P75–P89' },
  { label: 'Alta', code: 'HIGH', range: '45–64', percentile: 'P90–P98' },
  { label: 'Extrema', code: 'EXTREME', range: '65–100', percentile: '≥ P99' },
]

export function getCalendar(region: Region, year: number): CalendarDay[] {
  const days = isLeap(year) ? 366 : 365
  const rand = mulberry32(hash(region.seed, year, 7))
  const c = climate(year, region) / 1.62
  const hasViirs = year >= VIIRS_START
  const constellation = year >= 2023 ? 1.14 : year >= 2018 ? 1.08 : 1
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
    const rawModisFoci = Math.round(events * 1.06)
    const rawViirsFoci = hasViirs ? Math.round(events * 3.35 * constellation) : 0
    const frp = Math.round(events * (28 + rand() * 22))
    const rawFrp = Math.round(rawModisFoci * 24.1 + rawViirsFoci * 9.8)
    const level = hfiiLevel(hfii)

    // Climatological mean and std for this DOY
    const histMean = 100 * (0.88 / 1.62) * (season + secondary) * 0.85 + 2.5
    const histStd = Math.max(6.5, histMean * 0.36)
    const zScore = Math.round(((hfii - histMean) / histStd) * 100) / 100
    const percentileRank = Math.min(0.999, Math.max(0.01, Math.round((1 / (1 + Math.exp(-1.7 * zScore))) * 1000) / 1000))

    out.push({
      doy,
      date,
      iso: date.toISOString().slice(0, 10),
      hfii,
      level,
      severityCode: levelToSeverityCode(level),
      percentileRank,
      zScore,
      events,
      rawModisFoci,
      rawViirsFoci,
      rawFrp,
      frp,
    })
  }
  return out
}

export type AnomalyAlertLevel = 'NORMAL' | 'MODERATE' | 'ORANGE' | 'RED'

export interface MonthlyMatrixCell {
  year: number
  month: number // 0..11
  hfiiMean: number
  hfiiMax: number
  events: number
  rawCount: number
  frp: number
  zScore: number
  alertLevel: AnomalyAlertLevel
  level: 0 | 1 | 2 | 3 | 4
  peakDoy: number
}

export interface MonthlyMatrixResult {
  cells: MonthlyMatrixCell[][] // [yearIdx][monthIdx]
  anomalies: MonthlyMatrixCell[]
  onsetDeltaDays: Record<number, number>
}

export function classifyZScore(z: number): AnomalyAlertLevel {
  if (z >= 2.0) return 'RED'
  if (z >= 1.0) return 'ORANGE'
  if (z > 0.0) return 'MODERATE'
  return 'NORMAL'
}

export function getMonthlyMatrix(region: Region): MonthlyMatrixResult {
  const rawGrid: Omit<MonthlyMatrixCell, 'zScore' | 'alertLevel'>[][] = []
  const onsetDeltaDays: Record<number, number> = {}

  for (const year of YEARS) {
    const cal = getCalendar(region, year)
    // First day with moderate or higher activity (HFII >= 25)
    const firstActive = cal.find((d) => d.doy >= 120 && d.hfii >= 25)?.doy ?? region.peakDay - 35
    const baselineOnset = region.peakDay - 35
    onsetDeltaDays[year] = firstActive - baselineOnset

    const yearRow: Omit<MonthlyMatrixCell, 'zScore' | 'alertLevel'>[] = []
    for (let m = 0; m < 12; m++) {
      const mDays = cal.filter((d) => d.date.getUTCMonth() === m)
      const hfiiMean = Math.round(mDays.reduce((s, d) => s + d.hfii, 0) / Math.max(1, mDays.length))
      const hfiiMax = mDays.reduce((max, d) => Math.max(max, d.hfii), 0)
      const events = mDays.reduce((s, d) => s + d.events, 0)
      const rawCount = mDays.reduce((s, d) => s + d.rawModisFoci + d.rawViirsFoci, 0)
      const frp = mDays.reduce((s, d) => s + d.frp, 0)
      const peakDayObj = mDays.reduce((best, d) => (d.hfii > best.hfii ? d : best), mDays[0])

      yearRow.push({
        year,
        month: m,
        hfiiMean,
        hfiiMax,
        events,
        rawCount,
        frp,
        level: hfiiLevel(hfiiMean),
        peakDoy: peakDayObj?.doy ?? 1,
      })
    }
    rawGrid.push(yearRow)
  }

  // Compute monthly climatological mean & std (baseline 2000-2025)
  const monthStats = Array.from({ length: 12 }, (_, m) => {
    const vals = rawGrid.map((row) => row[m].hfiiMean)
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
    const std = Math.max(2.5, Math.sqrt(variance))
    return { mean, std }
  })

  const anomalies: MonthlyMatrixCell[] = []
  const cells: MonthlyMatrixCell[][] = rawGrid.map((row) =>
    row.map((cell) => {
      const { mean, std } = monthStats[cell.month]
      const zScore = Math.round(((cell.hfiiMean - mean) / std) * 100) / 100
      const alertLevel = classifyZScore(zScore)
      const full: MonthlyMatrixCell = { ...cell, zScore, alertLevel }
      if (zScore >= 1.5 && cell.month >= 5 && cell.month <= 10) {
        anomalies.push(full)
      }
      return full
    }),
  )

  return { cells, anomalies, onsetDeltaDays }
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
  staticMaskedCount: number
  events: number
  dupFactor: number
  reduction: number
  h3Cells: number
  h3Res: H3Res
  cellsPerDay: number
  rawFrp: number
  calFrp: number
  frpDensity: number
  hfiiRaw: number
  hfii: number
  rawAreaKm2: number
  hullAreaKm2: number
  h3AreaKm2: number
  coDetectionRate: number
}

export function getKpis(region: Region, year: number, filters: Filters, calendar: CalendarDay[]): Kpis {
  const h = getHistory(region).find((p) => p.year === year)!
  const { modis, viirs } = satelliteAvailability(filters, year)
  const orbitMult = filters.orbit === 'all' ? 1 : filters.orbit === 'D' ? 0.68 : 0.32
  const confMult = filters.confidence ? 1 : 1.14
  const nrtMult =
    filters.nrtWindow === 'historic'
      ? 1
      : filters.nrtWindow === '24h'
        ? 0.018
        : filters.nrtWindow === '48h'
          ? 0.035
          : 0.11

  const k = orbitMult * confMult * nrtMult
  const staticMaskedCount = Math.max(1, Math.round(18 * nrtMult * (region.base / 300)))
  const unmaskedPenalty = filters.staticMask ? 0 : staticMaskedCount

  const modisCount = (modis ? Math.round(h.modis * k) : 0) + (modis ? Math.round(unmaskedPenalty * 0.3) : 0)
  const viirsCount = (viirs ? Math.round(h.viirs * k) : 0) + (viirs ? Math.round(unmaskedPenalty * 0.7) : 0)
  const rawCount = modisCount + viirsCount
  const events =
    rawCount === 0
      ? 0
      : Math.max(1, Math.round(h.harmonized * k * (viirs && !modis ? 0.98 : 1)) + (filters.staticMask ? 0 : Math.ceil(unmaskedPenalty * 0.4)))
  const reduction = rawCount ? 1 - events / rawCount : 0
  const activeDays = Math.max(1, calendar.filter((d) => d.level > 0).length)

  const h3Spec = getH3Specs(filters.h3Res)
  const h3Cells = filters.h3Res === 8 ? Math.round(events * 1.38) : Math.max(1, Math.round(events * 0.42))

  const solarWeight = filters.orbit === 'N' ? GAMMA_NIGHT : filters.orbit === 'D' ? GAMMA_DAY : 0.91
  const rawFrp = modisCount * 24.1 + viirsCount * 9.8
  const calFrp = events * (FRP_SLOPE * 34 + FRP_INTERCEPT) * solarWeight
  const seasonal = calendar.filter((d) => d.level > 0)
  const hfii = seasonal.length ? Math.round(seasonal.reduce((s, d) => s + d.hfii, 0) / seasonal.length) : 0
  const dupFactor = events ? rawCount / events : 1

  return {
    rawCount,
    modisCount,
    viirsCount,
    staticMaskedCount,
    events,
    dupFactor,
    reduction,
    h3Cells,
    h3Res: filters.h3Res,
    cellsPerDay: h3Cells / activeDays,
    rawFrp,
    calFrp,
    frpDensity: h3Cells ? calFrp / (h3Cells * h3Spec.areaKm2) : 0,
    hfiiRaw: Math.min(100, Math.round(hfii * (viirs ? 1 + (dupFactor - 1) * 0.22 : 1.04))),
    hfii,
    rawAreaKm2: modisCount * 1.21 + viirsCount * 0.16,
    hullAreaKm2: events * 0.84,
    h3AreaKm2: h3Cells * h3Spec.areaKm2,
    coDetectionRate: modis && viirs ? 0.612 : 0,
  }
}

export function severity(v: number) {
  return HFII_LEVELS[hfiiLevel(v)].label
}

export const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

const WEEKDAY_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const MONTH_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Locale-independent so server and client render identical strings. */
export function formatDateEs(date: Date) {
  return `${WEEKDAY_ES[date.getUTCDay()]}, ${date.getUTCDate()} de ${MONTH_ES[date.getUTCMonth()]}`
}

const SUBUNITS: Record<string, { label: string; names: string[] }> = {
  chiquitania: {
    label: 'Municipios',
    names: ['San Ignacio de Velasco', 'San José de Chiquitos', 'Concepción', 'San Matías', 'Roboré', 'San Rafael'],
  },
  'san-ignacio': { label: 'Distritos', names: ['Santa Ana', 'San Miguel', 'Candelaria', 'San Juancito', 'Villa Fátima'] },
  concepcion: { label: 'Distritos', names: ['Monte Verde', 'Río Blanco', 'San Pedro', 'Santa Rita', 'Palmarito de la Frontera'] },
  robore: { label: 'Distritos', names: ['Santiago de Chiquitos', 'Chochís', 'Aguas Calientes', 'Yororobá', 'San Lorenzo'] },
  'san-matias': { label: 'Distritos', names: ['Santo Corazón', 'Las Petas', 'San Fernando', 'Natividad', 'Candelaria'] },
  charagua: { label: 'Zonas', names: ['Isoso', 'Charagua Norte', 'Parapitiguasu', 'Alto Isoso', 'Bañados del Izozog'] },
  'noel-kempff': { label: 'Sectores SNAP', names: ['Meseta de Caparuch', 'Flor de Oro', 'Los Fierros', 'Bahía Las Tojas', 'Río Iténez'] },
  'otuquis-pantanal': { label: 'Sectores SNAP', names: ['Bañados de Otuquis', 'Puerto Busch', 'Río Negro', 'Laguna Cáceres', 'Corredor Man Césped'] },
  'kaa-iya': { label: 'Sectores SNAP', names: ['Bañados del Izozog', 'Palmar de las Islas', 'Tucavaca Sur', 'Capitán Ustárez', 'Río Parapetí'] },
}

export function getSubunitBreakdown(region: Region, day: CalendarDay) {
  const unit = SUBUNITS[region.id] ?? SUBUNITS.chiquitania
  const rand = mulberry32(hash(region.seed, day.doy, 13))
  const weights = unit.names.map((_, i) => (1 / (i + 1.2)) * (0.5 + rand()))
  const total = weights.reduce((a, b) => a + b, 0)
  const rows = unit.names
    .map((name, i) => {
      const share = weights[i] / total
      return { name, share, events: Math.round(day.events * share), frp: Math.round(day.frp * share) }
    })
    .sort((a, b) => b.share - a.share)
  return { label: unit.label, rows }
}
