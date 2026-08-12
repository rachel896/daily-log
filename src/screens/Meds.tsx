import { useState } from 'react'
import { useStore } from '../lib/store'
import { prettyDate, shortDate, today } from '../lib/dates'
import {
  DRUG_DEFAULT_DOSE,
  DRUG_LABEL,
  EVENT_LABEL,
  type DrugKey,
  type EventKind,
  type MedCourse,
  type TrackedEvent,
} from '../lib/types'
import { Card, Field } from '../components/ui'
import { slotColor } from '../components/colors'

export default function Meds() {
  const store = useStore()
  const [editing, setEditing] = useState<Partial<MedCourse> | null>(null)
  const [eventDraft, setEventDraft] = useState<Partial<TrackedEvent> | null>(null)

  const endocrine = store.courses.filter((c) => c.is_endocrine)
  const adjuncts = store.courses.filter((c) => !c.is_endocrine)

  const nextSlot = () => {
    const used = new Set(endocrine.map((c) => c.slot))
    for (let i = 1; i <= 3; i++) if (!used.has(i)) return i
    return 1
  }

  return (
    <>
      <Card
        title="Endocrine therapy"
        subtitle="The drug the charts get grouped by"
        action={
          <button
            className="btn primary sm"
            onClick={() =>
              setEditing({
                drug: 'anastrozole',
                dose_mg: DRUG_DEFAULT_DOSE.anastrozole,
                schedule: 'daily',
                is_endocrine: true,
                started_on: today(),
                slot: nextSlot(),
              })
            }
          >
            Add
          </button>
        }
      >
        {endocrine.length === 0 && (
          <p className="small secondary">
            Nothing added yet. If you have a start date already, add it now even if it is in the
            future. Days logged before it become your baseline automatically.
          </p>
        )}
        {endocrine.map((c) => (
          <div className="list-item" key={c.id}>
            <span className="band-key" style={{ background: slotColor(c.slot) }} />
            <div className="grow">
              <div className="t">{DRUG_LABEL[c.drug] ?? c.drug}</div>
              <div className="s">
                {c.dose_mg ? `${c.dose_mg} mg ${c.schedule ?? 'daily'}, ` : ''}
                {shortDate(c.started_on)} to {c.ended_on ? shortDate(c.ended_on) : 'now'}
                {c.stop_reason ? `, stopped: ${c.stop_reason}` : ''}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => setEditing(c)}>
              Edit
            </button>
          </div>
        ))}
      </Card>

      <Card
        title="Everything else"
        subtitle="Ovarian suppression, bone drugs, supplements, anything you want on the record"
        action={
          <button
            className="btn sm"
            onClick={() =>
              setEditing({
                drug: 'other',
                schedule: 'daily',
                is_endocrine: false,
                started_on: today(),
                slot: 0,
              })
            }
          >
            Add
          </button>
        }
      >
        {adjuncts.length === 0 && <p className="small muted">Nothing added.</p>}
        {adjuncts.map((c) => (
          <div className="list-item" key={c.id}>
            <div className="grow">
              <div className="t">{c.brand || DRUG_LABEL[c.drug] || c.drug}</div>
              <div className="s">
                {c.dose_mg ? `${c.dose_mg} mg ${c.schedule ?? ''}, ` : ''}
                {shortDate(c.started_on)} to {c.ended_on ? shortDate(c.ended_on) : 'now'}
              </div>
            </div>
            <button className="btn ghost sm" onClick={() => setEditing(c)}>
              Edit
            </button>
          </div>
        ))}
      </Card>

      {editing && (
        <CourseForm
          value={editing}
          onCancel={() => setEditing(null)}
          onDelete={
            editing.id
              ? async () => {
                  await store.deleteCourse(editing.id!)
                  setEditing(null)
                }
              : undefined
          }
          onSave={async (v) => {
            await store.saveCourse(v)
            setEditing(null)
          }}
        />
      )}

      <Card
        title="Events"
        subtitle="Marked on every chart, so a bad fortnight has context"
        action={
          <button
            className="btn sm"
            onClick={() => setEventDraft({ occurred_on: today(), kind: 'appointment', title: '' })}
          >
            Add
          </button>
        }
      >
        {store.events.length === 0 && <p className="small muted">Nothing added.</p>}
        {store.events
          .slice()
          .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
          .map((e) => (
            <div className="list-item" key={e.id}>
              <div className="grow">
                <div className="t">{e.title}</div>
                <div className="s">
                  {EVENT_LABEL[e.kind]}, {prettyDate(e.occurred_on)}
                </div>
              </div>
              <button className="btn ghost sm danger" onClick={() => store.deleteEvent(e.id)}>
                Delete
              </button>
            </div>
          ))}
      </Card>

      {eventDraft && (
        <EventForm
          value={eventDraft}
          onCancel={() => setEventDraft(null)}
          onSave={async (v) => {
            await store.saveEvent(v)
            setEventDraft(null)
          }}
        />
      )}
    </>
  )
}

