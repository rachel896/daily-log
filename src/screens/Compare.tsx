import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { daysBetween, shortDate } from '../lib/dates'
import {
  adherence,
  compareSymptoms,
  formatValue,
  periodsFromCourses,
  type Period,
} from '../lib/stats'
import DumbbellChart from '../components/DumbbellChart'
import { Card, Delta, Field, StatTile } from '../components/ui'
import { slotColor } from '../components/colors'

export default function Compare() {
  const store = useStore()

  const earliest = useMemo(() => {
    const all = [...store.logs.map((l) => l.log_date), ...store.entries.map((e) => e.log_date)].sort()
    return all[0] ?? null
  }, [store.logs, store.entries])

  const periods = useMemo(
    () => periodsFromCourses(store.courses, earliest),
    [store.courses, earliest],
  )

  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)

  const a = periods.find((p) => p.id === aId) ?? periods[periods.length - 2] ?? null
  const b = periods.find((p) => p.id === bId) ?? periods[periods.length - 1] ?? null

  const active = useMemo(
    () => store.symptoms.filter((s) => s.is_active).sort((a2, b2) => a2.sort_order - b2.sort_order),
    [store.symptoms],
  )

  const rows = useMemo(
    () => (a && b ? compareSymptoms(active, store.entries, a, b) : []),
    [active, store.entries, a, b],
  )

  if (periods.length < 2 || !a || !b) {
    return (
      <Card title="Nothing to compare yet">
        <p className="small secondary">
          This screen wakes up once you have two stretches to hold against each other: a run of days
          before you start a drug and a run of days on it, or one aromatase inhibitor followed by
          another. Add what you are taking under Meds and keep logging.
        </p>
      </Card>
    )
  }

  const moved = rows.filter((r) => r.notable)
  const worse = moved.filter((r) => r.worse === true)
  const better = moved.filter((r) => r.worse === false)

  const adhA = adherence(store.logs, a)
  const adhB = adherence(store.logs, b)

  return (
    <>
      <Card title="Compare two stretches">
        <div className="grid-2 collapse">
          <Field label="Earlier">
            <select value={a.id} onChange={(e) => setAId(e.target.value)}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Later">
            <select value={b.id} onChange={(e) => setBId(e.target.value)}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <PeriodChip p={a} />
          <PeriodChip p={b} />
        </div>
      </Card>

      <div className="tiles">
        <StatTile
          label="Moved for the worse"
          value={worse.length}
          sub={worse.length ? worse.map((r) => r.symptom.label).join(', ') : 'nothing notable'}
          tone={worse.length ? 'bad' : undefined}
        />
        <StatTile
          label="Moved for the better"
          value={better.length}
          sub={better.length ? better.map((r) => r.symptom.label).join(', ') : 'nothing notable'}
          tone={better.length ? 'good' : undefined}
        />
        <StatTile
          label="Doses taken"
          value={
            adhA.pct === null || adhB.pct === null
              ? '–'
              : `${Math.round(adhA.pct)}% → ${Math.round(adhB.pct)}%`
          }
          sub="earlier, then later"
        />
      </div>

      <Card
        title="Median per symptom"
        subtitle={`${shortLabel(a.label)} compared with ${shortLabel(b.label)}`}
      >
        <DumbbellChart rows={rows} labelA={shortLabel(a.label)} labelB={shortLabel(b.label)} />
      </Card>

      <Card title="The numbers">
        <div style={{ overflowX: 'auto' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Symptom</th>
                <th className="num">{shortLabel(a.label)}</th>
                <th className="num">{shortLabel(b.label)}</th>
                <th className="num">Change</th>
                <th className="num">Days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symptom.id}>
                  <td>
                    {r.symptom.label}
                    {r.notable && (
                      <span className="tiny muted" style={{ marginLeft: 6 }}>
                        worth raising
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {r.a ? formatValue(r.a.median, r.symptom.scale) : '–'}
                  </td>
                  <td className="num">
                    {r.b ? formatValue(r.b.median, r.symptom.scale) : '–'}
                  </td>
                  <td className="num">
                    {r.delta === null ? '–' : <Delta value={r.delta} worse={r.worse} />}
                  </td>
                  <td className="num muted">
                    {r.a?.n ?? 0} / {r.b?.n ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted">
          Values are medians, which is the middle day rather than the average, so one terrible week
          does not drag the whole picture. Change is the later median minus the earlier one. "Worth
          raising" means the shift was at least 2 points on a 0 to 10 scale with at least 10 logged
          days on both sides. That is a reading aid on your own data, not a statistical test, and it
          cannot tell the drug apart from everything else that was happening.
        </p>
      </Card>
    </>
  )
}

function PeriodChip({ p }: { p: Period }) {
  const days = daysBetween(p.start, p.end) + 1
  return (
    <div className="row-tight">
      <span className="band-key" style={{ background: slotColor(p.slot), minHeight: 26 }} />
      <div>
        <div className="small" style={{ fontWeight: 550 }}>
          {shortLabel(p.label)}
        </div>
        <div className="tiny muted">
          {shortDate(p.start)} to {shortDate(p.end)}, {days} days
        </div>
      </div>
    </div>
  )
}

function shortLabel(label: string): string {
  return label.replace(/\s*\(.*\)$/, '')
}
