'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmt, formatDateEs, severity, type CalendarDay, type Mode, type Region } from '@/lib/pyros/data'
import { MAP_H_KM, MAP_W_KM, PX_PER_KM, type Detection, type FireEvent, type HexCell, type Scene } from '@/lib/pyros/scene'
import { Inspector } from './inspector'
import { CornerMarks, Eyebrow } from './ui'

const VB_W = MAP_W_KM * PX_PER_KM
const VB_H = MAP_H_KM * PX_PER_KM
const GRAT_STEP = 0.025

export type Selection =
  | { kind: 'det'; item: Detection }
  | { kind: 'event'; item: FireEvent }
  | { kind: 'hex'; item: HexCell }

interface Props {
  mode: Mode
  scene: Scene
  region: Region
  day: CalendarDay
  year: number
  total: number
  onDoyChange: React.Dispatch<React.SetStateAction<number>>
}

type LayerKey = 'modis' | 'viirs' | 'hull' | 'hex' | 'graticule'

const LAYERS: { key: LayerKey; label: string; swatch: string; modes?: Mode[] }[] = [
  { key: 'modis', label: 'MODIS 1 km', swatch: 'border border-modis' },
  { key: 'viirs', label: 'VIIRS 375 m', swatch: 'bg-viirs' },
  { key: 'hull', label: 'Envolvente ST-DBSCAN', swatch: 'border border-harmonized bg-harmonized/15', modes: ['dbscan'] },
  { key: 'hex', label: 'Grilla H3 res. 8', swatch: 'bg-heat-3', modes: ['h3'] },
  { key: 'graticule', label: 'Retícula WGS84', swatch: 'border border-dashed border-platinum' },
]

const HEX_FILLS = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']
function hexFill(density: number) {
  if (density < 20) return HEX_FILLS[0]
  if (density < 50) return HEX_FILLS[1]
  if (density < 100) return HEX_FILLS[2]
  return HEX_FILLS[3]
}

const hud = 'relative border border-rule bg-background/85 backdrop-blur-md'

