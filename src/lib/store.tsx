import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { db } from './supabase'
import { SEED_PARTS, SEED_SYMPTOMS } from './catalog'
import type {
  DailyLog,
  MedCourse,
  Part,
  PartEntry,
  Symptom,
  SymptomEntry,
  TrackedEvent,
} from './types'

const BIG = 49_999 // Supabase caps unbounded selects at 1000 rows

interface Data {
  symptoms: Symptom[]
  parts: Part[]
  courses: MedCourse[]
  events: TrackedEvent[]
  logs: DailyLog[]
  entries: SymptomEntry[]
  partEntries: PartEntry[]
}

const EMPTY: Data = {
  symptoms: [],
  parts: [],
  courses: [],
  events: [],
  logs: [],
  entries: [],
  partEntries: [],
}

export interface StoreValue extends Data {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>

  saveLog: (patch: Partial<DailyLog> & { log_date: string }) => Promise<void>
  saveSymptom: (log_date: string, symptom_id: string, value: number, locations?: string[] | null, note?: string | null) => Promise<void>
  clearSymptom: (log_date: string, symptom_id: string) => Promise<void>
  savePart: (log_date: string, part_id: string, intensity: number, note?: string | null) => Promise<void>
  clearPart: (log_date: string, part_id: string) => Promise<void>

  saveCourse: (c: Partial<MedCourse>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
  saveEvent: (e: Partial<TrackedEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  updateSymptomDef: (id: string, patch: Partial<Symptom>) => Promise<void>
  addSymptomDef: (s: Partial<Symptom>) => Promise<void>
  updatePart: (id: string, patch: Partial<Part>) => Promise<void>
  addPart: (name: string, role: string) => Promise<void>
}

export const Ctx = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore used outside StoreProvider')
  return v
}

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seeded = useRef(false)

  const load = useCallback(async () => {
    const sb = db()
    setError(null)
    try {
      const [symptoms, parts, courses, events, logs, entries, partEntries] =
        await Promise.all([
          sb.from('symptoms').select('*').order('sort_order').range(0, BIG),
          sb.from('parts').select('*').order('sort_order').range(0, BIG),
          sb.from('med_courses').select('*').order('started_on').range(0, BIG),
          sb.from('events').select('*').order('occurred_on').range(0, BIG),
          sb.from('daily_logs').select('*').order('log_date').range(0, BIG),
          sb.from('symptom_entries').select('*').order('log_date').range(0, BIG),
          sb.from('part_entries').select('*').order('log_date').range(0, BIG),
        ])

      const first = [symptoms, parts, courses, events, logs, entries, partEntries].find(
        (r) => r.error,
      )
      if (first?.error) throw first.error

      // First run on a fresh account: lay down the starting catalog.
      if (!symptoms.data?.length && !seeded.current) {
        seeded.current = true
        await seed(userId)
        return load()
      }

      setData({
        symptoms: (symptoms.data ?? []) as Symptom[],
        parts: (parts.data ?? []) as Part[],
        courses: (courses.data ?? []) as MedCourse[],
        events: (events.data ?? []) as TrackedEvent[],
        logs: (logs.data ?? []) as DailyLog[],
        entries: (entries.data ?? []) as SymptomEntry[],
        partEntries: (partEntries.data ?? []) as PartEntry[],
      })
    } catch (e) {
      setError(describe(e))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  // -------- mutations --------

  const saveLog: StoreValue['saveLog'] = async (patch) => {
    const sb = db()
    const existing = data.logs.find((l) => l.log_date === patch.log_date)
    const row = { ...(existing ?? { log_date: patch.log_date }), ...patch, user_id: userId }
    delete (row as { id?: string }).id
    const { data: out, error: err } = await sb
      .from('daily_logs')
      .upsert(row, { onConflict: 'user_id,log_date' })
      .select()
      .single()
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      logs: replaceBy(d.logs, out as DailyLog, (x) => x.log_date === patch.log_date),
    }))
  }

