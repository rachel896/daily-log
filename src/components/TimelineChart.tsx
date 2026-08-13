import { useMemo, useState } from 'react'
import { useMeasure } from './useMeasure'
import { slotColor, slotWash } from './colors'
import { shortDate, monthLabel, fromISO, type ISODate } from '../lib/dates'
import { formatValue, scaleMax, smooth, type PointNullable, type Period } from '../lib/stats'
import type { Symptom, TrackedEvent } from '../lib/types'

interface Props {
  symptom: Symptom
  points: PointNullable[]
  dates: ISODate[]
  periods: Period[]
  events: TrackedEvent[]
  height?: number
}

const M = { top: 40, right: 14, bottom: 26, left: 32 }
const BAND_RULE_Y = 6
const BAND_LABEL_Y = 24

/**
 * One symptom over time, with the medication periods painted underneath.
 * Raw days are dots and the trend is a rolling median, because a raw line on
 * daily 0-10 scores is all noise and the question here is the shape.
 */
export default function TimelineChart({
  symptom,
  points,
  dates,
  periods,
  events,
  height = 240,
}: Props) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const trend = useMemo(() => smooth(points, 7), [points])

  const observedMax = useMemo(
    () => points.reduce((m, p) => (p.value !== null && p.value > m ? p.value : m), 0),
    [points],
  )
  const yMax = scaleMax(symptom.scale, observedMax)

  const w = Math.max(width, 260)
  const innerW = w - M.left - M.right
  const innerH = height - M.top - M.bottom

  const x = (i: number) =>
    M.left + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW)
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH

  const indexOf = useMemo(() => {
    const m = new Map<string, number>()
    dates.forEach((d, i) => m.set(d, i))
    return m
  }, [dates])

  const yTicks = useMemo(() => {
    const step = yMax <= 10 ? 5 : yMax / 4
    const out: number[] = []
    for (let v = 0; v <= yMax + 0.001; v += step) out.push(Math.round(v * 10) / 10)
    return out
  }, [yMax])

  /**
   * Month starts, thinned by how much room there actually is. Counting ticks
   * is not enough: a window starting mid-May puts "May" and "Jun" 17 days
   * apart, which collides on a phone however few labels there are.
   */
  const xTicks = useMemo(() => {
    const MIN_GAP = 62
    const step = dates.length <= 1 ? innerW : innerW / (dates.length - 1)

    let candidates = dates
      .map((d, i) => ({ i, d }))
      .filter(({ d }) => fromISO(d).getDate() === 1)
      .map(({ i, d }) => ({ i, label: monthLabel(d) }))

    // Short windows may contain no month boundary at all.
    if (candidates.length < 2) {
      const wanted = Math.max(2, Math.min(5, Math.floor(innerW / 70)))
      candidates = Array.from({ length: wanted }, (_, k) => {
        const i = Math.round((k / (wanted - 1)) * (dates.length - 1))
        return { i, label: shortDate(dates[i]) }
      })
    }

    const out: { i: number; label: string }[] = []
    let lastX = -Infinity
    for (const c of candidates) {
      const px = c.i * step
      if (px - lastX >= MIN_GAP) {
        out.push(c)
        lastX = px
      }
    }
    return out
  }, [dates, innerW])

  const trendPath = useMemo(() => buildPath(trend, x, y), [trend, w, yMax, dates.length])

  const visibleEvents = useMemo(
    () => events.filter((e) => indexOf.has(e.occurred_on)),
    [events, indexOf],
  )

  const loggedCount = points.filter((p) => p.value !== null).length

  if (loggedCount === 0) {
    return (
      <div ref={ref}>
        <div className="empty">Nothing logged for {symptom.label.toLowerCase()} in this window yet.</div>
      </div>
    )
  }

  const hoverPoint = hover === null ? null : points[hover]
  const hoverTrend = hover === null ? null : trend[hover]
  const hoverPeriod =
    hover === null ? null : periods.find((p) => p.start <= dates[hover] && dates[hover] <= p.end)

  return (
    <div className="chart-wrap" ref={ref}>
      <svg
        className="chart"
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={`${symptom.label} over time`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(ev) => {
          const rect = (ev.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ev.clientX - rect.left
          const t = (px - M.left) / Math.max(innerW, 1)
          const i = Math.round(t * (dates.length - 1))
          setHover(i >= 0 && i < dates.length ? i : null)
        }}
      >
        {/* medication bands, inset 1px each side so neighbours never touch */}
        {periods.map((p) => {
          const i0 = indexOf.get(clampToRange(p.start, dates))
          const i1 = indexOf.get(clampToRange(p.end, dates))
          if (i0 === undefined || i1 === undefined || i1 < i0) return null
          const bx = x(i0) + 1
          const bw = Math.max(x(i1) - x(i0) - 2, 1)
          return (
            <g key={p.id}>
              <rect
                x={bx}
                y={M.top}
                width={bw}
                height={innerH}
                fill={slotWash(p.slot, p.slot === 0 ? 6 : 11)}
              />
              <rect x={bx} y={BAND_RULE_Y} width={bw} height={3} rx={1.5} fill={slotColor(p.slot)} />
              {bw > 62 && (
                <text
                  x={bx + 1}
                  y={BAND_LABEL_Y}
                  className="axis-label"
                  style={{ fontWeight: 600 }}
                  fill="var(--text-secondary)"
                >
                  {shortLabel(p.label)}
                </text>
              )}
            </g>
          )
        })}

        {/* grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              className={t === 0 ? 'baseline' : 'gridline'}
              x1={M.left}
              x2={w - M.right}
              y1={y(t)}
              y2={y(t)}
            />
            <text className="axis-label" x={M.left - 7} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}

        {xTicks.map((t) => (
          <text
            key={t.i}
            className="axis-label"
            x={x(t.i)}
            y={height - 8}
            textAnchor={
              x(t.i) < M.left + 24 ? 'start' : x(t.i) > w - M.right - 24 ? 'end' : 'middle'
            }
          >
            {t.label}
          </text>
        ))}

        {/* event markers */}
        {visibleEvents.map((e) => {
          const i = indexOf.get(e.occurred_on)!
          return (
            <g key={e.id}>
              <line
                x1={x(i)}
                x2={x(i)}
                y1={M.top}
                y2={M.top + innerH}
                stroke="var(--axis)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              <path
                d={`M${x(i) - 4},${M.top - 1} L${x(i) + 4},${M.top - 1} L${x(i)},${M.top + 5} Z`}
                fill="var(--text-muted)"
              />
            </g>
          )
        })}

        {/* raw days */}
        {points.map((p, i) =>
          p.value === null ? null : (
            <circle
              key={p.date}
              cx={x(i)}
              cy={y(p.value)}
              r={2.2}
              fill="var(--text-muted)"
              opacity={0.42}
            />
          ),
        )}

        {/* trend */}
        {trendPath && (
          <path
            d={trendPath}
            fill="none"
            stroke="var(--text-primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* hover crosshair */}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={M.top}
            y2={M.top + innerH}
            stroke="var(--text-secondary)"
            strokeWidth={1}
          />
        )}
        {hover !== null && hoverPoint?.value !== null && hoverPoint !== null && (
          <circle
            cx={x(hover)}
            cy={y(hoverPoint.value)}
            r={5}
            fill="var(--text-primary)"
            stroke="var(--surface-1)"
            strokeWidth={2}
          />
        )}
      </svg>

      {hover !== null && (
        <div
          className="tooltip"
          style={{
            left: Math.min(Math.max(x(hover) - 60, 0), Math.max(w - 150, 0)),
            top: 4,
          }}
        >
          <div className="t-date">{shortDate(dates[hover])}</div>
          <div className="t-val">
            {hoverPoint?.value !== null && hoverPoint
              ? formatValue(hoverPoint.value, symptom.scale)
              : 'not logged'}
          </div>
          {hoverTrend?.value != null && (
            <div className="tiny muted">
              7 day trend {formatValue(hoverTrend.value, symptom.scale)}
            </div>
          )}
          {hoverPeriod && <div className="tiny muted">{shortLabel(hoverPeriod.label)}</div>}
        </div>
      )}

      <div className="legend" style={{ marginTop: 8 }}>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--text-primary)' }} />7 day trend
        </span>
        <span className="item">
          <span
            className="swatch"
            style={{ background: 'var(--text-muted)', opacity: 0.45, borderRadius: 999 }}
          />
          a logged day
        </span>
        {visibleEvents.length > 0 && (
          <span className="item">
            <span
              className="swatch"
              style={{ background: 'var(--text-muted)', clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            />
            event
          </span>
        )}
      </div>
    </div>
  )
}

function buildPath(
  pts: PointNullable[],
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = ''
  let open = false
  pts.forEach((p, i) => {
    if (p.value === null) {
      open = false
      return
    }
    d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`
    open = true
  })
  return d
}

function clampToRange(date: ISODate, dates: ISODate[]): ISODate {
  if (!dates.length) return date
  if (date < dates[0]) return dates[0]
  if (date > dates[dates.length - 1]) return dates[dates.length - 1]
  return date
}

/** Chart labels get the drug name only, not the brand in brackets. */
function shortLabel(label: string): string {
  return label.replace(/\s*\(.*\)$/, '')
}
