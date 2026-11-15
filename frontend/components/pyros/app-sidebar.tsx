'use client'

import Link from 'next/link'
import { CalendarDays, Columns2, Database, FlaskConical, Flame, Home, Map as MapIcon, PanelLeftClose, PanelLeftOpen, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UI_DICT, type Locale } from '@/lib/pyros/i18n-rbac'

export type View = 'map' | 'calendar' | 'lab' | 'data'

export const VIEWS: { id: View; index: string; route: string; label: string; hint: string; icon: typeof MapIcon }[] = [
  { id: 'map', index: '01', route: '/map', label: 'Visor Espacial', hint: 'Huella de píxel y Split-Screen', icon: MapIcon },
  { id: 'calendar', index: '02', route: '/calendar', label: 'Calendario de Quemas', hint: 'HFII diario y Matriz 2000–2026', icon: CalendarDays },
  { id: 'lab', index: '03', route: '/lab', label: 'Laboratorio', hint: 'Armonización y Test de Chow', icon: FlaskConical },
  { id: 'data', index: '04', route: '/export', label: 'Explorador de Datos', hint: 'Registros FIRMS y exportación', icon: Database },
]

export function AppSidebar({
  view,
  onViewChange,
  collapsed,
  onToggle,
  locale = 'es',
  splitScreen = false,
  onOpenCompare,
}: {
  view: View
  onViewChange: (v: View) => void
  collapsed: boolean
  onToggle: () => void
  locale?: Locale
  splitScreen?: boolean
  onOpenCompare?: () => void
}) {
  const dict = UI_DICT[locale]

  return (
    <aside
      aria-label="Módulos"
      className={cn(
        'flex w-14 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-slate-950/95 transition-[width] duration-300 z-30 select-none',
        !collapsed && 'md:w-64',
      )}
    >
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800/80 px-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
            <Flame className="size-4.5 text-slate-950" aria-hidden />
          </div>
          <div className={cn('hidden min-w-0 flex-col leading-tight', !collapsed && 'md:flex')}>
            <span className="truncate text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              Pyros<span className="text-amber-400">Harmonizer</span>
            </span>
            <span className="truncate font-mono text-[10px] text-slate-400">NASA Reto #8 · C6.1 / 375 m</span>
          </div>
        </div>

        {/* Section Label */}
        <div className={cn('hidden items-center justify-between px-4 pt-3 pb-1', !collapsed && 'md:flex')}>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Módulos de Análisis
          </span>
          <span className="text-[9px] font-mono bg-cyan-950/70 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
            v2.4
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 p-2">
          {VIEWS.map((v) => {
            const active = v.id === view && !(v.id === 'map' && splitScreen)
            const localized = dict.views[v.id]
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onViewChange(v.id)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? localized.label : undefined}
                className={cn(
                  'group relative flex w-full items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer font-mono',
                  active
                    ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800',
                )}
              >
                <v.icon
                  className={cn(
                    'size-4 mt-0.5 shrink-0 transition-colors',
                    active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200',
                  )}
                  aria-hidden
                />

                <div className={cn('hidden min-w-0 flex-1 flex-col', !collapsed && 'md:flex')}>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-semibold flex items-center gap-1.5', active ? 'text-cyan-100 font-bold' : 'text-slate-300 group-hover:text-white')}>
                      <span>{v.index}</span> {localized.label}
                    </span>
                    {active && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                        EN VIVO
                      </span>
                    )}
                  </div>
                  <p className={cn('text-[10px] font-sans truncate mt-0.5', active ? 'text-cyan-300/70' : 'text-slate-400')}>
                    {localized.hint}
                  </p>
                </div>
              </button>
            )
          })}

          {onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              title={collapsed ? dict.header.compareShortcut : undefined}
              className={cn(
                'group relative flex w-full items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer font-mono mt-1 border',
                view === 'map' && splitScreen
                  ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border-transparent hover:border-slate-800',
              )}
            >
              <Columns2
                className={cn(
                  'size-4 mt-0.5 shrink-0 transition-colors',
                  view === 'map' && splitScreen ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200',
                )}
                aria-hidden
              />

              <div className={cn('hidden min-w-0 flex-1 flex-col', !collapsed && 'md:flex')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                    05 Comparador
                  </span>
                  <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                    Efecto 2012
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans truncate mt-0.5">
                  /compare · Split-Screen
                </p>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Navigation & Meta Group */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2.5">
        {/* Inicio (Landing) & Portal / Login links */}
        <div className="flex flex-col gap-1.5">
          <Link
            href="/"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors text-xs font-mono',
              collapsed && 'justify-center px-1',
            )}
            title="Volver a la Portada (Inicio)"
          >
            <div className="flex items-center gap-2">
              <Home className="size-4 text-cyan-400 shrink-0" aria-hidden />
              {!collapsed && <span>Inicio (Landing)</span>}
            </div>
            {!collapsed && <span className="text-[10px] text-cyan-400">Web</span>}
          </Link>

          <Link
            href="/login"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs font-mono',
              collapsed && 'justify-center px-1',
            )}
            title="Salir al Portal de Acceso (Login)"
          >
            <div className="flex items-center gap-2">
              <UserCircle2 className="size-4 text-slate-400 shrink-0" aria-hidden />
              {!collapsed && <span>Portal / Login</span>}
            </div>
            {!collapsed && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
                Conectado
              </span>
            )}
          </Link>
        </div>

        {/* Hackathon & Version Badge */}
        {!collapsed && (
          <div className="px-2.5 py-1.5 bg-slate-900/40 rounded border border-slate-800/60 text-[10px] font-mono text-slate-400 leading-tight">
            <div className="text-slate-300 font-medium">NASA Space Apps 2026</div>
            <div className="text-[9px] text-slate-400">Santa Cruz, Bolivia</div>
          </div>
        )}

        {/* Collapse Sidebar Toggle Button */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir navegación' : 'Colapsar navegación'}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs font-mono transition-colors border border-transparent hover:border-slate-800 cursor-pointer"
        >
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
          {!collapsed && <span>Colapsar Menú</span>}
        </button>
      </div>
    </aside>
  )
}
