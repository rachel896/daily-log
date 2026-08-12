import { useState } from 'react'
import schemaSql from '../../supabase/schema.sql?raw'
import { saveConfig, validateConfig } from '../lib/config'
import { Card, Field } from '../components/ui'

/**
 * First run. Connects the app to a Supabase project.
 * The anon key is a publishable browser key, so it lives in localStorage
 * rather than being baked into the build.
 */
export default function Setup() {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = () => {
    const problem = validateConfig(url, key)
    if (problem) return setErr(problem)
    saveConfig({ url: url.trim().replace(/\/$/, ''), anonKey: key.trim() })
    location.reload()
  }

  return (
    <div className="centered">
      <div className="stack" style={{ maxWidth: 560, width: '100%' }}>
        <div>
          <h1>Symptom Log</h1>
          <p className="secondary small" style={{ marginTop: 6 }}>
            One time setup. This connects the app to your own database, so the data belongs to you
            and nobody else has a copy.
          </p>
          <button
            className="btn sm"
            style={{ marginTop: 12 }}
            onClick={() => (location.search = '?demo')}
          >
            Look around with made up data first
          </button>
        </div>

        <Card title="1. Make a project">
          <p className="small secondary">
            Go to supabase.com, sign in, and create a new project. The free tier is plenty. Pick a
            region near you. It takes about two minutes to spin up.
          </p>
        </Card>

        <Card title="2. Create the tables">
          <p className="small secondary">
            In your project, open the SQL Editor, paste this in, and run it. It makes the tables and
            locks every one of them so only your own signed in account can read its rows.
          </p>
          <button
            className="btn"
            onClick={async () => {
              await navigator.clipboard.writeText(schemaSql)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied' : 'Copy the SQL'}
          </button>
        </Card>

        <Card title="3. Connect it">
          <p className="small secondary">
            In your project settings, under API, copy the Project URL and the anon public key. Not
            the service_role key, that one bypasses every rule.
          </p>
          <Field label="Project URL">
            <input
              type="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="https://abcdefghijkl.supabase.co"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setErr(null)
              }}
            />
          </Field>
          <Field label="Anon public key">
            <textarea
              spellCheck={false}
              placeholder="eyJhbGciOi…"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setErr(null)
              }}
              style={{ minHeight: 64, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            />
          </Field>
          {err && <div className="banner error small">{err}</div>}
          <button className="btn primary" onClick={submit} disabled={!url || !key}>
            Connect
          </button>
        </Card>
      </div>
    </div>
  )
}
