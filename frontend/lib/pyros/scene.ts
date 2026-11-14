import {
  FRP_INTERCEPT,
  FRP_SLOPE,
  GAMMA_DAY,
  GAMMA_NIGHT,
  HFII_KAPPA,
  VIIRS_START,
  getH3Specs,
  mulberry32,
  type Filters,
  type H3Res,
  type Region,
} from './data'

export const MAP_W_KM = 16
export const MAP_H_KM = 10.24
export const PX_PER_KM = 62.5
const KM_PER_DEG_LAT = 110.574
const VIIRS_NADIR_AREA = 0.375 * 0.375

export interface Detection {
  id: string
  sensor: 'MODIS' | 'VIIRS'
  satellite: string
  x: number
  y: number
  scan: number
  track: number
  areaKm2: number
  areaCorrection: number
  solarGamma: number
  latitude: number
  longitude: number
  brightness: number
  bright_ti5?: number
  acq_date: string
  acq_time: string
  daynight: 'D' | 'N'
  confidence: string
  lowConfidence: boolean
  isStaticAnomaly?: boolean
  frp: number
  clusterId: number
  h3: string
}

export type DetectionRegime = 'CO_DETECTED' | 'MODIS_ONLY' | 'VIIRS_ONLY'

export interface FireEvent {
  id: number
  eventCode: string
  hull: [number, number][]
  areaKm2: number
  centroid: [number, number]
  latitude: number
  longitude: number
  detections: number
  modis: number
  viirs: number
  deltaT: number
  rawFrpSum: number
  frpCal: number
  acq_date: string
  daynight: 'D' | 'N'
  detectionRegime: DetectionRegime
  spatialDispersionM: number
  members: Detection[]
}

export interface HexCell {
  q: number
  r: number
  cx: number
  cy: number
  points: [number, number][]
  frp: number
  density: number
  count: number
  modisCount: number
  viirsCount: number
  resolution: H3Res
  areaKm2: number
  h3: string
  latitude: number
  longitude: number
}

export interface StaticAnomaly {
  id: string
  name: string
  classification: 'GAS_FLARING_OR_INDUSTRIAL' | 'INDUSTRIAL_KILN'
  x: number
  y: number
  latitude: number
  longitude: number
  activeDays: number
  spanDays: number
  radiusM: number
  frp: number
  masked: boolean
}

export interface Scene {
  detections: Detection[]
  events: FireEvent[]
  hexGrid: HexCell[]
  activeHexes: HexCell[]
  staticAnomalies: StaticAnomaly[]
  bounds: { latTop: number; lonLeft: number; latBottom: number; lonRight: number }
}

export function kmToLatLon(region: Region, x: number, y: number) {
  const latTop = region.lat + MAP_H_KM / 2 / KM_PER_DEG_LAT
  const kmPerDegLon = 111.32 * Math.cos((region.lat * Math.PI) / 180)
  const lonLeft = region.lon - MAP_W_KM / 2 / kmPerDegLon
  return { latitude: latTop - y / KM_PER_DEG_LAT, longitude: lonLeft + x / kmPerDegLon }
}

export function getBounds(region: Region) {
  const tl = kmToLatLon(region, 0, 0)
  const br = kmToLatLon(region, MAP_W_KM, MAP_H_KM)
  return { latTop: tl.latitude, lonLeft: tl.longitude, latBottom: br.latitude, lonRight: br.longitude }
}

function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

function polygonArea(poly: [number, number][]) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

const SQRT3 = Math.sqrt(3)

function hexCenter(q: number, r: number, edgeKm: number) {
  return { x: edgeKm * SQRT3 * (q + r / 2), y: edgeKm * 1.5 * r }
}

function hexCorners(cx: number, cy: number, edgeKm: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return [cx + edgeKm * Math.cos(angle), cy + edgeKm * Math.sin(angle)] as [number, number]
  })
}

function pointToHex(x: number, y: number, edgeKm: number) {
  const qf = ((SQRT3 / 3) * x - (1 / 3) * y) / edgeKm
  const rf = ((2 / 3) * y) / edgeKm
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q, r }
}

function h3Index(region: Region, q: number, r: number, res: H3Res) {
  const prefix = res === 7 ? '8789' : '88b2'
  const v = ((region.seed * 7919 + (q + 512) * 1031 + (r + 512) * 17) >>> 0).toString(16).padStart(7, '0')
  return `${prefix}${v.slice(-7)}ffff`
}

const pad = (n: number) => String(n).padStart(2, '0')

