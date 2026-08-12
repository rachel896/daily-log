import type { ReactNode } from 'react'

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'good' | 'bad'
}) {
  const color =
    tone === 'good' ? 'var(--delta-good)' : tone === 'bad' ? 'var(--critical)' : undefined
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>
        {value}
      </div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T | null
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`seg ${className ?? ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-v={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  on,
  children,
  onClick,
}: {
  on: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="tiny muted">{hint}</span>}
    </div>
  )
}

export function Card({
  title,
  action,
  children,
  subtitle,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card">
      {(title || action) && (
        <header>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="small muted" style={{ marginTop: 2 }}>{subtitle}</p>}
          </div>
          <span className="spacer" />
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Banner({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: 'info' | 'error'
}) {
  return <div className={`banner ${kind === 'error' ? 'error' : ''}`}>{children}</div>
}

export function Delta({ value, worse }: { value: number; worse: boolean | null }) {
  const cls = worse === null ? 'flat' : worse ? 'up' : 'down'
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`pill ${cls}`}>
      {worse === null ? '' : worse ? '▲' : '▼'} {sign}
      {Math.round(value * 10) / 10}
    </span>
  )
}
