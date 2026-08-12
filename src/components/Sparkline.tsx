import { useMemo } from 'react'
import { useMeasure } from './useMeasure'
import { slotWash } from './colors'
import { scaleMax, smooth, type PointNullable, type Period } from '../lib/stats'
import type { ISODate } from '../lib/dates'
import type { Symptom } from '../lib/types'

interface Props {
  symptom: Symptom
  points: PointNullable[]
  dates: ISODate[]
  periods: Period[]
  height?: number
}

/** Compact trend for the small-multiples grid. Same encoding as the big chart. */
export default function Sparkline({ symptom, points, dates, periods, height = 46 }: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const trend = useMemo(() => smooth(points, 7), [points])

  const observedMax = points.reduce((m, p) => (p.value !== null && p.value > m ? p.value : m), 0)
  const yMax = scaleMax(symptom.scale, observedMax)
  const w = Math.max(width, 80)
  const pad = 3

  const x = (i: number) =>
    dates.length <= 1 ? w / 2 : (i / (dates.length - 1)) * w
  const y = (v: number) => pad + (height - pad * 2) - (v / yMax) * (height - pad * 2)

  const indexOf = useMemo(() => {
    const m = new Map<string, number>()
    dates.forEach((d, i) => m.set(d, i))
    return m
  }, [dates])

  let d = ''
  let open = false
  trend.forEach((p, i) => {
    if (p.value === null) {
      open = false
      return
    }
    d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
    open = true
  })

  return (
    <div ref={ref} style={{ width: '100%' }}>
      <svg className="chart" width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden>
        {periods.map((p) => {
          const i0 = indexOf.get(p.start < dates[0] ? dates[0] : p.start)
          const last = dates[dates.length - 1]
          const i1 = indexOf.get(p.end > last ? last : p.end)
          if (i0 === undefined || i1 === undefined || i1 < i0) return null
          return (
            <rect
              key={p.id}
              x={x(i0) + 0.5}
              y={0}
              width={Math.max(x(i1) - x(i0) - 1, 1)}
              height={height}
              fill={slotWash(p.slot, p.slot === 0 ? 6 : 11)}
            />
          )
        })}
        <line className="gridline" x1={0} x2={w} y1={y(0)} y2={y(0)} />
        {d && (
          <path
            d={d}
            fill="none"
            stroke="var(--ramp-450)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}
