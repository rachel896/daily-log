import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadConfig } from './config'

let client: SupabaseClient | null = null

export function getClient(): SupabaseClient | null {
  if (client) return client
  const cfg = loadConfig()
  if (!cfg) return null
  client = createClient(cfg.url.replace(/\/$/, ''), cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}

/** Use inside code that already knows configuration exists. */
export function db(): SupabaseClient {
  const c = getClient()
  if (!c) throw new Error('Supabase is not configured yet.')
  return c
}

export function resetClient() {
  client = null
}