  const saveSymptom: StoreValue['saveSymptom'] = async (
    log_date,
    symptom_id,
    value,
    locations = null,
    note = null,
  ) => {
    const sb = db()
    const { data: out, error: err } = await sb
      .from('symptom_entries')
      .upsert(
        { user_id: userId, log_date, symptom_id, value, locations, note },
        { onConflict: 'user_id,log_date,symptom_id' },
      )
      .select()
      .single()
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      entries: replaceBy(
        d.entries,
        out as SymptomEntry,
        (x) => x.log_date === log_date && x.symptom_id === symptom_id,
      ),
    }))
  }

  const clearSymptom: StoreValue['clearSymptom'] = async (log_date, symptom_id) => {
    const sb = db()
    const { error: err } = await sb
      .from('symptom_entries')
      .delete()
      .match({ user_id: userId, log_date, symptom_id })
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      entries: d.entries.filter(
        (x) => !(x.log_date === log_date && x.symptom_id === symptom_id),
      ),
    }))
  }

  const savePart: StoreValue['savePart'] = async (log_date, part_id, intensity, note = null) => {
    const sb = db()
    const { data: out, error: err } = await sb
      .from('part_entries')
      .upsert(
        { user_id: userId, log_date, part_id, intensity, note },
        { onConflict: 'user_id,log_date,part_id' },
      )
      .select()
      .single()
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      partEntries: replaceBy(
        d.partEntries,
        out as PartEntry,
        (x) => x.log_date === log_date && x.part_id === part_id,
      ),
    }))
  }

  const clearPart: StoreValue['clearPart'] = async (log_date, part_id) => {
    const sb = db()
    const { error: err } = await sb
      .from('part_entries')
      .delete()
      .match({ user_id: userId, log_date, part_id })
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      partEntries: d.partEntries.filter(
        (x) => !(x.log_date === log_date && x.part_id === part_id),
      ),
    }))
  }

  const saveCourse: StoreValue['saveCourse'] = async (c) => {
    const sb = db()
    const { error: err } = await sb
      .from('med_courses')
      .upsert({ ...c, user_id: userId })
    if (err) return setError(describe(err))
    await load()
  }

  const deleteCourse: StoreValue['deleteCourse'] = async (id) => {
    const sb = db()
    const { error: err } = await sb.from('med_courses').delete().eq('id', id)
    if (err) return setError(describe(err))
    setData((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== id) }))
  }

  const saveEvent: StoreValue['saveEvent'] = async (e) => {
    const sb = db()
    const { error: err } = await sb.from('events').upsert({ ...e, user_id: userId })
    if (err) return setError(describe(err))
    await load()
  }

  const deleteEvent: StoreValue['deleteEvent'] = async (id) => {
    const sb = db()
    const { error: err } = await sb.from('events').delete().eq('id', id)
    if (err) return setError(describe(err))
    setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }))
  }

  const updateSymptomDef: StoreValue['updateSymptomDef'] = async (id, patch) => {
    const sb = db()
    const { error: err } = await sb.from('symptoms').update(patch).eq('id', id)
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      symptoms: d.symptoms.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  const addSymptomDef: StoreValue['addSymptomDef'] = async (s) => {
    const sb = db()
    const { error: err } = await sb.from('symptoms').insert({ ...s, user_id: userId })
    if (err) return setError(describe(err))
    await load()
  }

  const updatePart: StoreValue['updatePart'] = async (id, patch) => {
    const sb = db()
    const { error: err } = await sb.from('parts').update(patch).eq('id', id)
    if (err) return setError(describe(err))
    setData((d) => ({
      ...d,
      parts: d.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }

  const addPart: StoreValue['addPart'] = async (name, role) => {
    const sb = db()
    const { error: err } = await sb
      .from('parts')
      .insert({ user_id: userId, name, role, sort_order: 100 })
    if (err) return setError(describe(err))
    await load()
  }

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      loading,
      error,
      refresh: load,
      saveLog,
      saveSymptom,
      clearSymptom,
      savePart,
      clearPart,
      saveCourse,
      deleteCourse,
      saveEvent,
      deleteEvent,
      updateSymptomDef,
      addSymptomDef,
      updatePart,
      addPart,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, loading, error, load],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// -------- helpers --------

function replaceBy<T>(list: T[], row: T, match: (x: T) => boolean): T[] {
  const i = list.findIndex(match)
  if (i === -1) return [...list, row]
  const copy = list.slice()
  copy[i] = row
  return copy
}

async function seed(userId: string) {
  const sb = db()
  await sb.from('symptoms').insert(
    SEED_SYMPTOMS.map((s, i) => ({
      user_id: userId,
      key: s.key,
      label: s.label,
      category: s.category,
      scale: s.scale,
      higher_is_worse: s.higher_is_worse ?? true,
      tracks_location: s.tracks_location ?? false,
      is_active: !s.inactive,
      sort_order: i,
    })),
  )
  await sb.from('parts').insert(
    SEED_PARTS.map((p, i) => ({
      user_id: userId,
      name: p.name,
      role: p.role,
      sort_order: i,
    })),
  )
}

function describe(e: unknown): string {
  if (typeof e === 'object' && e && 'message' in e) {
    const msg = String((e as { message: unknown }).message)
    if (msg.includes('relation') && msg.includes('does not exist')) {
      return 'The database tables are not set up yet. Run schema.sql in the Supabase SQL editor, then reload.'
    }
    return msg
  }
  return String(e)
}
