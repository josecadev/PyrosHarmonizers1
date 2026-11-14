'use client'

import Link from 'next/link'
import { CalendarDays, Columns2, Database, FlaskConical, Flame, Map as MapIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UI_DICT, type Locale } from '@/lib/pyros/i18n-rbac'

export type View = 'map' | 'calendar' | 'lab' | 'data'

export const VIEWS: { id: View; index: string; route: string; label: string; hint: string; icon: typeof MapIcon }[] = [
  { id: 'map', index: '01', route: '/map', label: 'Visor Espacial', hint: 'Huella de píxel', icon: MapIcon },
  { id: 'calendar', index: '02', route: '/calendar', label: 'Calendario de Quemas', hint: 'HFII diario', icon: CalendarDays },
  { id: 'lab', index: '03', route: '/lab', label: 'Laboratorio', hint: 'Armonización', icon: FlaskConical },
  { id: 'data', index: '04', route: '/export', label: 'Explorador de Datos', hint: 'Registros y exportación', icon: Database },
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
    <nav
      aria-label="Módulos"
      className={cn(
        'flex w-14 shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300',
        !collapsed && 'md:w-60',
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Flame className="size-4 shrink-0 text-viirs" aria-hidden />
        <div className={cn('hidden min-w-0 flex-col leading-tight', !collapsed && 'md:flex')}>
          <span className="truncate text-sm font-medium tracking-tight">PyrosHarmonizer</span>
          <span className="truncate font-mono text-[10px] text-muted-foreground">FIRMS · C6.1 / 375 m</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col py-3">
        {VIEWS.map((v) => {
          const active = v.id === view && !(v.id === 'map' && splitScreen)
          const localized = dict.views[v.id]
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onViewChange(v.id)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? localized.label : undefined}
                className={cn(
                  'group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2',
                  active ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                {active && <span className="absolute inset-y-0 left-0 w-px bg-foreground" aria-hidden />}
                <v.icon className="size-4 shrink-0" aria-hidden />
                <span className={cn('hidden min-w-0 flex-1 flex-col', !collapsed && 'md:flex')}>
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{v.index}</span>
                    <span className="truncate text-[13px] tracking-tight">{localized.label}</span>
                  </span>
                  <span className="truncate pl-6 font-mono text-[10px] text-muted-foreground">{localized.hint}</span>
                </span>
                <span className="sr-only">{collapsed ? localized.label : ''}</span>
              </button>
            </li>
          )
        })}

        {onOpenCompare && (
          <li className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={onOpenCompare}
              title={collapsed ? dict.header.compareShortcut : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2',
                view === 'map' && splitScreen
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )}
            >
              {view === 'map' && splitScreen && <span className="absolute inset-y-0 left-0 w-px bg-cyan-400" aria-hidden />}
              <Columns2 className="size-4 shrink-0 text-cyan-400" aria-hidden />
              <span className={cn('hidden min-w-0 flex-1 flex-col', !collapsed && 'md:flex')}>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] tabular-nums text-cyan-400">05</span>
                  <span className="truncate text-[13px] tracking-tight">{dict.header.compareShortcut}</span>
                </span>
                <span className="truncate pl-6 font-mono text-[10px] text-muted-foreground">/compare · Split-Screen</span>
              </span>
            </button>
          </li>
        )}
      </ul>

      <div className="flex flex-col border-t border-border">
        <div className={cn('hidden flex-wrap gap-1.5 px-4 pt-3 font-mono text-[9px] text-muted-foreground', !collapsed && 'md:flex')}>
          <Link href="/map" className="underline-offset-2 hover:text-foreground hover:underline">
            /map
          </Link>
          <span>·</span>
          <Link href="/compare" className="underline-offset-2 hover:text-foreground hover:underline">
            /compare
          </Link>
          <span>·</span>
          <Link href="/calendar" className="underline-offset-2 hover:text-foreground hover:underline">
            /calendar
          </Link>
          <span>·</span>
          <Link href="/export" className="underline-offset-2 hover:text-foreground hover:underline">
            /export
          </Link>
        </div>
        <p className={cn('hidden px-4 py-2.5 font-mono text-[10px] leading-relaxed text-muted-foreground', !collapsed && 'md:block')}>
          NASA Space Apps 2026
          <br />
          Santa Cruz, Bolivia
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir navegación' : 'Colapsar navegación'}
          className="hidden h-11 items-center gap-3 border-t border-border px-4 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 md:flex"
        >
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <PanelLeftClose className="size-4" aria-hidden />}
          {!collapsed && <span className="eyebrow">{dict.header.collapse}</span>}
        </button>
      </div>
    </nav>
  )
}
