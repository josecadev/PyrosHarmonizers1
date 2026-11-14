'use client'

import { useMemo, useRef, useState } from 'react'
import { Columns2, Expand, Layers, Maximize2, Minus, Plus, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmt, severity, type CalendarDay, type Filters, type Mode, type Region } from '@/lib/pyros/data'
import {
  MAP_H_KM,
  MAP_W_KM,
  PX_PER_KM,
  type Detection,
  type FireEvent,
  type HexCell,
  type Scene,
  type StaticAnomaly,
} from '@/lib/pyros/scene'
import { Inspector } from './inspector'

const VB_W = MAP_W_KM * PX_PER_KM
const VB_H = MAP_H_KM * PX_PER_KM
const GRAT_STEP = 0.025

export type Selection =
  | { kind: 'det'; item: Detection }
  | { kind: 'event'; item: FireEvent }
  | { kind: 'hex'; item: HexCell }
  | { kind: 'static'; item: StaticAnomaly }

interface Props {
  mode: Mode
  scene: Scene
  region: Region
  day: CalendarDay
  year: number
  filters: Filters
  splitScreen: boolean
  onSplitScreenChange: (v: boolean) => void
}

type LayerKey = 'modis' | 'viirs' | 'hull' | 'hex' | 'static' | 'graticule'

const LAYER_LABELS: { key: LayerKey; label: string; swatch: string }[] = [
  { key: 'modis', label: 'Píxel MODIS 1 km', swatch: 'border border-modis' },
  { key: 'viirs', label: 'Píxel VIIRS 375 m', swatch: 'bg-viirs' },
  { key: 'hull', label: 'Envolvente ST-DBSCAN', swatch: 'border border-harmonized bg-harmonized/30' },
  { key: 'hex', label: 'Grilla Uber H3', swatch: 'bg-heat-3' },
  { key: 'static', label: 'Anomalías Estáticas (Gas/Ind.)', swatch: 'border border-amber-400 bg-amber-400/30' },
  { key: 'graticule', label: 'Retícula WGS84', swatch: 'border border-muted-foreground' },
]

const HEX_FILLS = ['var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']

function hexFill(density: number) {
  if (density < 20) return HEX_FILLS[0]
  if (density < 50) return HEX_FILLS[1]
  if (density < 100) return HEX_FILLS[2]
  return HEX_FILLS[3]
}

