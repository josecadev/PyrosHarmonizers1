'use client'

import { useMemo, useRef, useState } from 'react'
import { Layers, Maximize2, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmt, severity, type CalendarDay, type Mode, type Region } from '@/lib/pyros/data'
import { MAP_H_KM, MAP_W_KM, PX_PER_KM, type Detection, type FireEvent, type HexCell, type Scene } from '@/lib/pyros/scene'
import { Inspector } from './inspector'

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
}

type LayerKey = 'modis' | 'viirs' | 'hull' | 'hex' | 'graticule'

const LAYER_LABELS: { key: LayerKey; label: string; swatch: string }[] = [
  { key: 'modis', label: 'Píxel MODIS 1 km', swatch: 'border border-modis' },
  { key: 'viirs', label: 'Píxel VIIRS 375 m', swatch: 'bg-viirs' },
  { key: 'hull', label: 'Envolvente ST-DBSCAN', swatch: 'border border-harmonized bg-harmonized/30' },
  { key: 'hex', label: 'Grilla H3 res. 8', swatch: 'bg-heat-3' },
  { key: 'graticule', label: 'Retícula WGS84', swatch: 'border border-muted-foreground' },
]

const HEX_FILLS = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']

function hexFill(density: number) {
  if (density < 20) return HEX_FILLS[0]
  if (density < 50) return HEX_FILLS[1]
  if (density < 100) return HEX_FILLS[2]
  return HEX_FILLS[3]
}

