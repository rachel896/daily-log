import { useState } from 'react'
import { useStore } from '../lib/store'
import { CATEGORY_LABEL, CATEGORY_ORDER, type Category, type Scale } from '../lib/types'
import { Card, Field } from '../components/ui'
import { clearConfig, configIsFromEnv } from '../lib/config'
import { db, resetClient } from '../lib/supabase'

export default function Settings({ email, theme, setTheme, demo = false }: {
  email: string
  theme: 'system' | 'light' | 'dark'
  setTheme: (t: 'system' | 'light' | 'dark') => void
  demo?: boolean
}) {
  const store = useStore()
  const [newSymptom, setNewSymptom] = useState<{ label: string; category: Category; scale: Scale } | null>(null)
  const [newPart, setNewPart] = useState('')

  const byCategory = (c: Category) =>
    store.symptoms.filter((s) => s.category === c).sort((a, b) => a.sort_order - b.sort_order)

  return (
    <>
      <Card title="What you track" subtitle="Turn things off to keep the daily log short">
        {CATEGORY_ORDER.map((cat) => {
          const list = byCategory(cat)
          if (!list.length) return null
          return (
            <div key={cat} className="stack" style={{ gap: 2 }}>
              <div className="section-title" style={{ marginTop: 6 }}>
                {CATEGORY_LABEL[cat]}
              </div>
              {list.map((s) => (
                <label
                  key={s.id}
                  className="list-item"
                  style={{ cursor: 'pointer', paddingTop: 9, paddingBottom: 9 }}
                >
                  <input
                    type="checkbox"
                    checked={s.is_active}
                    style={{ width: 20, height: 20, minHeight: 0, flex: 'none' }}
                    onChange={(e) => store.updateSymptomDef(s.id, { is_active: e.target.checked })}
                  />
                  <div className="grow">
                    <div className="t">{s.label}</div>
                    <div className="s">{SCALE_LABEL[s.scale]}</div>
                  </div>
                </label>
              ))}
            </div>
          )
        })}

        {newSymptom ? (
          <div className="stack" style={{ marginTop: 10 }}>
            <Field label="Name">
              <input
                type="text"
                autoFocus
                value={newSymptom.label}
                onChange={(e) => setNewSymptom({ ...newSymptom, label: e.target.value })}
              />
            </Field>
            <div className="grid-2 collapse">
              <Field label="Group">
                <select
                  value={newSymptom.category}
                  onChange={(e) =>
                    setNewSymptom({ ...newSymptom, category: e.target.value as Category })
                  }
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How you rate it">
                <select
                  value={newSymptom.scale}
                  onChange={(e) => setNewSymptom({ ...newSymptom, scale: e.target.value as Scale })}
                >
                  {(Object.keys(SCALE_LABEL) as Scale[]).map((s) => (
                    <option key={s} value={s}>
                      {SCALE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="row">
              <button
                className="btn primary sm"
                disabled={!newSymptom.label.trim()}
                onClick={async () => {
                  await store.addSymptomDef({
                    key: slug(newSymptom.label),
                    label: newSymptom.label.trim(),
                    category: newSymptom.category,
                    scale: newSymptom.scale,
                    is_active: true,
                    sort_order: 500,
                  })
                  setNewSymptom(null)
                }}
              >
                Add
              </button>
              <button className="btn ghost sm" onClick={() => setNewSymptom(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn sm"
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
            onClick={() => setNewSymptom({ label: '', category: 'systemic', scale: 'sev' })}
          >
            Add your own
          </button>
        )}
      </Card>

      <Card title="Parts" subtitle="The list you tap from on the daily log">
        {store.parts.map((p) => (
          <label key={p.id} className="list-item" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={p.is_active}
              style={{ width: 20, height: 20, minHeight: 0, flex: 'none' }}
              onChange={(e) => store.updatePart(p.id, { is_active: e.target.checked })}
            />
            <div className="grow">
              <div className="t">{p.name}</div>
              {p.role && <div className="s">{p.role}</div>}
            </div>
          </label>
        ))}
        <div className="row">
          <input
            type="text"
            value={newPart}
            placeholder="Name a part"
            onChange={(e) => setNewPart(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            className="btn sm"
            disabled={!newPart.trim()}
            onClick={async () => {
              await store.addPart(newPart.trim(), 'unsure')
              setNewPart('')
            }}
          >
            Add
          </button>
        </div>
      </Card>

      <Card title="Appearance">
        <div className="seg">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Your data" subtitle="It is yours, so take a copy whenever you want one">
        <div className="row">
          <button className="btn" onClick={() => downloadCSV(store)}>
            Download CSV
          </button>
          <button className="btn" onClick={() => downloadJSON(store)}>
            Download JSON
          </button>
        </div>
        <p className="tiny muted">
          CSV gives one row per day per symptom, which opens straight into a spreadsheet. JSON is the
          complete copy including medications, events, parts and notes.
        </p>
      </Card>

      <Card title="Account">
        {demo ? (
          <>
            <p className="small secondary">
              Demo mode, so there is no account. Reload without <code>?demo</code> in the address to
              connect your own database.
            </p>
            <button className="btn primary" onClick={() => (location.search = '')}>
              Set up my own
            </button>
          </>
        ) : (
        <>
        <p className="small secondary">Signed in as {email}</p>
        <div className="row">
          <button
            className="btn"
            onClick={async () => {
              await db().auth.signOut()
              location.reload()
            }}
          >
            Sign out
          </button>
          {!configIsFromEnv && (
            <button
              className="btn ghost danger"
              onClick={async () => {
                if (!confirm('This disconnects the app from your database on this device. Your data stays where it is. Continue?')) return
                await db().auth.signOut()
                clearConfig()
                resetClient()
                location.reload()
              }}
            >
              Disconnect database
            </button>
          )}
        </div>
        </>
        )}
      </Card>
    </>
  )
}

const SCALE_LABEL: Record<Scale, string> = {
  sev: '0 to 10',
  count: 'a count for the day',
  mins: 'minutes',
  bool: 'yes or no',
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'custom'
}

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function downloadCSV(store: ReturnType<typeof useStore>) {
  const byId = new Map(store.symptoms.map((s) => [s.id, s]))
  const head = ['date', 'symptom', 'value', 'scale', 'locations', 'took_med', 'sleep_hours', 'sleep_quality', 'energy', 'mood', 'self_energy', 'note']
  const logByDate = new Map(store.logs.map((l) => [l.log_date, l]))
  const lines = [head.join(',')]
  for (const e of store.entries.slice().sort((a, b) => a.log_date.localeCompare(b.log_date))) {
    const s = byId.get(e.symptom_id)
    const l = logByDate.get(e.log_date)
    lines.push(
      [
        e.log_date,
        q(s?.label ?? ''),
        String(e.value),
        s?.scale ?? '',
        q((e.locations ?? []).join(' ')),
        l?.took_med ?? '',
        l?.sleep_hours ?? '',
        l?.sleep_quality ?? '',
        l?.energy ?? '',
        l?.mood ?? '',
        l?.self_energy ?? '',
        q(l?.note ?? ''),
      ].join(','),
    )
  }
  download(`symptom-log-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv', lines.join('\n'))
}

function q(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadJSON(store: ReturnType<typeof useStore>) {
  const body = JSON.stringify(
    {
      exported: new Date().toISOString(),
      symptoms: store.symptoms,
      parts: store.parts,
      med_courses: store.courses,
      events: store.events,
      daily_logs: store.logs,
      symptom_entries: store.entries,
      part_entries: store.partEntries,
    },
    null,
    2,
  )
  download(`symptom-log-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', body)
}
