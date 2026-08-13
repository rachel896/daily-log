import { useState } from 'react'
import schemaSql from '../../supabase/schema.sql?raw'
import { useStore } from '../lib/store'
import { Card } from '../components/ui'
import { db } from '../lib/supabase'

/**
 * Shown when the connection and the login both work but the tables are not
 * there. That is the normal state between creating a project and running the
 * schema, so it gets an instruction rather than an error message.
 */
export default function SchemaSetup() {
  const store = useStore()
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)

  return (
    <div className="centered">
      <div className="stack" style={{ maxWidth: 560, width: '100%' }}>
        <div>
          <h1>One step left</h1>
          <p className="secondary small" style={{ marginTop: 6 }}>
            You are signed in and the app can reach your project. The tables have not been created
            in it yet, so there is nothing to write to.
          </p>
        </div>

        <Card title="Create the tables">
          <ol className="small secondary" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Open your project on supabase.com</li>
            <li>
              Go to <strong>SQL Editor</strong> in the left sidebar, then <strong>New query</strong>
            </li>
            <li>Paste the SQL below and press Run</li>
            <li>Come back here and check again</li>
          </ol>

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

          <p className="tiny muted">
            It creates the tables and switches on row level security, so only your own signed in
            account can read its rows. Running it twice is safe.
          </p>
        </Card>

        <Card title="Already ran it?">
          <p className="small secondary">
            If you ran the SQL and still land here, check that you ran it in the same project whose
            URL you pasted into this app. It is easy to have two projects open.
          </p>
          <div className="row">
            <button
              className="btn primary"
              disabled={checking}
              onClick={async () => {
                setChecking(true)
                await store.refresh()
                location.reload()
              }}
            >
              {checking ? 'Checking…' : 'Check again'}
            </button>
            <button
              className="btn ghost"
              onClick={async () => {
                await db().auth.signOut()
                location.reload()
              }}
            >
              Sign out
            </button>
          </div>
          {store.error && <div className="banner error small">{store.error}</div>}
        </Card>
      </div>
    </div>
  )
}
