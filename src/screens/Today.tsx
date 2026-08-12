import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { prettyDate, relativeDay, shiftISO, today as todayISO, daysBetween } from '../lib/dates'
import { courseOnDate } from '../lib/stats'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  DRUG_LABEL,
  type Category,
  type TookMed,
} from '../lib/types'
import SymptomInput from '../components/SymptomInput'
import { Card, Chip, Field, Segmented } from '../components/ui'

export default function Today() {
  const store = useStore()
  const [date, setDate] = useState(todayISO())
  const [savedAt, setSavedAt] = useState(0)

  const log = store.logs.find((l) => l.log_date === date)
  const course = courseOnDate(store.courses, date)

  const entriesForDay = useMemo(
    () => store.entries.filter((e) => e.log_date === date),
    [store.entries, date],
  )
  const partsForDay = useMemo(
    () => store.partEntries.filter((e) => e.log_date === date),
    [store.partEntries, date],
  )

  const active = useMemo(
    () => store.symptoms.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [store.symptoms],
  )

  const byCategory = useMemo(() => {
    const m = new Map<Category, typeof active>()
    for (const s of active) {
      const list = m.get(s.category) ?? []
      list.push(s)
      m.set(s.category, list)
    }
    return m
  }, [active])

  const flash = () => setSavedAt(Date.now())
  useEffect(() => {
    if (!savedAt) return
    const t = setTimeout(() => setSavedAt(0), 1400)
    return () => clearTimeout(t)
  }, [savedAt])

  const patch = async (p: Parameters<typeof store.saveLog>[0]) => {
    await store.saveLog(p)
    flash()
  }

  const isFuture = daysBetween(todayISO(), date) > 0

  return (
    <>
      {/* ---- date bar ---- */}
      <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <button className="btn ghost sm" onClick={() => setDate(shiftISO(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontWeight: 650 }}>{relativeDay(date)}</div>
          <div className="tiny muted">{prettyDate(date)}</div>
        </div>
        <button
          className="btn ghost sm"
          onClick={() => setDate(shiftISO(date, 1))}
          disabled={isFuture}
          aria-label="Next day"
        >
          ›
        </button>
        {date !== todayISO() && (
          <button className="btn sm" onClick={() => setDate(todayISO())}>
            Today
          </button>
        )}
        <span className={`saved-dot ${savedAt ? 'on' : ''}`} aria-hidden />
      </div>

      {/* ---- the dose ---- */}
      {course ? (
        <Card
          title="Did you take it?"
          subtitle={`${DRUG_LABEL[course.drug]}${course.dose_mg ? `, ${course.dose_mg} mg` : ''}`}
        >
          <Segmented<TookMed>
            className="yes"
            value={(log?.took_med as TookMed) ?? null}
            options={[
              { value: 'yes', label: 'Took it' },
              { value: 'no', label: 'Missed it' },
              { value: 'na', label: 'Skip' },
            ]}
            onChange={(v) => patch({ log_date: date, took_med: v })}
          />
          {log?.took_med === 'no' && (
            <p className="tiny muted">
              Logged. Missed days get shown alongside the charts so a rough patch does not read as
              the drug doing something it did not.
            </p>
          )}
        </Card>
      ) : (
        <Card title="No medication for this date">
          <p className="small secondary">
            Add what you are taking under Meds and this day will start tracking doses. Logging
            symptoms before you start is worth doing, since that becomes the baseline everything
            gets compared against.
          </p>
        </Card>
      )}

      {/* ---- symptoms ---- */}
      {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((cat) => (
        <Card key={cat} title={CATEGORY_LABEL[cat]}>
          <div>
            {byCategory.get(cat)!.map((s) => (
              <SymptomInput
                key={s.id}
                symptom={s}
                entry={entriesForDay.find((e) => e.symptom_id === s.id)}
                onChange={async (v, loc) => {
                  await store.saveSymptom(date, s.id, v, loc)
                  flash()
                }}
                onClear={async () => {
                  await store.clearSymptom(date, s.id)
                  flash()
                }}
              />
            ))}
          </div>
        </Card>
      ))}

      {/* ---- day shape ---- */}
      <Card title="The day overall">
        <div className="grid-2 collapse">
          <Field label="Hours slept">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              max="24"
              defaultValue={log?.sleep_hours ?? ''}
              key={`sh-${date}`}
              onBlur={(e) =>
                patch({
                  log_date: date,
                  sleep_hours: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Time you took it">
            <input
              type="time"
              defaultValue={log?.med_time?.slice(0, 5) ?? ''}
              key={`mt-${date}`}
              onBlur={(e) =>
                patch({ log_date: date, med_time: e.target.value === '' ? null : e.target.value })
              }
            />
          </Field>
        </div>

        <Scale
          label="Sleep quality"
          low="rough"
          high="great"
          value={log?.sleep_quality ?? null}
          onChange={(v) => patch({ log_date: date, sleep_quality: v })}
        />
        <Scale
          label="Energy"
          low="empty"
          high="full"
          value={log?.energy ?? null}
          onChange={(v) => patch({ log_date: date, energy: v })}
        />
        <Scale
          label="Mood"
          low="worst"
          high="best"
          value={log?.mood ?? null}
          onChange={(v) => patch({ log_date: date, mood: v })}
        />
      </Card>

      {/* ---- parts ---- */}
      <Card title="Who showed up" subtitle="Tap a part that was loud today, tap again to clear it.">
        <div className="row" style={{ gap: 6 }}>
          {store.parts
            .filter((p) => p.is_active)
            .map((p) => {
              const e = partsForDay.find((x) => x.part_id === p.id)
              return (
                <Chip
                  key={p.id}
                  on={Boolean(e)}
                  onClick={async () => {
                    if (e) await store.clearPart(date, p.id)
                    else await store.savePart(date, p.id, 5)
                    flash()
                  }}
                >
                  {p.name}
                </Chip>
              )
            })}
          {!store.parts.some((p) => p.is_active) && (
            <span className="tiny muted">Add parts under Settings.</span>
          )}
        </div>

        {partsForDay.length > 0 && (
          <div className="stack" style={{ gap: 10, marginTop: 4 }}>
            {partsForDay.map((e) => {
              const p = store.parts.find((x) => x.id === e.part_id)
              if (!p) return null
              return (
                <Scale
                  key={e.part_id}
                  label={`How loud was ${p.name}`}
                  low="background"
                  high="running the show"
                  value={e.intensity}
                  onChange={async (v) => {
                    await store.savePart(date, e.part_id, v ?? 5)
                    flash()
                  }}
                />
              )
            })}
          </div>
        )}

        <Scale
          label="Self energy"
          low="fully blended"
          high="lots of Self"
          value={log?.self_energy ?? null}
          onChange={(v) => patch({ log_date: date, self_energy: v })}
        />
      </Card>

      {/* ---- note ---- */}
      <Card title="Anything else">
        <textarea
          key={`note-${date}`}
          defaultValue={log?.note ?? ''}
          placeholder="What happened, what you noticed, what you want to remember to say out loud at the next appointment."
          onBlur={(e) => patch({ log_date: date, note: e.target.value || null })}
        />
      </Card>
    </>
  )
}

/** Compact 0-10 row used for the whole-day measures. */
function Scale({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string
  low: string
  high: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const held = useRef(value)
  held.current = value
  return (
    <div className="sym" style={{ borderBottom: 0, paddingBottom: 0 }}>
      <div className="sym-head">
        <span className="name">{label}</span>
        <span className="spacer" />
        {value !== null ? (
          <>
            <span className="val">{value}</span>
            <button
              type="button"
              className="btn ghost sm"
              style={{ minHeight: 26, padding: '0 6px' }}
              onClick={() => onChange(null)}
              aria-label={`Clear ${label}`}
            >
              ✕
            </button>
          </>
        ) : (
          <span className="val unset">–</span>
        )}
      </div>
      <div className="ticks">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${label} ${i}`}
            data-on={value !== null && i <= value}
            data-sel={value === i}
            onClick={() => onChange(i)}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="ticks-scale">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  )
}