export function MapViewer({ mode, scene, region, day, year, total, onDoyChange }: Props) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ modis: true, viirs: true, hull: true, hex: true, graticule: true })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const sceneRef = useRef(scene)

  if (sceneRef.current !== scene) {
    sceneRef.current = scene
    if (selection) setSelection(null)
  }

  const kmPerDegLon = 111.32 * Math.cos((region.lat * Math.PI) / 180)
  const { latTop, lonLeft, latBottom, lonRight } = scene.bounds

  const graticule = useMemo(() => {
    const lats: { v: number; y: number }[] = []
    const lons: { v: number; x: number }[] = []
    for (let lat = Math.ceil(latBottom / GRAT_STEP) * GRAT_STEP; lat <= latTop; lat += GRAT_STEP) {
      lats.push({ v: lat, y: (latTop - lat) * 110.574 * PX_PER_KM })
    }
    for (let lon = Math.ceil(lonLeft / GRAT_STEP) * GRAT_STEP; lon <= lonRight; lon += GRAT_STEP) {
      lons.push({ v: lon, x: (lon - lonLeft) * kmPerDegLon * PX_PER_KM })
    }
    return { lats, lons }
  }, [latTop, lonLeft, latBottom, lonRight, kmPerDegLon])

  const zoomBy = (factor: number) => {
    const z = Math.min(6, Math.max(1, zoom * factor))
    const cx = VB_W / 2
    const cy = VB_H / 2
    setPan({ x: cx - (cx - pan.x) * (z / zoom), y: cy - (cy - pan.y) * (z / zoom) })
    setZoom(z)
  }
  const reset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const unitRatio = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 1
    return Math.max(VB_W / rect.width, VB_H / rect.height)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true
      setDragging(true)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      const k = unitRatio()
      setPan({ x: d.px + dx * k, y: d.py + dy * k })
    }
  }
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current
    setDragging(false)
    if (d?.moved) {
      ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
      setTimeout(() => (drag.current = null), 0)
      return
    }
    drag.current = null
  }
  const select = (s: Selection) => () => {
    if (drag.current?.moved) return
    setSelection(s)
  }

  const modisDet = scene.detections.filter((d) => d.sensor === 'MODIS')
  const viirsDet = scene.detections.filter((d) => d.sensor === 'VIIRS')

  const op = {
    modis: !layers.modis ? 0 : mode === 'raw' ? 1 : mode === 'dbscan' ? 0.3 : 0.12,
    viirs: !layers.viirs ? 0 : mode === 'raw' ? 1 : mode === 'dbscan' ? 0.35 : 0.15,
    hull: layers.hull && mode === 'dbscan' ? 1 : 0,
    hex: layers.hex && mode === 'h3' ? 1 : 0,
  }

  const kmBar = zoom * PX_PER_KM > 140 ? 0.5 : 1
  const barLen = kmBar * PX_PER_KM * zoom
  const isSelected = (kind: Selection['kind'], id: string | number) =>
    selection?.kind === kind &&
    (kind === 'hex'
      ? (selection.item as HexCell).h3 === id
      : kind === 'det'
        ? (selection.item as Detection).id === id
        : (selection.item as FireEvent).id === id)

  return (
    <div className="relative flex min-h-[560px] w-full flex-1 overflow-hidden bg-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
        role="application"
        aria-label={`Visor de huella de píxel para ${region.name}, ${day.iso}`}
      >
        <rect width={VB_W} height={VB_H} fill="var(--canvas)" onClick={() => setSelection(null)} />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {layers.graticule && (
            <g aria-hidden>
              {graticule.lats.map((l) => (
                <line key={`la${l.v}`} x1={-VB_W} x2={VB_W * 2} y1={l.y} y2={l.y} stroke="var(--rule)" strokeDasharray="2 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {graticule.lons.map((l) => (
                <line key={`lo${l.v}`} y1={-VB_H} y2={VB_H * 2} x1={l.x} x2={l.x} stroke="var(--rule)" strokeDasharray="2 4" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}

          <g transform={`scale(${PX_PER_KM})`}>
            <g style={{ opacity: op.hex, transition: 'opacity 500ms ease' }} pointerEvents={op.hex ? 'auto' : 'none'}>
              {scene.hexGrid.map((h) => (
                <polygon
                  key={h.h3}
                  points={h.points.map((p) => p.join(',')).join(' ')}
                  fill={h.count ? hexFill(h.density) : 'transparent'}
                  fillOpacity={h.count ? 0.9 : 0}
                  stroke={h.count ? 'var(--harmonized)' : 'var(--border)'}
                  strokeOpacity={h.count ? (isSelected('hex', h.h3) ? 1 : 0.28) : 1}
                  strokeWidth={isSelected('hex', h.h3) ? 2 : 1}
                  vectorEffect="non-scaling-stroke"
                  className={h.count ? 'cursor-pointer' : undefined}
                  onClick={h.count ? select({ kind: 'hex', item: h }) : undefined}
                />
              ))}
            </g>

            <g style={{ opacity: op.modis, transition: 'opacity 500ms ease' }} pointerEvents={op.modis ? 'auto' : 'none'}>
              {modisDet.map((d) => (
                <rect
                  key={d.id}
                  x={d.x - d.scan / 2}
                  y={d.y - d.track / 2}
                  width={d.scan}
                  height={d.track}
                  fill="var(--modis)"
                  fillOpacity={isSelected('det', d.id) ? 0.25 : 0.05}
                  stroke="var(--modis)"
                  strokeWidth={isSelected('det', d.id) ? 2.5 : 1.25}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer"
                  onClick={select({ kind: 'det', item: d })}
                />
              ))}
            </g>

            <g style={{ opacity: op.viirs, transition: 'opacity 500ms ease' }} pointerEvents={op.viirs ? 'auto' : 'none'}>
              {viirsDet.map((d) => (
                <rect
                  key={d.id}
                  x={d.x - d.scan / 2}
                  y={d.y - d.track / 2}
                  width={d.scan}
                  height={d.track}
                  fill="var(--viirs)"
                  fillOpacity={isSelected('det', d.id) ? 0.95 : 0.5}
                  stroke={isSelected('det', d.id) ? 'var(--harmonized)' : 'var(--viirs)'}
                  strokeWidth={isSelected('det', d.id) ? 2 : 0.6}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer"
                  onClick={select({ kind: 'det', item: d })}
                />
              ))}
            </g>

            <g style={{ opacity: op.hull, transition: 'opacity 600ms ease' }} pointerEvents={op.hull ? 'auto' : 'none'}>
              {scene.events.map((e) => (
                <g
                  key={e.id}
                  style={{
                    transformOrigin: `${e.centroid[0]}px ${e.centroid[1]}px`,
                    transform: op.hull ? 'scale(1)' : 'scale(1.25)',
                    transition: 'transform 600ms cubic-bezier(.2,.8,.2,1)',
                  }}
                >
                  <polygon
                    points={e.hull.map((p) => p.join(',')).join(' ')}
                    fill="var(--harmonized)"
                    fillOpacity={isSelected('event', e.id) ? 0.16 : 0.05}
                    stroke="var(--harmonized)"
                    strokeWidth={isSelected('event', e.id) ? 2 : 1.25}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onClick={select({ kind: 'event', item: e })}
                  />
                  <circle cx={e.centroid[0]} cy={e.centroid[1]} r={0.05} fill="var(--harmonized)" pointerEvents="none" />
                </g>
              ))}
            </g>
          </g>
        </g>
      </svg>

      {layers.graticule && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
          <g fontSize={10} fill="var(--muted-foreground)" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            {graticule.lats.map((l) => {
              const y = pan.y + l.y * zoom
              return y > 120 && y < VB_H - 80 ? (
                <text key={`tla${l.v}`} x={10} y={y - 4}>
                  {Math.abs(l.v).toFixed(3)}°S
                </text>
              ) : null
            })}
            {graticule.lons.map((l) => {
              const x = pan.x + l.x * zoom
              return x > 260 && x < VB_W - 260 ? (
                <text key={`tlo${l.v}`} x={x + 4} y={VB_H - 70}>
                  {Math.abs(l.v).toFixed(3)}°W
                </text>
              ) : null
            })}
          </g>
        </svg>
      )}

      <div className={cn(hud, 'absolute left-4 top-4 flex flex-col gap-1.5 px-3.5 py-3')}>
        <CornerMarks />
        <Eyebrow>
          {day.iso} UTC · DOY {String(day.doy).padStart(3, '0')}
        </Eyebrow>
        <p className="text-[13px] capitalize">{formatDateEs(day.date)}</p>
        <p className="flex gap-3 font-mono text-[11px]">
          <span>
            HFII {day.hfii} <span className="text-muted-foreground">{severity(day.hfii)}</span>
          </span>
        </p>
        <p className="flex gap-3 border-t border-border pt-1.5 font-mono text-[11px]">
          <span className="text-modis">{modisDet.length} MODIS</span>
          <span className="text-viirs">{viirsDet.length} VIIRS</span>
          <span className={cn(mode === 'raw' ? 'text-muted-foreground' : 'text-harmonized')}>
            {mode === 'h3' ? `${scene.activeHexes.length} celdas` : `${scene.events.length} eventos`}
          </span>
        </p>
        {scene.detections.length === 0 && (
          <p className="max-w-56 text-[11px] leading-relaxed text-muted-foreground">
            Sin detecciones para este día y filtros. Prueba un día de julio–octubre.
          </p>
        )}
      </div>

      <fieldset className={cn(hud, 'absolute right-4 top-4 flex w-56 flex-col gap-0.5 p-2')}>
        <CornerMarks />
        <legend className="sr-only">Capas</legend>
        <Eyebrow className="px-1.5 pb-1.5 pt-0.5">Capas</Eyebrow>
        {LAYERS.map((l) => {
          const dim = l.modes && !l.modes.includes(mode)
          return (
            <label
              key={l.key}
              className={cn('flex cursor-pointer items-center gap-2.5 rounded-[2px] px-1.5 py-1 text-xs hover:bg-accent', dim && 'text-muted-foreground')}
            >
              <input
                type="checkbox"
                checked={layers[l.key]}
                onChange={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                className="size-3 accent-foreground"
              />
              <span className={cn('size-2.5 shrink-0', l.swatch)} aria-hidden />
              <span className="flex-1 truncate">{l.label}</span>
              {dim && <span className="font-mono text-[9px] uppercase">{l.modes![0] === 'h3' ? 'H3' : 'DBSCAN'}</span>}
            </label>
          )
        })}
      </fieldset>

      <div className="absolute bottom-4 left-4 flex items-end gap-2">
        <div className={cn(hud, 'flex flex-col')}>
          <CornerMarks />
          <button type="button" onClick={() => zoomBy(1.4)} className="p-2 hover:bg-accent focus-visible:outline-2" aria-label="Acercar">
            <Plus className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => zoomBy(1 / 1.4)} className="border-t border-border p-2 hover:bg-accent focus-visible:outline-2" aria-label="Alejar">
            <Minus className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={reset} className="border-t border-border p-2 hover:bg-accent focus-visible:outline-2" aria-label="Restablecer vista">
            <Maximize2 className="size-4" aria-hidden />
          </button>
        </div>
        <span className="border border-rule bg-background/85 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{fmt(zoom, 1)}x</span>
      </div>

      <div className={cn(hud, 'absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center')}>
        <CornerMarks />
        <button
          type="button"
          onClick={() => onDoyChange((d) => Math.max(1, d - 1))}
          disabled={day.doy <= 1}
          className="p-2 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
          aria-label="Día anterior"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="border-x border-border px-3 py-1.5 font-mono text-[11px] tabular-nums">
          {year} · DOY {String(day.doy).padStart(3, '0')}
        </span>
        <button
          type="button"
          onClick={() => onDoyChange((d) => Math.min(total, d + 1))}
          disabled={day.doy >= total}
          className="p-2 hover:bg-accent disabled:opacity-40 focus-visible:outline-2"
          aria-label="Día siguiente"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className={cn(hud, 'absolute bottom-4 right-4 flex flex-col items-start gap-1 px-3 py-2')} aria-hidden>
        <span className="font-mono text-[10px] text-muted-foreground">{kmBar === 1 ? '1 km' : '500 m'}</span>
        <span className="relative block h-2 border-x border-b border-foreground" style={{ width: Math.max(24, Math.min(200, barLen / unitRatioSafe(svgRef.current))) }} />
      </div>

      {selection && <Inspector selection={selection} onClose={() => setSelection(null)} />}
    </div>
  )
}

function unitRatioSafe(svg: SVGSVGElement | null) {
  if (!svg) return VB_W / 900
  const rect = svg.getBoundingClientRect()
  if (!rect.width) return VB_W / 900
  return Math.min(VB_W / rect.width, VB_H / rect.height)
}
