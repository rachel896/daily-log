import { useEffect, useState, type ReactElement } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getClient } from './lib/supabase'
import { loadConfig } from './lib/config'
import { StoreProvider, useStore } from './lib/store'
import { DemoProvider, demoRequested } from './lib/demo'
import Setup from './screens/Setup'
import Auth from './screens/Auth'
import Today from './screens/Today'
import Trends from './screens/Trends'
import Compare from './screens/Compare'
import Meds from './screens/Meds'
import Report from './screens/Report'
import Settings from './screens/Settings'

type Tab = 'today' | 'trends' | 'compare' | 'meds' | 'report' | 'settings'
type Theme = 'system' | 'light' | 'dark'

const TABS: { key: Tab; label: string; icon: ReactElement }[] = [
  { key: 'today', label: 'Log', icon: icon('M4 6h16M4 12h16M4 18h9') },
  { key: 'trends', label: 'Trends', icon: icon('M4 17l5-6 4 4 7-8') },
  { key: 'compare', label: 'Compare', icon: icon('M6 8h12M6 16h12M9 5v6M15 13v6') },
  { key: 'meds', label: 'Meds', icon: icon('M8 4h8v4l-3 3v9H11v-9L8 8z') },
  { key: 'report', label: 'Report', icon: icon('M6 3h9l3 3v15H6zM9 12h6M9 16h6') },
  { key: 'settings', label: 'Settings', icon: icon('M12 9a3 3 0 100 6 3 3 0 000-6M4 12h2m12 0h2M12 4v2m0 12v2') },
]

function icon(d: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('symptomlog.theme') as Theme) || 'system',
  )
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const hasConfig = Boolean(loadConfig())
  const demo = demoRequested()

  useEffect(() => {
    localStorage.setItem('symptomlog.theme', theme)
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const sb = getClient()
    if (!sb) return setReady(true)
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (demo) {
    return (
      <DemoProvider>
        <Shell email="demo" theme={theme} setTheme={setTheme} demo />
      </DemoProvider>
    )
  }
  if (!hasConfig) return <Setup />
  if (!ready) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    )
  }
  if (!session) return <Auth />

  return (
    <StoreProvider userId={session.user.id}>
      <Shell
        email={session.user.email ?? ''}
        theme={theme}
        setTheme={setTheme}
      />
    </StoreProvider>
  )
}

function Shell({
  email,
  theme,
  setTheme,
  demo = false,
}: {
  email: string
  theme: Theme
  setTheme: (t: Theme) => void
  demo?: boolean
}) {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('today')

  return (
    <div className="app">
      <header className="topbar">
        <span className="title">Symptom Log</span>
        {demo && (
          <span className="pill flat" style={{ borderColor: 'var(--axis)' }}>
            demo data
          </span>
        )}
        <span className="spacer" />
        {store.loading && <div className="spinner" />}
      </header>

      <nav className="nav no-print" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              window.scrollTo({ top: 0 })
            }}
            aria-current={tab === t.key ? 'page' : undefined}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="screen">
        {demo && (
          <div className="banner no-print">
            <div>
              <strong>This is made up data.</strong>
              <div className="small" style={{ marginTop: 2 }}>
                150 days of it, with a switch from anastrozole to letrozole partway through, so every
                screen has something to show. Nothing here is saved. Reload the page without{' '}
                <code>?demo</code> to set up your own.
              </div>
            </div>
          </div>
        )}
        {store.error && (
          <div className="banner error">
            <div>
              <strong>Something went wrong.</strong>
              <div className="small" style={{ marginTop: 2 }}>{store.error}</div>
            </div>
          </div>
        )}

        {store.loading && !store.symptoms.length ? (
          <div className="empty">Loading your log…</div>
        ) : (
          <>
            {tab === 'today' && <Today />}
            {tab === 'trends' && <Trends />}
            {tab === 'compare' && <Compare />}
            {tab === 'meds' && <Meds />}
            {tab === 'report' && <Report />}
            {tab === 'settings' && (
              <Settings email={email} theme={theme} setTheme={setTheme} demo={demo} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