function shuffle<T>(items: T[], rand: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

export function buildScene(
  region: Region,
  year: number,
  doy: number,
  hfii: number,
  filters: Filters,
): Scene {
  const rand = mulberry32((region.seed * 100003 + year * 977 + doy * 31) >>> 0)
  const date = new Date(Date.UTC(year, 0, doy)).toISOString().slice(0, 10)
  const nClusters = hfii < 5 ? (rand() < 0.5 ? 1 : 0) : Math.min(9, Math.round(1 + hfii / 11))

  const modisOn = filters.modis
  const viirsOn = filters.viirs && year >= VIIRS_START
  const viirsSats = year >= 2023 ? ['Suomi-NPP', 'NOAA-20', 'NOAA-21'] : year >= 2018 ? ['Suomi-NPP', 'NOAA-20'] : ['Suomi-NPP']

  // Generate 2 persistent static thermal anomalies per region (ESC-FIL-003 / FR-005)
  const staticRand = mulberry32((region.seed * 4177 + 19) >>> 0)
  const sx1 = 2.1 + staticRand() * 3.2
  const sy1 = 1.8 + staticRand() * 2.4
  const sx2 = MAP_W_KM - (2.4 + staticRand() * 3.0)
  const sy2 = MAP_H_KM - (1.8 + staticRand() * 2.2)

  const staticAnomalies: StaticAnomaly[] = [
    {
      id: 'STAT_SCZ_0042',
      name: 'Mechero Gas / Planta Industrial I',
      classification: 'GAS_FLARING_OR_INDUSTRIAL',
      x: sx1,
      y: sy1,
      ...kmToLatLon(region, sx1, sy1),
      activeDays: 412,
      spanDays: 730,
      radiusM: 100,
      frp: 68.4,
      masked: filters.staticMask,
    },
    {
      id: `STAT_SCZ_00${region.seed}`,
      name: 'Horno Térmico / Estación Compresora II',
      classification: 'INDUSTRIAL_KILN',
      x: sx2,
      y: sy2,
      ...kmToLatLon(region, sx2, sy2),
      activeDays: 378,
      spanDays: 730,
      radiusM: 150,
      frp: 44.2,
      masked: filters.staticMask,
    },
  ]

  const detections: Detection[] = []
  const events: FireEvent[] = []
  const placed: [number, number][] = []

  // If staticMask is disabled (unchecked), static anomalies leak into raw detections and false clusters
  if (!filters.staticMask && (modisOn || viirsOn)) {
    staticAnomalies.forEach((sa, si) => {
      const sensor = viirsOn ? 'VIIRS' : 'MODIS'
      const scan = sensor === 'VIIRS' ? 0.38 : 1.05
      const track = sensor === 'VIIRS' ? 0.38 : 1.02
      const det: Detection = {
        id: `STATIC-${sa.id}`,
        sensor,
        satellite: sensor === 'VIIRS' ? 'Suomi-NPP' : 'Aqua',
        x: sa.x,
        y: sa.y,
        scan,
        track,
        areaKm2: Math.round(scan * track * 1000) / 1000,
        areaCorrection: 1.0,
        solarGamma: 1.0,
        latitude: sa.latitude,
        longitude: sa.longitude,
        brightness: 358,
        bright_ti5: 304,
        acq_date: date,
        acq_time: '1735',
        daynight: 'D',
        confidence: sensor === 'VIIRS' ? 'high' : '94',
        lowConfidence: false,
        isStaticAnomaly: true,
        frp: sa.frp,
        clusterId: 90 + si,
        h3: '',
      }
      detections.push(det)
    })
  }

  for (let c = 0; c < nClusters; c++) {
    let ox = 0
    let oy = 0
    for (let tries = 0; tries < 20; tries++) {
      ox = 1.2 + rand() * (MAP_W_KM - 4.4)
      oy = 1.2 + rand() * (MAP_H_KM - 3.6)
      if (placed.every(([px, py]) => Math.hypot(px - ox, py - oy) > 2.6)) break
    }
    placed.push([ox, oy])

    const daynight: 'D' | 'N' = rand() < 0.72 ? 'D' : 'N'
    if (filters.orbit !== 'all' && filters.orbit !== daynight) continue
    const solarGamma = daynight === 'N' ? GAMMA_NIGHT : GAMMA_DAY

    const modisSat = rand() < 0.5 ? 'Terra' : 'Aqua'
    const modisTime = daynight === 'D' ? (modisSat === 'Terra' ? [14, 25] : [17, 40]) : modisSat === 'Terra' ? [2, 35] : [5, 50]
    const viirsSat = viirsSats[Math.floor(rand() * viirsSats.length)]
    const viirsTime = daynight === 'D' ? [17, 10 + Math.floor(rand() * 40)] : [5, 20 + Math.floor(rand() * 35)]

    const shapes = [
      [[0, 0]],
      [[0, 0], [1, 0]],
      [[0, 0], [1, 0], [0, 1]],
      [[0, 0], [1, 0], [1, 1]],
    ]
    const shape = shapes[Math.min(shapes.length - 1, Math.floor(rand() * (1 + hfii / 25)))]

    const clusterDetections: Detection[] = []
    shape.forEach(([dx, dy], mi) => {
      const mScan = 1 + rand() * 0.28 // models off-nadir bowtie expansion
      const mTrack = 1 + rand() * 0.12
      const mArea = mScan * mTrack
      const mx = ox + dx * mScan
      const my = oy + dy * mTrack
      const mConf = Math.round(18 + rand() * 82)
      const mLL = kmToLatLon(region, mx + mScan / 2, my + mTrack / 2)
      clusterDetections.push({
        id: `MOD-${c + 1}-${mi + 1}`,
        sensor: 'MODIS',
        satellite: modisSat,
        x: mx + mScan / 2,
        y: my + mTrack / 2,
        scan: mScan,
        track: mTrack,
        areaKm2: Math.round(mArea * 1000) / 1000,
        areaCorrection: Math.round((1 / Math.sqrt(mArea)) * 1000) / 1000,
        solarGamma,
        ...mLL,
        brightness: Math.round((daynight === 'D' ? 318 : 302) + rand() * 48),
        bright_ti5: Math.round(294 + rand() * 14),
        acq_date: date,
        acq_time: `${pad(modisTime[0])}${pad(modisTime[1])}`,
        daynight,
        confidence: String(mConf),
        lowConfidence: mConf < 30,
        frp: Math.round((12 + rand() * 60) * 10) / 10,
        clusterId: c,
        h3: '',
      })

      const nViirs = 5 + Math.floor(rand() * 4)
      const cells = shuffle(Array.from({ length: 9 }, (_, i) => i), rand).slice(0, nViirs)
      cells.forEach((cell, vi) => {
        const scan = 0.375 + rand() * 0.08
        const track = 0.375 + rand() * 0.06
        const vArea = scan * track
        const vAreaCorr = (VIIRS_NADIR_AREA / vArea) ** HFII_KAPPA
        const step = (mScan - scan) / 2
        const vx = mx + (cell % 3) * step + (rand() - 0.5) * 0.04 + scan / 2
        const vy = my + Math.floor(cell / 3) * ((mTrack - track) / 2) + (rand() - 0.5) * 0.04 + track / 2
        const r = rand()
        const conf = r < 0.14 ? 'low' : r < 0.78 ? 'nominal' : 'high'
        clusterDetections.push({
          id: `VII-${c + 1}-${mi + 1}-${vi + 1}`,
          sensor: 'VIIRS',
          satellite: viirsSat,
          x: vx,
          y: vy,
          scan,
          track,
          areaKm2: Math.round(vArea * 1000) / 1000,
          areaCorrection: Math.round(vAreaCorr * 1000) / 1000,
          solarGamma,
          ...kmToLatLon(region, vx, vy),
          brightness: Math.round((daynight === 'D' ? 326 : 298) + rand() * 40),
          bright_ti5: Math.round(295 + rand() * 16),
          acq_date: date,
          acq_time: `${pad(viirsTime[0])}${pad(viirsTime[1])}`,
          daynight,
          confidence: conf,
          lowConfidence: conf === 'low',
          frp: Math.round((2.5 + rand() * 18) * 10) / 10,
          clusterId: c,
          h3: '',
        })
      })
    })

    const visible = clusterDetections.filter(
      (d) =>
        (d.sensor === 'MODIS' ? modisOn : viirsOn) && (!filters.confidence || !d.lowConfidence),
    )
    if (!visible.length) continue
    detections.push(...visible)

    const basis = visible.some((d) => d.sensor === 'VIIRS') ? visible.filter((d) => d.sensor === 'VIIRS') : visible
    const corners: [number, number][] = basis.flatMap((d) => [
      [d.x - d.scan / 2, d.y - d.track / 2],
      [d.x + d.scan / 2, d.y - d.track / 2],
      [d.x + d.scan / 2, d.y + d.track / 2],
      [d.x - d.scan / 2, d.y + d.track / 2],
    ])
    const hull = convexHull(corners)
    const cx = basis.reduce((s, d) => s + d.x, 0) / basis.length
    const cy = basis.reduce((s, d) => s + d.y, 0) / basis.length
    const nM = visible.filter((d) => d.sensor === 'MODIS').length
    const nV = visible.length - nM
    const rawFrpSum = Math.round(visible.reduce((s, d) => s + d.frp, 0) * 10) / 10

    // Apply off-nadir area correction & solar gamma per DESIGN.md §3.4
    const frpVCorrected = visible
      .filter((d) => d.sensor === 'VIIRS')
      .reduce((s, d) => s + d.frp * d.areaCorrection * d.solarGamma, 0)
    const frpM = visible
      .filter((d) => d.sensor === 'MODIS')
      .reduce((s, d) => s + d.frp * d.areaCorrection, 0)

    const calibratedViirs = FRP_SLOPE * frpVCorrected + FRP_INTERCEPT
    const frpCal =
      nM > 0 && nV > 0
        ? Math.round((0.55 * frpM + 0.45 * calibratedViirs) * 10) / 10
        : nV > 0
          ? Math.round(calibratedViirs * 10) / 10
          : Math.round(frpM * 10) / 10

    const deltaT = modisOn && viirsOn && nM && nV ? Math.abs(viirsTime[0] + viirsTime[1] / 60 - (modisTime[0] + modisTime[1] / 60)) : 0
    const maxDistKm = visible.reduce((max, d) => Math.max(max, Math.hypot(d.x - cx, d.y - cy)), 0)
    const detectionRegime: DetectionRegime = nM > 0 && nV > 0 ? 'CO_DETECTED' : nM > 0 ? 'MODIS_ONLY' : 'VIIRS_ONLY'

    events.push({
      id: c,
      eventCode: `PH-${date.replaceAll('-', '')}-${String(c + 1).padStart(2, '0')}`,
      hull,
      areaKm2: polygonArea(hull),
      centroid: [cx, cy],
      ...kmToLatLon(region, cx, cy),
      detections: visible.length,
      modis: nM,
      viirs: nV,
      deltaT: Math.min(deltaT, 3.4),
      rawFrpSum,
      frpCal,
      acq_date: date,
      daynight,
      detectionRegime,
      spatialDispersionM: Math.round(maxDistKm * 1000),
      members: visible,
    })
  }

  const h3Spec = getH3Specs(filters.h3Res)
  const edgeKm = h3Spec.edgeKm
  const cellAreaKm2 = h3Spec.areaKm2

  const hexGrid: HexCell[] = []
  const hexMap = new Map<string, HexCell>()
  const rMax = Math.ceil(MAP_H_KM / (1.5 * edgeKm)) + 1
  for (let r = -1; r <= rMax; r++) {
    const qStart = Math.floor(-r / 2) - 1
    const qEnd = Math.ceil(MAP_W_KM / (SQRT3 * edgeKm) - r / 2) + 1
    for (let q = qStart; q <= qEnd; q++) {
      const { x, y } = hexCenter(q, r, edgeKm)
      if (x < -edgeKm || x > MAP_W_KM + edgeKm || y < -edgeKm || y > MAP_H_KM + edgeKm) continue
      const cell: HexCell = {
        q,
        r,
        cx: x,
        cy: y,
        points: hexCorners(x, y, edgeKm),
        frp: 0,
        density: 0,
        count: 0,
        modisCount: 0,
        viirsCount: 0,
        resolution: filters.h3Res,
        areaKm2: cellAreaKm2,
        h3: h3Index(region, q, r, filters.h3Res),
        ...kmToLatLon(region, x, y),
      }
      hexGrid.push(cell)
      hexMap.set(`${q},${r}`, cell)
    }
  }

  const hasViirs = detections.some((d) => d.sensor === 'VIIRS')
  for (const d of detections) {
    const { q, r } = pointToHex(d.x, d.y, edgeKm)
    d.h3 = h3Index(region, q, r, filters.h3Res)
    const cell = hexMap.get(`${q},${r}`)
    if (!cell) continue
    if (d.sensor === 'MODIS') cell.modisCount += 1
    else cell.viirsCount += 1

    if (hasViirs && d.sensor === 'MODIS') continue
    cell.count += 1
    cell.frp += d.sensor === 'VIIRS' ? (FRP_SLOPE * d.frp + FRP_INTERCEPT / 4) * d.areaCorrection * d.solarGamma : d.frp
  }
  const activeHexes = hexGrid.filter((h) => h.count > 0)
  for (const h of activeHexes) {
    h.frp = Math.round(h.frp * 10) / 10
    h.density = Math.round((h.frp / cellAreaKm2) * 10) / 10
  }

  return { detections, events, hexGrid, activeHexes, staticAnomalies, bounds: getBounds(region) }
}