export function MapViewer({ mode, scene, region, day, filters, splitScreen, onSplitScreenChange }: Props) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [splitPct, setSplitPct] = useState(50)
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    modis: true,
    viirs: true,
    hull: true,
    hex: true,
    static: true,
    graticule: true,
  })
  const [layersOpen, setLayersOpen] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hovered, setHovered] = useState<{ item: Selection; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
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

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
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
  const handleHover = (s: Selection) => (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setHovered({ item: s, x: e.clientX - rect.left, y: e.clientY - rect.top })
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
    (kind === 'hex'
      ? (selection.item as HexCell).h3 === id
      : kind === 'det'
        ? (selection.item as Detection).id === id
        : kind === 'static'
          ? (selection.item as StaticAnomaly).id === id
          : (selection.item as FireEvent).id === id)

  const isHoveredHex = (h3: string) => hovered?.item.kind === 'hex' && hovered.item.item.h3 === h3
  const splitX = (splitPct / 100) * VB_W

  return (
    <div ref={containerRef} className="relative flex h-full w-full flex-1 overflow-hidden bg-canvas">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none"
        style={{ cursor: drag.current?.moved ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          drag.current = null
          setHovered(null)
        }}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
        role="application"
        aria-label={`Visor de huella de píxel para ${region.name}, ${day.iso}`}
      >
        <defs>
          <clipPath id="split-left">
            <rect x={0} y={0} width={splitX} height={VB_H} />
          </clipPath>
          <clipPath id="split-right">
            <rect x={splitX} y={0} width={VB_W - splitX} height={VB_H} />
          </clipPath>
        </defs>

        <rect width={VB_W} height={VB_H} fill="var(--canvas)" onClick={() => setSelection(null)} />

        {/* Graticule shared across full viewport */}
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
        </g>

        {!splitScreen ? (
          /* STANDARD SINGLE-VIEW RENDER */
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <g transform={`scale(${PX_PER_KM})`}>
              {/* H3 Hexagonal Layer */}
              <g style={{ opacity: op.hex, transition: 'opacity 400ms ease' }} pointerEvents={op.hex ? 'auto' : 'none'}>
                {scene.hexGrid.map((h) => {
                  const hoveredHex = isHoveredHex(h.h3)
                  const selectedHex = isSelected('hex', h.h3)
                  return (
                    <polygon
                      key={h.h3}
                      points={h.points.map((p) => p.join(',')).join(' ')}
                      fill={h.count ? hexFill(h.density) : 'transparent'}
                      fillOpacity={h.count ? 0.85 : 0}
                      stroke={hoveredHex ? '#00e5ff' : h.count ? 'var(--harmonized)' : 'var(--border)'}
                      strokeOpacity={h.count ? (hoveredHex || selectedHex ? 1 : 0.55) : 0.7}
                      strokeWidth={hoveredHex || selectedHex ? 2.2 : 1}
                      vectorEffect="non-scaling-stroke"
                      className={h.count ? 'cursor-pointer' : undefined}
                      onMouseEnter={h.count ? handleHover({ kind: 'hex', item: h }) : undefined}
                      onMouseMove={h.count ? handleHover({ kind: 'hex', item: h }) : undefined}
                      onMouseLeave={() => setHovered(null)}
                      onClick={h.count ? select({ kind: 'hex', item: h }) : undefined}
                    />
                  )
                })}
              </g>

              {/* Raw MODIS Layer */}
              <g style={{ opacity: op.modis, transition: 'opacity 400ms ease' }} pointerEvents={op.modis ? 'auto' : 'none'}>
                {modisDet.map((d) => (
                  <rect
                    key={d.id}
                    x={d.x - d.scan / 2}
                    y={d.y - d.track / 2}
                    width={d.scan}
                    height={d.track}
                    fill="var(--modis)"
                    fillOpacity={isSelected('det', d.id) ? 0.35 : 0.08}
                    stroke="var(--modis)"
                    strokeWidth={isSelected('det', d.id) ? 2.5 : 1.25}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onMouseEnter={handleHover({ kind: 'det', item: d })}
                    onMouseMove={handleHover({ kind: 'det', item: d })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={select({ kind: 'det', item: d })}
                  />
                ))}
              </g>

              {/* Raw VIIRS Layer */}
              <g style={{ opacity: op.viirs, transition: 'opacity 400ms ease' }} pointerEvents={op.viirs ? 'auto' : 'none'}>
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
                    onMouseEnter={handleHover({ kind: 'det', item: d })}
                    onMouseMove={handleHover({ kind: 'det', item: d })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={select({ kind: 'det', item: d })}
                  />
                ))}
              </g>

              {/* ST-DBSCAN ConvexHull Layer */}
              <g style={{ opacity: op.hull, transition: 'opacity 500ms ease' }} pointerEvents={op.hull ? 'auto' : 'none'}>
                {scene.events.map((e) => {
                  const selEvent = isSelected('event', e.id)
                  return (
                    <g key={e.id}>
                      <polygon
                        points={e.hull.map((p) => p.join(',')).join(' ')}
                        fill="var(--harmonized)"
                        fillOpacity={selEvent ? 0.38 : 0.2}
                        stroke={selEvent ? '#00e5ff' : 'var(--harmonized)'}
                        strokeWidth={selEvent ? 2.5 : 1.6}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="cursor-pointer"
                        onMouseEnter={handleHover({ kind: 'event', item: e })}
                        onMouseMove={handleHover({ kind: 'event', item: e })}
                        onMouseLeave={() => setHovered(null)}
                        onClick={select({ kind: 'event', item: e })}
                      />
                      <circle cx={e.centroid[0]} cy={e.centroid[1]} r={0.06} fill="var(--foreground)" pointerEvents="none" />
                      {/* Highlight member centroids when this cluster is selected (US-07) */}
                      {selEvent &&
                        e.members.map((m) => (
                          <circle
                            key={`mem-${m.id}`}
                            cx={m.x}
                            cy={m.y}
                            r={m.sensor === 'MODIS' ? 0.09 : 0.055}
                            fill={m.sensor === 'MODIS' ? 'var(--modis)' : 'var(--viirs)'}
                            stroke="#ffffff"
                            strokeWidth={1}
                            vectorEffect="non-scaling-stroke"
                            className="cursor-pointer"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              setSelection({ kind: 'det', item: m })
                            }}
                          />
                        ))}
                    </g>
                  )
                })}
              </g>

              {/* Static Thermal Anomalies Layer (FR-005 / ESC-FIL-003) */}
              {layers.static && (
                <g>
                  {scene.staticAnomalies.map((sa) => (
                    <g
                      key={sa.id}
                      transform={`translate(${sa.x} ${sa.y})`}
                      className="cursor-pointer"
                      onMouseEnter={handleHover({ kind: 'static', item: sa })}
                      onMouseMove={handleHover({ kind: 'static', item: sa })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={select({ kind: 'static', item: sa })}
                    >
                      <circle
                        r={0.28}
                        fill={sa.masked ? 'transparent' : 'rgba(245, 158, 11, 0.25)'}
                        stroke="#f59e0b"
                        strokeDasharray={sa.masked ? '3 2' : undefined}
                        strokeWidth={isSelected('static', sa.id) ? 2.2 : 1.3}
                        vectorEffect="non-scaling-stroke"
                      />
                      <polygon
                        points="0,-0.14 0.14,0 0,0.14 -0.14,0"
                        fill="#f59e0b"
                        fillOpacity={sa.masked ? 0.55 : 0.95}
                      />
                    </g>
                  ))}
                </g>
              )}
            </g>
          </g>
        ) : (
          /* SPLIT-SCREEN / SWIPE COMPARATOR MODE (Ticket #3.4 / FR-019 / ESC-MAP-001) */
          <>
            {/* LEFT PANEL: RAW DISJOINT DATA (MODIS + VIIRS) */}
            <g clipPath="url(#split-left)">
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                <g transform={`scale(${PX_PER_KM})`}>
                  {modisDet.map((d) => (
                    <rect
                      key={`L-${d.id}`}
                      x={d.x - d.scan / 2}
                      y={d.y - d.track / 2}
                      width={d.scan}
                      height={d.track}
                      fill="var(--modis)"
                      fillOpacity={0.12}
                      stroke="var(--modis)"
                      strokeWidth={1.3}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onMouseEnter={handleHover({ kind: 'det', item: d })}
                      onClick={select({ kind: 'det', item: d })}
                    />
                  ))}
                  {viirsDet.map((d) => (
                    <rect
                      key={`L-${d.id}`}
                      x={d.x - d.scan / 2}
                      y={d.y - d.track / 2}
                      width={d.scan}
                      height={d.track}
                      fill="var(--viirs)"
                      fillOpacity={0.55}
                      stroke="var(--viirs)"
                      strokeWidth={0.85}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onMouseEnter={handleHover({ kind: 'det', item: d })}
                      onClick={select({ kind: 'det', item: d })}
                    />
                  ))}
                </g>
              </g>
            </g>

            {/* RIGHT PANEL: HARMONIZED PYROSHARMONIZER (ST-DBSCAN + H3) */}
            <g clipPath="url(#split-right)">
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                <g transform={`scale(${PX_PER_KM})`}>
                  {mode === 'h3' ? (
                    scene.hexGrid.map((h) => (
                      <polygon
                        key={`R-${h.h3}`}
                        points={h.points.map((p) => p.join(',')).join(' ')}
                        fill={h.count ? hexFill(h.density) : 'transparent'}
                        fillOpacity={h.count ? 0.85 : 0}
                        stroke={isHoveredHex(h.h3) ? '#00e5ff' : h.count ? 'var(--harmonized)' : 'var(--border)'}
                        strokeOpacity={h.count ? 0.9 : 0.5}
                        strokeWidth={isHoveredHex(h.h3) ? 2.2 : 1.1}
                        vectorEffect="non-scaling-stroke"
                        className={h.count ? 'cursor-pointer' : undefined}
                        onMouseEnter={h.count ? handleHover({ kind: 'hex', item: h }) : undefined}
                        onClick={h.count ? select({ kind: 'hex', item: h }) : undefined}
                      />
                    ))
                  ) : (
                    <>
                      {modisDet.map((d) => (
                        <rect
                          key={`R-bg-${d.id}`}
                          x={d.x - d.scan / 2}
                          y={d.y - d.track / 2}
                          width={d.scan}
                          height={d.track}
                          fill="none"
                          stroke="var(--modis)"
                          strokeOpacity={0.22}
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                      {scene.events.map((e) => (
                        <g key={`R-ev-${e.id}`}>
                          <polygon
                            points={e.hull.map((p) => p.join(',')).join(' ')}
                            fill="var(--harmonized)"
                            fillOpacity={0.28}
                            stroke="var(--harmonized)"
                            strokeWidth={2}
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            className="cursor-pointer"
                            onMouseEnter={handleHover({ kind: 'event', item: e })}
                            onClick={select({ kind: 'event', item: e })}
                          />
                          <circle cx={e.centroid[0]} cy={e.centroid[1]} r={0.065} fill="var(--foreground)" pointerEvents="none" />
                        </g>
                      ))}
                    </>
                  )}
                </g>
              </g>
            </g>

            {/* Vertical Divider Line in SVG */}
            <line
              x1={splitX}
              x2={splitX}
              y1={0}
              y2={VB_H}
              stroke="#00e5ff"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

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

      {/* Split-Screen Interactive Slider Overlay & Badges */}
      {splitScreen && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-between px-3">
            <div className="rounded-md border border-viirs/50 bg-card/95 px-2.5 py-1.5 font-mono text-[11px] shadow-lg backdrop-blur-md">
              <span className="font-semibold text-viirs">ANTES (CRUDO):</span>{' '}
              <span>{scene.detections.length} focos</span>{' '}
              <span className="text-muted-foreground">({modisDet.length} M + {viirsDet.length} V)</span>
            </div>
            <div className="rounded-md border border-harmonized/50 bg-card/95 px-2.5 py-1.5 font-mono text-[11px] shadow-lg backdrop-blur-md">
              <span className="font-semibold text-harmonized">DESPUÉS (ARMONIZADO):</span>{' '}
              <span>
                {mode === 'h3' ? `${scene.activeHexes.length} celdas H3` : `${scene.events.length} incendios reales`}
              </span>
            </div>
          </div>

          <div className="pointer-events-auto absolute inset-x-8 bottom-14 z-10 flex items-center gap-3 rounded-md border border-border bg-card/95 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span className="font-mono text-[10px] text-viirs">◀ Crudo</span>
            <input
              type="range"
              min={5}
              max={95}
              value={splitPct}
              onChange={(e) => setSplitPct(Number(e.target.value))}
              aria-label="Control deslizante de comparación Split-Screen"
              className="h-1.5 flex-1 cursor-ew-resize accent-cyan-400"
            />
            <span className="font-mono text-[10px] text-harmonized">Armonizado ▶</span>
            <span className="font-mono text-[10px] text-muted-foreground">{splitPct}%</span>
          </div>
        </>
      )}

      {/* Hover Tooltip (#deckgl-tooltip per ESC-MAP-002) */}
      {hovered && !drag.current?.moved && (
        <div
          id="deckgl-tooltip"
          role="tooltip"
          style={{
            left: Math.min(hovered.x + 14, (containerRef.current?.clientWidth ?? 600) - 230),
            top: Math.max(12, hovered.y - 10),
          }}
          className="pointer-events-none absolute z-30 w-56 rounded-md border border-cyan-400/50 bg-card/95 p-2.5 font-mono text-[10.5px] shadow-2xl backdrop-blur-md"
        >
          {hovered.item.kind === 'hex' && (
            <>
              <p className="font-semibold text-cyan-400">H3 {hovered.item.item.h3}</p>
              <p className="mt-0.5 text-foreground">HFII: {hovered.item.item.frp.toFixed(1)} MW</p>
              <p className="text-muted-foreground">
                MODIS: {hovered.item.item.modisCount} · VIIRS: {hovered.item.item.viirsCount}
              </p>
              <p className="text-muted-foreground">
                Densidad: {hovered.item.item.density.toFixed(1)} MW/km² (Res {hovered.item.item.resolution})
              </p>
            </>
          )}
          {hovered.item.kind === 'event' && (
            <>
              <p className="font-semibold text-harmonized">{hovered.item.item.eventCode}</p>
              <p className="mt-0.5 text-foreground">HFII: {hovered.item.item.frpCal.toFixed(1)} MW</p>
              <p className="text-muted-foreground">
                MODIS: {hovered.item.item.modis} · VIIRS: {hovered.item.item.viirs}
              </p>
              <p className="text-muted-foreground">
                Área: {(hovered.item.item.areaKm2 * 100).toFixed(1)} ha · Δt {hovered.item.item.deltaT.toFixed(1)} h
              </p>
            </>
          )}
          {hovered.item.kind === 'det' && (
            <>
              <p className={cn('font-semibold', hovered.item.item.sensor === 'MODIS' ? 'text-modis' : 'text-viirs')}>
                {hovered.item.item.id} ({hovered.item.item.satellite})
              </p>
              <p className="mt-0.5 text-foreground">FRP: {hovered.item.item.frp.toFixed(1)} MW</p>
              <p className="text-muted-foreground">
                Huella: {hovered.item.item.scan.toFixed(2)}×{hovered.item.item.track.toFixed(2)} km
              </p>
              <p className="text-muted-foreground">Confianza: {hovered.item.item.confidence}</p>
            </>
          )}
          {hovered.item.kind === 'static' && (
            <>
              <p className="font-semibold text-amber-400">{hovered.item.item.id}</p>
              <p className="mt-0.5 text-foreground">{hovered.item.item.name}</p>
              <p className="text-muted-foreground">
                Persistencia: {hovered.item.item.activeDays}d · Radio ±{hovered.item.item.radiusM}m
              </p>
              <p className="text-amber-400/90">
                {hovered.item.item.masked ? 'STATIC_ANOMALY_MASKED' : 'Sin enmascarar'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Top-Left Status Overlay */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
        <div className="pointer-events-auto rounded-md border border-border bg-card/90 px-3 py-2 backdrop-blur-md">
          <p className="font-mono text-[11px] text-muted-foreground">
            {day.iso} UTC · DOY {String(day.doy).padStart(3, '0')} · {region.category}
          </p>
          <p className="mt-0.5 flex items-center gap-3 text-xs">
            <span>
              HFII <span className="font-mono font-semibold">{day.hfii}</span>{' '}
              <span className="text-muted-foreground">
                ({severity(day.hfii)} · Z={day.zScore >= 0 ? `+${day.zScore}` : day.zScore}σ)
              </span>
            </span>
          </p>
          <p className="mt-1 flex flex-wrap gap-3 font-mono text-[11px]">
            <span className="text-modis">{modisDet.length} MODIS</span>
            <span className="text-viirs">{viirsDet.length} VIIRS</span>
            <span className="text-harmonized">
              {mode === 'h3' ? `${scene.activeHexes.length} celdas H3 (res.${filters.h3Res})` : `${scene.events.length} eventos`}
            </span>
            {filters.staticMask && (
              <span className="flex items-center gap-1 text-amber-400" title="Anomalías térmicas industriales excluidas">
                <ShieldAlert className="size-3" aria-hidden />
                {scene.staticAnomalies.length} enmascaradas
              </span>
            )}
          </p>
        </div>
        {scene.detections.length === 0 && (
          <p className="pointer-events-auto rounded-md border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
            Sin detecciones para este día y filtros. Selecciona un día de julio–octubre en el calendario.
          </p>
        )}
      </div>

      {/* Bottom-Left Zoom + Fullscreen Controls */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card/90 backdrop-blur-md">
          <button type="button" onClick={() => zoomBy(1.4)} className="p-2 hover:bg-accent focus-visible:outline-2" aria-label="Acercar">
            <Plus className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.4)}
            className="border-t border-border p-2 hover:bg-accent focus-visible:outline-2"
            aria-label="Alejar"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={reset} className="border-t border-border p-2 hover:bg-accent focus-visible:outline-2" aria-label="Restablecer vista">
            <Maximize2 className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="border-t border-border p-2 hover:bg-accent focus-visible:outline-2"
            aria-label="Pantalla completa para demo"
            title="Pantalla completa (Video 30s)"
          >
            <Expand className="size-4" aria-hidden />
          </button>
        </div>
        <span className="rounded border border-border bg-card/90 px-1.5 py-0.5 text-center font-mono text-[10px] text-muted-foreground">
          {fmt(zoom, 1)}x
        </span>
      </div>

      {/* Bottom Toolbar: Layers + Split-Screen Toggle */}
      <div className="absolute bottom-3 left-16 flex items-center gap-2">
        <div className="relative">
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
            <fieldset className="absolute bottom-full left-0 z-20 mb-2 flex w-64 flex-col gap-1 rounded-md border border-border bg-card p-2 shadow-xl">
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

        <button
          id="btn-split-screen"
          type="button"
          aria-pressed={splitScreen}
          onClick={() => onSplitScreenChange(!splitScreen)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium backdrop-blur-md transition-colors focus-visible:outline-2',
            splitScreen
              ? 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300'
              : 'border-border bg-card/90 text-foreground hover:bg-accent',
          )}
        >
          <Columns2 className="size-3.5" aria-hidden />
          {splitScreen ? 'Split-Screen Activo' : 'Comparar (Split-Screen)'}
        </button>
      </div>

      {/* Top-Right Legend */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card/90 px-3 py-1.5 text-[11px] backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-modis" aria-hidden />
          MODIS 1 km
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-viirs/70" aria-hidden />
          VIIRS 375 m
        </span>
        <span className={cn('flex items-center gap-1.5 transition-opacity', mode === 'raw' && !splitScreen && 'opacity-40')}>
          <span className="size-2.5 rounded-sm border border-harmonized bg-harmonized/30" aria-hidden />
          {mode === 'h3' ? `H3 Res ${filters.h3Res}` : 'Armonizado'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-amber-400" aria-hidden />
          Gas/Ind.
        </span>
      </div>

      {selection && (
        <Inspector
          selection={selection}
          onSelect={(s) => setSelection(s)}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  )
}
