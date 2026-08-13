import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { dateRange, daysBetween, shiftISO, today } from '../lib/dates'
import { adherence, periodsFromCourses, seriesFor, summarize, formatValue } from '../lib/stats'
import TimelineChart from '../components/TimelineChart'
import Sparkline from '../components/Sparkline'
import AdherenceGrid from '../components/AdherenceGrid'
import { Card, StatTile } from '../components/ui'
import { CATEGORY_LABEL } from '../lib/types'

const RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '180', label: '6 months', days: 180 },
  { key: '365', label: '1 year', days: 365 },
  { key: 'all', label: 'All', days: 0 },
]

export default function Trends() {
  const store = useStore()
  const [rangeKey, setRangeKey] = useState('90')
  const [focusId, setFocusId] = useState<string | null>(null)

  const active = useMemo(
    () => store.symptoms.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [store.symptoms],
  )

  const earliest = useMemo(() => {
    const all = [
      ...store.logs.map((l) => l.log_date),
      ...store.entries.map((e) => e.log_date),
    ].sort()
    return all[0] ?? null
  }, [store.logs, store.entries])

  const dates = useMemo(() => {
    const end = today()
    const r = RANGES.find((x) => x.key === rangeKey)!
    const start = r.days ? shiftISO(end, -(r.days - 1)) : (earliest ?? shiftISO(end, -29))
    return dateRange(start, end)
  }, [rangeKey, earliest])

  const periods = useMemo(
    () => periodsFromCourses(store.courses, earliest),
    [store.courses, earliest],
  )

  const focus = active.find((s) => s.id === focusId) ?? active[0] ?? null

  const focusPoints = useMemo(
    () => (focus ? seriesFor(focus.id, store.entries, dates) : []),
    [focus, store.entries, dates],
  )

  const inWindow = (d: string) => daysBetween(dates[0], d) >= 0

  const daysLogged = useMemo(
    () => store.logs.filter((l) => inWindow(l.log_date)).length,
    [store.logs, dates],
  )

  const windowPeriod = { id: 'w', label: '', sublabel: '', start: dates[0], end: dates[dates.length - 1], slot: 0 }
  const adh = adherence(store.logs, windowPeriod)

  const focusSummary = useMemo(
    () => summarize(focusPoints.map((p) => p.value).filter((v): v is number => v !== null)),
    [focusPoints],
  )

  const eventsInWindow = useMemo(
    () => store.events.filter((e) => inWindow(e.occurred_on)),
    [store.events, dates],
  )

  if (!earliest) {
    return (
      <Card title="Nothing to chart yet" icon="trends">
        <p className="small secondary">
          Log a few days first. The charts get useful at about two weeks, and genuinely useful once
          there is a stretch before a medication change to compare against.
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="seg no-print">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={rangeKey === r.key}
            onClick={() => setRangeKey(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="tiles">
        <StatTile label="Days logged" value={daysLogged} sub={`of ${dates.length} in view`} />
        <StatTile
          label="Doses taken"
          value={adh.pct === null ? '–' : `${Math.round(adh.pct)}%`}
          sub={adh.missed ? `${adh.missed} missed` : 'none missed'}
          tone={adh.pct !== null && adh.pct < 80 ? 'bad' : undefined}
        />
        {focus && focusSummary && (
          <StatTile
            label={`${focus.label}, median`}
            value={formatValue(focusSummary.median, focus.scale)}
            sub={`worst ${formatValue(focusSummary.max, focus.scale)} over ${focusSummary.n} days`}
          />
        )}
      </div>

      <Card
        title={focus ? focus.label : 'Trend'}
        subtitle={focus ? CATEGORY_LABEL[focus.category] : undefined}
        action={
          active.length > 1 ? (
            <select
              className="no-print"
              style={{ width: 'auto', minWidth: 150 }}
              value={focus?.id ?? ''}
              onChange={(e) => setFocusId(e.target.value)}
              aria-label="Choose a symptom"
            >
              {active.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        {focus && (
          <TimelineChart
            symptom={focus}
            points={focusPoints}
            dates={dates}
            periods={periods}
            events={eventsInWindow}
          />
        )}
        {periods.length > 0 && (
          <p className="tiny muted">
            The shaded bands are medication periods. A change that starts at a band edge is worth
            raising. A change in the middle of one usually is not the drug.
          </p>
        )}
      </Card>

      {store.courses.some((c) => c.is_endocrine) && (
        <Card title="Doses" subtitle="Every day in the window" icon="calendar">
          <AdherenceGrid dates={dates} logs={store.logs} />
        </Card>
      )}

      <Card icon="trends" title="Everything at once" subtitle="Same window, same scale as each other where it makes sense">
        <div style={{ display: 'grid', gap: 4 }}>
          {active.map((s) => {
            const pts = seriesFor(s.id, store.entries, dates)
            const n = pts.filter((p) => p.value !== null).length
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setFocusId(s.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(96px, 30%) 1fr auto',
                  alignItems: 'center',
                  gap: 10,
                  background: s.id === focus?.id ? 'var(--surface-2)' : 'transparent',
                  border: 0,
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span className="small" style={{ fontWeight: 550 }}>
                  {s.label}
                </span>
                {n ? (
                  <Sparkline symptom={s} points={pts} dates={dates} periods={periods} />
                ) : (
                  <span className="tiny muted">no data</span>
                )}
                <span className="tiny muted tabular">{n}d</span>
              </button>
            )
          })}
        </div>
      </Card>
    </>
  )
}
