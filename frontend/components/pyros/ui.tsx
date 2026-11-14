import { cn } from '@/lib/utils'

export function CornerMarks() {
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((p) => (
        <span key={p} aria-hidden className={`corner-mark corner-${p}`} />
      ))}
    </>
  )
}

export function Frame({
  children,
  className,
  marks = true,
  as: Tag = 'section',
  ...rest
}: {
  children: React.ReactNode
  className?: string
  marks?: boolean
  as?: 'section' | 'article' | 'div' | 'aside'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn('relative border border-border bg-card', className)} {...rest}>
      {marks && <CornerMarks />}
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('eyebrow', className)}>{children}</span>
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
}: {
  value: T
  options: { id: T; label: string; title?: string }[]
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center rounded-[3px] border border-border bg-background">
      {options.map((o, i) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              'font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2',
              i > 0 && 'border-l border-border',
              size === 'md' ? 'px-3 py-1.5 text-[13px]' : 'px-2.5 py-1 text-xs',
              active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export const chartAxis = { fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-geist-mono)' }
export const chartTooltip = {
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 2,
  fontSize: 11,
  fontFamily: 'var(--font-geist-mono)',
  color: 'var(--foreground)',
}