function CourseForm({
  value,
  onSave,
  onCancel,
  onDelete,
}: {
  value: Partial<MedCourse>
  onSave: (v: Partial<MedCourse>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [v, setV] = useState(value)
  const set = (patch: Partial<MedCourse>) => setV((old) => ({ ...old, ...patch }))

  return (
    <Card title={v.id ? 'Edit' : 'Add'}>
      <div className="grid-2 collapse">
        <Field label="Drug">
          <select
            value={v.drug ?? 'other'}
            onChange={(e) => {
              const d = e.target.value as DrugKey
              set({ drug: d, dose_mg: v.is_endocrine ? DRUG_DEFAULT_DOSE[d] : v.dose_mg })
            }}
          >
            {(Object.keys(DRUG_LABEL) as DrugKey[]).map((k) => (
              <option key={k} value={k}>
                {DRUG_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dose in mg">
          <input
            type="number"
            step="0.5"
            value={v.dose_mg ?? ''}
            onChange={(e) => set({ dose_mg: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </Field>
      </div>

      {v.drug === 'other' && (
        <Field label="Name">
          <input
            type="text"
            value={v.brand ?? ''}
            placeholder="Leuprolide, zoledronic acid, vitamin D…"
            onChange={(e) => set({ brand: e.target.value })}
          />
        </Field>
      )}

      <div className="grid-2 collapse">
        <Field label="Started">
          <input
            type="date"
            value={v.started_on ?? ''}
            onChange={(e) => set({ started_on: e.target.value })}
          />
        </Field>
        <Field label="Stopped" hint="Leave empty while you are still on it">
          <input
            type="date"
            value={v.ended_on ?? ''}
            onChange={(e) => set({ ended_on: e.target.value || null })}
          />
        </Field>
      </div>

      <Field label="How often">
        <input
          type="text"
          value={v.schedule ?? ''}
          placeholder="daily, weekly, every 4 weeks…"
          onChange={(e) => set({ schedule: e.target.value })}
        />
      </Field>

      {v.ended_on && (
        <Field label="Why you stopped">
          <input
            type="text"
            value={v.stop_reason ?? ''}
            placeholder="joint pain, switched, told to pause…"
            onChange={(e) => set({ stop_reason: e.target.value })}
          />
        </Field>
      )}

      <Field label="Note">
        <textarea value={v.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
      </Field>

      <div className="row">
        <button
          className="btn primary"
          disabled={!v.started_on}
          onClick={() => onSave(v)}
        >
          Save
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
        <span style={{ flex: 1 }} />
        {onDelete && (
          <button className="btn ghost danger" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </Card>
  )
}

function EventForm({
  value,
  onSave,
  onCancel,
}: {
  value: Partial<TrackedEvent>
  onSave: (v: Partial<TrackedEvent>) => void
  onCancel: () => void
}) {
  const [v, setV] = useState(value)
  return (
    <Card title="Add an event">
      <div className="grid-2 collapse">
        <Field label="Date">
          <input
            type="date"
            value={v.occurred_on ?? ''}
            onChange={(e) => setV({ ...v, occurred_on: e.target.value })}
          />
        </Field>
        <Field label="Kind">
          <select
            value={v.kind ?? 'other'}
            onChange={(e) => setV({ ...v, kind: e.target.value as EventKind })}
          >
            {(Object.keys(EVENT_LABEL) as EventKind[]).map((k) => (
              <option key={k} value={k}>
                {EVENT_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="What happened">
        <input
          type="text"
          value={v.title ?? ''}
          placeholder="Oncology follow up, started PT, first Lupron…"
          onChange={(e) => setV({ ...v, title: e.target.value })}
        />
      </Field>
      <div className="row">
        <button className="btn primary" disabled={!v.title || !v.occurred_on} onClick={() => onSave(v)}>
          Save
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Card>
  )
}
