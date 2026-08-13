import type { CSSProperties, ReactNode } from 'react'
import type { Category } from '../lib/types'

/**
 * One line-drawn set at a single weight, so the circular badges read as a
 * family rather than a pile of borrowed glyphs.
 */

const PATHS: Record<string, ReactNode> = {
  // ---- navigation ----
  log: <path d="M4 6h16M4 12h16M4 18h10" />,
  trends: <path d="M4 17l5-6 4 4 7-8" />,
  compare: (
    <>
      <path d="M5 8h14M5 16h14" />
      <path d="M9 5v6M15 13v6" />
    </>
  ),
  meds: (
    <>
      <rect x="3.2" y="8.4" width="17.6" height="7.2" rx="3.6" />
      <path d="M12 8.6v6.8" />
    </>
  ),
  report: (
    <>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M9 12.5h6M9 16h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4L6 18M18 18l-1.6-1.6M7.6 7.6L6 6" />
    </>
  ),

  // ---- symptom groups ----
  joints: (
    <>
      <circle cx="7" cy="7" r="2.6" />
      <circle cx="17" cy="17" r="2.6" />
      <path d="M9 9l6 6" />
    </>
  ),
  flame: <path d="M12 3.5c3 3.2 5 5.4 5 8.4a5 5 0 01-10 0c0-1.7.8-3 2-4.3.3 1.3 1 2 2 2.2-.4-2.3.2-4.4 1-6.3z" />,
  body: <path d="M3.5 12h3.6l2-5 3 12 2.6-9 1.6 2h4.2" />,
  spark: (
    <>
      <path d="M12 3.2l1.7 4.6 4.6 1.7-4.6 1.7L12 15.8l-1.7-4.6L5.7 9.5l4.6-1.7z" />
      <path d="M18 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </>
  ),
  droplet: <path d="M12 3.6c3 3.6 5.2 6.1 5.2 8.8a5.2 5.2 0 11-10.4 0c0-2.7 2.2-5.2 5.2-8.8z" />,
  heart: <path d="M12 20s-7.2-4.4-7.2-9.3A4.1 4.1 0 0112 8.3a4.1 4.1 0 017.2 2.4C19.2 15.6 12 20 12 20z" />,

  // ---- ui ----
  check: <path d="M4.8 12.4l4.6 4.6L19.2 7.2" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M9.5 5.5l7 6.5-7 6.5" />,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  minus: <path d="M5.5 12h13" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11v5.4M12 7.9v.1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.2l8.4 15.1H3.6z" />
      <path d="M12 10v4.2M12 17v.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="3" />
      <path d="M3.6 10h16.8M8.4 3.6v3.2M15.6 3.6v3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.3V12l3.2 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.6l6.8 2.6v5c0 4.2-2.8 7.4-6.8 9.2-4-1.8-6.8-5-6.8-9.2v-5z" />
      <path d="M9.4 12.2l1.9 1.9 3.5-3.6" />
    </>
  ),
  download: <path d="M12 4.4v10.4M7.8 10.8L12 15l4.2-4.2M4.6 19.4h14.8" />,
  printer: (
    <>
      <path d="M7 9.2V4h10v5.2" />
      <rect x="3.6" y="9.2" width="16.8" height="7.2" rx="2.4" />
      <path d="M7 13.6h10V20H7z" />
    </>
  ),
  note: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8.4 9.6h7.2M8.4 13.2h7.2M8.4 16.4h4" />
    </>
  ),
  people: (
    <>
      <circle cx="9.2" cy="8.6" r="3.1" />
      <path d="M3.8 19.4c0-3 2.4-5 5.4-5s5.4 2 5.4 5" />
      <path d="M16 6.2a3 3 0 010 5.4M17.4 14.9c1.8.6 3 2.2 3 4.5" />
    </>
  ),
}

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  className,
  style,
}: {
  name: IconName
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

/** Circular soft badge, the motif that ties the screens together. */
export function Badge({
  name,
  size,
}: {
  name: IconName
  size?: 'sm' | 'lg'
}) {
  return (
    <span className={`badge${size ? ` ${size}` : ''}`}>
      <Icon name={name} />
    </span>
  )
}

export const CATEGORY_ICON: Record<Category, IconName> = {
  musculoskeletal: 'joints',
  vasomotor: 'flame',
  genitourinary: 'droplet',
  neuro: 'spark',
  systemic: 'body',
  emotional: 'heart',
}
