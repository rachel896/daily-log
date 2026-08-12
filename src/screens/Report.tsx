import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { dateRange, daysBetween, prettyDate, shiftISO, today } from '../lib/dates'
import {
  adherence,
  compareSymptoms,
  formatValue,
  periodsFromCourses,
  summarize,
} from '../lib/stats'
import { Card, Delta, Field } from '../components/ui'
import { DRUG_LABEL, EVENT_LABEL } from '../lib/types'

/**
 * A printable page for an appointment. Print to PDF from the browser.
 * Everything on it is a direct read of what was logged, phrased so it can be
 * handed over without needing you to narrate it.
 */
export default function Report() {
  const store = useStore()
  const [start, setStart] = useState(shiftISO(today(), -89))
  const [end, setEnd] = useState(today())

  const dates = useMemo(() => dateRange(start, end), [start, end])
  const period = { id: 'r', label: 'Range', sublabel: '', start, end, slot: 0 }

  const earliest = useMemo(() => {
    const all = [...store.logs.map((l) => l.log_date), ...store.entries.map((e) => e.log_date)].sort()
    return all[0] ?? null
  }, [store.logs, store.entries])

  const priorLen = Math.max(daysBetween(start, end), 6)
  const prior = {
    id: 'p',
    label: 'Previous',
    sublabel: '',
    start: shiftISO(start, -(priorLen + 1)),
    end: shiftISO(start, -1),
    slot: 0,
  }

  const active = useMemo(
    () => store.symptoms.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [store.symptoms],
  )

  const inRange = (d: string) => d >= start && d <= end

  const rows = useMemo(() => {
    return active
      .map((s) => {
        const vals = store.entries
          .filter((e) => e.symptom_id === s.id && inRange(e.log_date))
          .map((e) => Number(e.value))
        const sum = summarize(vals)
        const severe =
          s.scale === 'sev' ? vals.filter((v) => v >= 7).length : null
        return { s, sum, severe }
      })
      .filter((r) => r.sum !== null)
  }, [active, store.entries, start, end])

  const changes = useMemo(
    () => compareSymptoms(active, store.entries, prior, period).filter((r) => r.notable),
    [active, store.entries, start, end],
  )

  const adh = adherence(store.logs, period)
  const logsInRange = store.logs.filter((l) => inRange(l.log_date))
  const eventsInRange = store.events
    .filter((e) => inRange(e.occurred_on))
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))

  const notes = logsInRange
    .filter((l) => l.note && l.note.trim())
    .sort((a, b) => b.log_date.localeCompare(a.log_date))

  const medsInRange = store.courses.filter(
    (c) => c.started_on <= end && (!c.ended_on || c.ended_on >= start),
  )

  const periods = periodsFromCourses(store.courses, earliest)

  return (
    <>
      <Card title="Report" subtitle="Set the range, then print it or save it as a PDF">
        <div className="grid-2 collapse no-print">
          <Field label="From">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="row no-print">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              className="btn sm"
              onClick={() => {
                setStart(shiftISO(today(), -(d - 1)))
                setEnd(today())
              }}
            >
              Last {d} days
            </button>
          ))}
          {periods.length > 0 && (
            <button
              className="btn sm"
              onClick={() => {
                const last = periods[periods.length - 1]
                setStart(last.start)
                setEnd(last.end)
              }}
            >
              Current medication
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button className="btn primary" onClick={() => window.print()}>
            Print or save as PDF
          </button>
        </div>
      </Card>

      <div className="print-only" style={{ marginBottom: 12 }}>
        <h1>Symptom summary</h1>
        <p className="small">
          {prettyDate(start)} to {prettyDate(end)}, {dates.length} days
        </p>
      </div>

      <Card title="Overview">
        <table className="data">
          <tbody>
            <tr>
              <td>Period</td>
              <td className="num">
                {prettyDate(start)} to {prettyDate(end)}
              </td>
            </tr>
            <tr>
              <td>Days logged</td>
              <td className="num">
                {logsInRange.length} of {dates.length}
              </td>
            </tr>
            <tr>
              <td>Medication</td>
              <td className="num">
                {medsInRange.length
                  ? medsInRange
                      .map(
                        (c) =>
                          `${c.brand || DRUG_LABEL[c.drug]}${c.dose_mg ? ` ${c.dose_mg} mg` : ''}`,
                      )
                      .join(', ')
                  : 'none recorded'}
              </td>
            </tr>
            <tr>
              <td>Doses taken</td>
              <td className="num">
                {adh.pct === null
                  ? 'not tracked'
                  : `${Math.round(adh.pct)}% (${adh.taken} taken, ${adh.missed} missed)`}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {changes.length > 0 && (
        <Card
          title="What changed"
          subtitle={`Against the ${priorLen + 1} days before this period`}
        >
          <table className="data">
            <thead>
              <tr>
                <th>Symptom</th>
                <th className="num">Before</th>
                <th className="num">This period</th>
                <th className="num">Change</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((r) => (
                <tr key={r.symptom.id}>
                  <td>{r.symptom.label}</td>
                  <td className="num">{r.a ? formatValue(r.a.median, r.symptom.scale) : '–'}</td>
                  <td className="num">{r.b ? formatValue(r.b.median, r.symptom.scale) : '–'}</td>
                  <td className="num">
                    {r.delta !== null && <Delta value={r.delta} worse={r.worse} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Symptoms in this period">
        <table className="data">
          <thead>
            <tr>
              <th>Symptom</th>
              <th className="num">Median</th>
              <th className="num">Worst</th>
              <th className="num">Days 7+</th>
              <th className="num">Logged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, sum, severe }) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td className="num">{formatValue(sum!.median, s.scale)}</td>
                <td className="num">{formatValue(sum!.max, s.scale)}</td>
                <td className="num">{severe === null ? '–' : severe}</td>
                <td className="num muted">{sum!.n}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Nothing logged in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="tiny muted">
          Median is the middle day. "Days 7+" counts days rated 7 or higher on a 0 to 10 scale.
        </p>
      </Card>

      {eventsInRange.length > 0 && (
        <Card title="Events">
          <table className="data">
            <tbody>
              {eventsInRange.map((e) => (
                <tr key={e.id}>
                  <td style={{ width: '9em' }} className="muted">
                    {prettyDate(e.occurred_on)}
                  </td>
                  <td>
                    {e.title}
                    <span className="muted"> ({EVENT_LABEL[e.kind]})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {notes.length > 0 && (
        <Card title="Notes" subtitle={`${notes.length} days with something written down`}>
          <table className="data">
            <tbody>
              {notes.slice(0, 25).map((l) => (
                <tr key={l.log_date}>
                  <td style={{ width: '9em', verticalAlign: 'top' }} className="muted">
                    {prettyDate(l.log_date)}
                  </td>
                  <td>{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notes.length > 25 && (
            <p className="tiny muted">Showing the 25 most recent of {notes.length}.</p>
          )}
        </Card>
      )}

      <p className="tiny muted">
        Self reported daily log. Medians and counts are calculated from the days that were logged,
        so a gap in logging is not the same as a good day.
      </p>
    </>
  )
}
