import { useState } from 'react'
import { db } from '../lib/supabase'
import { Card, Field } from '../components/ui'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const sb = db()
      if (mode === 'up') {
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          setMsg('Check your email for a confirmation link, then come back and sign in.')
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="centered">
      <form className="stack" style={{ maxWidth: 400, width: '100%' }} onSubmit={submit}>
        <div>
          <h1>Symptom Log</h1>
          <p className="secondary small" style={{ marginTop: 6 }}>
            {mode === 'in' ? 'Sign in to your own database.' : 'Make an account on your own database.'}
          </p>
        </div>

        <Card>
          <Field label="Email">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" hint={mode === 'up' ? 'At least 6 characters.' : undefined}>
            <input
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {err && <div className="banner error small">{err}</div>}
          {msg && <div className="banner small">{msg}</div>}

          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in')
              setErr(null)
              setMsg(null)
            }}
          >
            {mode === 'in' ? 'No account yet' : 'I already have an account'}
          </button>
        </Card>
      </form>
    </div>
  )
}
