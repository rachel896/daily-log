import { useMemo } from 'react'
import { fromISO, prettyDate, type ISODate } from '../lib/dates'
import type { DailyLog } from '../lib/types'

interface Props {
  dates: ISODate[]
  logs: DailyLog[]
}

const CELL = 12
const GAP = 3
const DOW = ['M', '', 'W', '', 'F', '', 'S']

/**
 * Whether you took it, day by day. Missed doses change how every other chart
 * should be read, so this sits next to them rather than buried in a total.
 */
export default function AdherenceGrid({ dates, logs }: Props) {
  const state = useMemo(() => {
    const m = new Map<string, DailyLog['took_med']>()
    for (const l of logs) m.set(l.log_date, l.took_med)
    return m
  }, [logs])

  if (!dates.length) return null

  // Columns are weeks starting Monday.
  const first = fromISO(dates[0])
  const offset = (first.getDay() + 6) % 7
  const cells = dates.map((d, i) => ({ d, slot: i + offset }))
  const weeks = Math.ceil((dates.length + offset) / 7)

  const w = 18 + weeks * (CELL + GAP)
  const h = 7 * (CELL + GAP)

  return (
    <div>
      <div className="scroll-x">
      <svg
        className="chart"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ minWidth: w }}
        role="img"
        aria-label="Doses taken, day by day"
      >
        {DOW.map((label, i) =>
          label ? (
            <text
              key={i}
              className="axis-label"
              x={0}
              y={i * (CELL + GAP) + CELL - 2}
              fontSize={9}
            >
              {label}
            </text>
          ) : null,
        )}
        {cells.map(({ d, slot }) => {
          const col = Math.floor(slot / 7)
          const row = slot % 7
          const v = state.get(d)
          const fill =
            v === 'yes'
              ? 'var(--good)'
              : v === 'no'
                ? 'var(--critical)'
                : v === 'na'
                  ? 'var(--axis)'
                  : 'var(--surface-2)'
          return (
            <rect
              key={d}
              x={18 + col * (CELL + GAP)}
              y={row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={3}
              fill={fill}
            >
              <title>
                {prettyDate(d)}:{' '}
                {v === 'yes'
                  ? 'taken'
                  : v === 'no'
                    ? 'missed'
                    : v === 'na'
                      ? 'not applicable'
                      : 'not answered'}
              </title>
            </rect>
          )
        })}
      </svg>
      </div>

      <div className="legend" style={{ marginTop: 8 }}>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--good)' }} />
          taken
        </span>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--critical)' }} />
          missed
        </span>
        <span className="item">
          <span className="swatch" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)' }} />
          not answered
        </span>
      </div>
    </div>
  )
}
