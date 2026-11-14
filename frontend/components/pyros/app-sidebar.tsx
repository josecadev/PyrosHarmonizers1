'use client'

import { CalendarDays, Database, FlaskConical, Flame, Map as MapIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export type View = 'map' | 'calendar' | 'lab' | 'data'

export const VIEWS: { id: View; index: string; label: string; hint: string; icon: typeof MapIcon }[] = [
  { id: 'map', index: '01', label: 'Visor Espacial', hint: 'Huella de píxel', icon: MapIcon },
  { id: 'calendar', index: '02', label: 'Calendario de Quemas', hint: 'HFII diario', icon: CalendarDays },
  { id: 'lab', index: '03', label: 'Laboratorio', hint: 'Armonización', icon: FlaskConical },
  { id: 'data', index: '04', label: 'Explorador de Datos', hint: 'Registros y exportación', icon: Database },
]

export function AppSidebar({
  view,
  onViewChange,
  collapsed,
  onToggle,
}: {
  view: View
  onViewChange: (v: View) => void
  collapsed: boolean
  onToggle: () => void
}) {
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
          const active = v.id === view
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onViewChange(v.id)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? v.label : undefined}
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
                    <span className="truncate text-[13px] tracking-tight">{v.label}</span>
                  </span>
                  <span className="truncate pl-6 font-mono text-[10px] text-muted-foreground">{v.hint}</span>
                </span>
                <span className="sr-only">{collapsed ? v.label : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col border-t border-border">
        <p className={cn('hidden px-4 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground', !collapsed && 'md:block')}>
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
          {!collapsed && <span className="eyebrow">Colapsar</span>}
        </button>
      </div>
    </nav>
  )
}
