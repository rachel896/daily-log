import { useMeasure } from './useMeasure'
import { formatValue, scaleMax, type SymptomComparison } from '../lib/stats'
import type { Scale } from '../lib/types'

interface Props {
  rows: SymptomComparison[]
  labelA: string
  labelB: string
}

const ROW_H = 34
const AXIS_H = 20

/**
 * On a phone there is not room for a symptom name, a plot and a "6 → 4"
 * readout on one line. The readout is the first thing to go, because the table
 * underneath already carries every number.
 */
function metrics(w: number) {
  const showValues = w >= 430
  const labelW = Math.round(Math.min(150, Math.max(84, w * 0.34)))
  return { showValues, labelW, padR: showValues ? 96 : 24 }
}

const SCALE_HEADING: Record<Scale, string> = {
  sev: 'Rated 0 to 10',
  count: 'Counted per day',
  mins: 'Measured in minutes',
  bool: 'Yes or no',
}

/**
 * Before to after, one row per symptom. A dumbbell is the right form here:
 * two states of the same measure, so it stays one hue in two shades and the
 * connecting bar carries the size of the change.
 *
 * Rows are faceted by scale. Minutes and 0-to-10 ratings never share an axis,
 * because equal bar lengths across them would mean nothing.
 */
export default function DumbbellChart({ rows, labelA, labelB }: Props) {
  const usable = rows.filter((r) => r.a && r.b)

  if (!usable.length) {
    return (
      <div className="empty">
        Not enough overlap yet. Both periods need at least a few logged days for the same symptom.
      </div>
    )
  }

  const groups = new Map<Scale, SymptomComparison[]>()
  for (const r of usable) {
    const list = groups.get(r.symptom.scale) ?? []
    list.push(r)
    groups.set(r.symptom.scale, list)
  }
  const order: Scale[] = ['sev', 'mins', 'count', 'bool']
  const ordered = order.filter((s) => groups.has(s))

  return (
    <div className="stack" style={{ gap: 18 }}>
      {ordered.map((scale) => (
        <Facet
          key={scale}
          scale={scale}
          rows={groups.get(scale)!}
          showHeading={ordered.length > 1}
        />
      ))}

      <div className="legend">
        <span className="item">
          <span className="swatch" style={{ background: 'var(--ramp-250)', borderRadius: 999 }} />
          {labelA}
        </span>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--ramp-600)', borderRadius: 999 }} />
          {labelB}
        </span>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--serious)' }} />
          moved the unpleasant way
        </span>
      </div>
    </div>
  )
}

function Facet({
  scale,
  rows,
  showHeading,
}: {
  scale: Scale
  rows: SymptomComparison[]
  showHeading: boolean
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()

  // One shared axis inside the facet, so lengths are comparable here.
  const max = scaleMax(
    scale,
    rows.reduce((m, r) => Math.max(m, r.a!.max, r.b!.max), 0),
  )

  const w = Math.max(width, 260)
  const { showValues, labelW, padR } = metrics(w)
  const plotW = Math.max(w - labelW - padR, 60)
  const height = rows.length * ROW_H + AXIS_H + 10
  const x = (v: number) => labelW + (v / max) * plotW

  const ticks = axisTicks(scale, max)

  return (
    <div ref={ref}>
      {showHeading && <div className="section-title">{SCALE_HEADING[scale]}</div>}
      <svg
        className="chart"
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label={`Median values, ${SCALE_HEADING[scale].toLowerCase()}`}
      >
        {ticks.map((t) => (
          <line
            key={t}
            className={t === 0 ? 'baseline' : 'gridline'}
            x1={x(t)}
            x2={x(t)}
            y1={6}
            y2={rows.length * ROW_H + 4}
          />
        ))}

        {rows.map((r, idx) => {
          const cy = 20 + idx * ROW_H
          const xa = x(r.a!.median)
          const xb = x(r.b!.median)
          const worse = r.worse === true
          return (
            <g key={r.symptom.id}>
              <text
                x={labelW - 12}
                y={cy + 4}
                textAnchor="end"
                fontSize={12}
                fill="var(--text-primary)"
              >
                {truncate(r.symptom.label, Math.max(10, Math.floor((labelW - 14) / 6.6)))}
              </text>

              <line
                x1={xa}
                x2={xb}
                y1={cy}
                y2={cy}
                stroke={worse ? 'var(--serious)' : 'var(--ramp-250)'}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* 2px surface ring keeps both ends readable where they overlap */}
              <circle cx={xa} cy={cy} r={5} fill="var(--ramp-250)" stroke="var(--surface-1)" strokeWidth={2} />
              <circle cx={xb} cy={cy} r={5.5} fill="var(--ramp-600)" stroke="var(--surface-1)" strokeWidth={2} />

              {showValues && (
                <text
                  x={w - 4}
                  y={cy + 4}
                  fontSize={11}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatValue(r.a!.median, scale)} → {formatValue(r.b!.median, scale)}
                </text>
              )}
            </g>
          )
        })}

        {ticks.map((t, i) => (
          <text
            key={`t-${t}`}
            className="axis-label"
            x={x(t)}
            y={rows.length * ROW_H + AXIS_H}
            /* outer ticks anchor inward so they cannot run off the card */
            textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
          >
            {t}
          </text>
        ))}
      </svg>
    </div>
  )
}

/** Whole-number ticks that land on values a person would actually say out loud. */
function axisTicks(scale: Scale, max: number): number[] {
  if (scale === 'sev') return [0, 5, 10]
  if (scale === 'bool') return [0, 1]
  const step =
    scale === 'mins'
      ? max <= 60
        ? 15
        : max <= 120
          ? 30
          : 60
      : Math.max(1, Math.round(max / 4))
  const out: number[] = []
  for (let v = 0; v <= max + 0.001; v += step) out.push(Math.round(v))
  if (out[out.length - 1] !== max) out.push(max)
  return out
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