export function MapViewer({ mode, scene, region, day, year }: Props) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ modis: true, viirs: true, hull: true, hex: true, graticule: true })
  const [layersOpen, setLayersOpen] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
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
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      const k = unitRatio()
      setPan({ x: d.px + dx * k, y: d.py + dy * k })
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (d?.moved) {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
      return
    }
  }
  const select = (s: Selection) => () => {
    if (drag.current?.moved) return
    setSelection(s)
  }

  const modisDet = scene.detections.filter((d) => d.sensor === 'MODIS')
  const viirsDet = scene.detections.filter((d) => d.sensor === 'VIIRS')

  const op = {
    modis: !layers.modis ? 0 : mode === 'raw' ? 1 : mode === 'dbscan' ? 0.35 : 0.15,
    viirs: !layers.viirs ? 0 : mode === 'raw' ? 1 : mode === 'dbscan' ? 0.4 : 0.2,
    hull: layers.hull && mode === 'dbscan' ? 1 : 0,
    hex: layers.hex && mode === 'h3' ? 1 : 0,
  }

  const kmBar = zoom * PX_PER_KM > 140 ? 0.5 : 1
  const barLen = kmBar * PX_PER_KM * zoom
  const isSelected = (kind: Selection['kind'], id: string | number) =>
    selection?.kind === kind &&
    (kind === 'hex' ? (selection.item as HexCell).h3 === id : kind === 'det' ? (selection.item as Detection).id === id : (selection.item as FireEvent).id === id)

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        style={{ cursor: drag.current?.moved ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
        role="application"
        aria-label={`Visor de huella de píxel para ${region.name}, ${day.iso}`}
      >
        <rect width={VB_W} height={VB_H} fill="var(--canvas)" onClick={() => setSelection(null)} />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {layers.graticule && (
            <g aria-hidden>
              {graticule.lats.map((l) => (
                <line key={`la${l.v}`} x1={0} x2={VB_W} y1={l.y} y2={l.y} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {graticule.lons.map((l) => (
                <line key={`lo${l.v}`} y1={0} y2={VB_H} x1={l.x} x2={l.x} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
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
                  fillOpacity={h.count ? 0.85 : 0}
                  stroke={h.count ? 'var(--harmonized)' : 'var(--border)'}
                  strokeOpacity={h.count ? (isSelected('hex', h.h3) ? 1 : 0.55) : 0.7}
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
                  fillOpacity={0.07}
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
                  fillOpacity={isSelected('det', d.id) ? 0.9 : 0.45}
                  stroke="var(--viirs)"
                  strokeWidth={isSelected('det', d.id) ? 2 : 0.75}
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
                    fillOpacity={isSelected('event', e.id) ? 0.35 : 0.18}
                    stroke="var(--harmonized)"
                    strokeWidth={isSelected('event', e.id) ? 2.5 : 1.5}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onClick={select({ kind: 'event', item: e })}
                  />
                  <circle cx={e.centroid[0]} cy={e.centroid[1]} r={0.06} fill="var(--foreground)" pointerEvents="none" />
                </g>
              ))}
            </g>
          </g>
        </g>

        {layers.graticule && (
          <g aria-hidden className="font-mono" fontSize={10} fill="var(--muted-foreground)">
            {graticule.lats.map((l) => {
              const y = pan.y + l.y * zoom
              return y > 12 && y < VB_H - 30 ? (
                <text key={`tla${l.v}`} x={6} y={y - 3}>
                  {Math.abs(l.v).toFixed(3)}°S
                </text>
              ) : null
            })}
            {graticule.lons.map((l) => {
              const x = pan.x + l.x * zoom
              return x > 60 && x < VB_W - 40 ? (
                <text key={`tlo${l.v}`} x={x + 3} y={VB_H - 6}>
                  {Math.abs(l.v).toFixed(3)}°W
                </text>
              ) : null
            })}
          </g>
        )}

        <g transform={`translate(${VB_W - barLen - 24} ${VB_H - 34})`} aria-hidden>
          <rect x={-8} y={-16} width={barLen + 16} height={28} rx={3} fill="var(--card)" fillOpacity={0.9} stroke="var(--border)" />
          <line x1={0} x2={barLen} y1={4} y2={4} stroke="var(--foreground)" strokeWidth={1.5} />
          <line x1={0} x2={0} y1={0} y2={8} stroke="var(--foreground)" strokeWidth={1.5} />
          <line x1={barLen} x2={barLen} y1={0} y2={8} stroke="var(--foreground)" strokeWidth={1.5} />
          <text x={barLen / 2} y={-4} textAnchor="middle" fontSize={10} className="font-mono" fill="var(--foreground)">
            {kmBar === 1 ? '1 km' : '500 m'}
          </text>
        </g>
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur-md">
          <p className="font-mono text-[11px] text-muted-foreground">
            {day.iso} UTC · DOY {String(day.doy).padStart(3, '0')}
          </p>
          <p className="mt-0.5 flex items-center gap-3 text-xs">
            <span>
              HFII <span className="font-mono">{day.hfii}</span>{' '}
              <span className="text-muted-foreground">({severity(day.hfii)})</span>
            </span>
          </p>
          <p className="mt-1 flex gap-3 font-mono text-[11px]">
            <span className="text-modis">{modisDet.length} MODIS</span>
            <span className="text-viirs">{viirsDet.length} VIIRS</span>
            <span className="text-harmonized">
              {mode === 'h3' ? `${scene.activeHexes.length} celdas` : `${scene.events.length} eventos`}
            </span>
          </p>
        </div>
        {scene.detections.length === 0 && (
          <p className="pointer-events-auto rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
            Sin detecciones para este día y filtros. Selecciona un día de julio–octubre en el calendario.
          </p>
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card/90 backdrop-blur-md">
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
        <span className="rounded border border-border bg-card/90 px-1.5 py-0.5 text-center font-mono text-[10px] text-muted-foreground">
          {fmt(zoom, 1)}x
        </span>
      </div>

      <div className="absolute bottom-3 left-16">
        <button
          type="button"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs backdrop-blur-md hover:bg-accent focus-visible:outline-2"
        >
          <Layers className="size-3.5" aria-hidden />
          Capas
        </button>
        {layersOpen && (
          <fieldset className="absolute bottom-full left-0 mb-2 flex w-56 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-xl">
            <legend className="sr-only">Conmutador de capas</legend>
            {LAYER_LABELS.map((l) => (
              <label key={l.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent">
                <input
                  type="checkbox"
                  checked={layers[l.key]}
                  onChange={() => setLayers((s) => ({ ...s, [l.key]: !s[l.key] }))}
                  className="accent-harmonized"
                />
                <span className={cn('size-2.5 rounded-sm', l.swatch)} aria-hidden />
                {l.label}
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-3 rounded-md border border-border bg-card/90 px-3 py-1.5 text-[11px] backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-modis" aria-hidden />
          MODIS 1 km
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-viirs/70" aria-hidden />
          VIIRS 375 m
        </span>
        <span className={cn('flex items-center gap-1.5 transition-opacity', mode === 'raw' && 'opacity-40')}>
          <span className="size-2.5 rounded-sm border border-harmonized bg-harmonized/30" aria-hidden />
          {mode === 'h3' ? 'H3 FRP/km²' : 'Armonizado'}
        </span>
      </div>

      {selection && <Inspector selection={selection} onClose={() => setSelection(null)} />}
    </div>
  )
}
