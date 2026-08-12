/**
 * Where the Supabase connection details come from.
 *
 * 1. Build-time env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), if set.
 * 2. Otherwise whatever was entered on the setup screen, kept in localStorage.
 *
 * The anon key is a public, publishable key. It is designed to ship inside a
 * browser bundle. Every table is locked down with row level security, so the
 * key on its own reads nothing. Never paste the service_role key here.
 */

const LS_KEY = 'symptomlog.supabase'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function loadConfig(): SupabaseConfig | null {
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>
    if (!parsed.url || !parsed.anonKey) return null
    return { url: parsed.url, anonKey: parsed.anonKey }
  } catch {
    return null
  }
}

export function saveConfig(cfg: SupabaseConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
}

export const configIsFromEnv = Boolean(envUrl && envKey)

/** Catches the two mistakes people actually make on the setup screen. */
export function validateConfig(url: string, key: string): string | null {
  const u = url.trim()
  const k = key.trim()
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(u)) {
    return 'That does not look like a project URL. It should look like https://abcdefgh.supabase.co'
  }
  if (k.length < 30) return 'That key looks too short. Copy the whole thing.'
  if (k.includes('service_role') || /"role"\s*:\s*"service_role"/.test(atobSafe(k))) {
    return 'That is the service_role key. It bypasses every security rule. Use the anon or publishable key instead.'
  }
  return null
}

function atobSafe(jwt: string): string {
  try {
    const body = jwt.split('.')[1]
    if (!body) return ''
    return atob(body.replace(/-/g, '+').replace(/_/g, '/'))
  } catch {
    return ''
  }
}
