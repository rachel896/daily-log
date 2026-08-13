import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Icon, type IconName } from './components/icons'
import { getClient } from './lib/supabase'
import { loadConfig } from './lib/config'
import { StoreProvider, useStore } from './lib/store'
import { DemoProvider, demoRequested } from './lib/demo'
import Setup from './screens/Setup'
import SchemaSetup from './screens/SchemaSetup'
import Auth from './screens/Auth'
import Today from './screens/Today'
import Trends from './screens/Trends'
import Compare from './screens/Compare'
import Meds from './screens/Meds'
import Report from './screens/Report'
import Settings from './screens/Settings'

type Tab = 'today' | 'trends' | 'compare' | 'meds' | 'report' | 'settings'
type Theme = 'system' | 'light' | 'dark'

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'today', label: 'Log', icon: 'log' },
  { key: 'trends', label: 'Trends', icon: 'trends' },
  { key: 'compare', label: 'Compare', icon: 'compare' },
  { key: 'meds', label: 'Meds', icon: 'meds' },
  { key: 'report', label: 'Report', icon: 'report' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

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

  // Nothing else on the screen is usable until the tables exist.
  if (store.schemaMissing) return <SchemaSetup />

  return (
    <div className="app">
      <header className="topbar">
        {/* Same mark as the home-screen icon, so the two read as one thing. */}
        <span className="mark">
          <Icon name="trends" />
        </span>
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
            <Icon name={t.icon} />
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
