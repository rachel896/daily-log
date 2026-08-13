import { useMemo, useState, type ReactNode } from 'react'
import { Ctx, type StoreValue } from './store'
import { SEED_PARTS, SEED_SYMPTOMS } from './catalog'
import { dateRange, shiftISO, today } from './dates'
import type {
  DailyLog,
  MedCourse,
  Part,
  PartEntry,
  Symptom,
  SymptomEntry,
  TrackedEvent,
} from './types'

/**
 * Demo mode. Everything lives in memory and nothing is written anywhere.
 * It exists so the app can be looked at properly before a database is set up,
 * and the shape of the fake data is the shape the real screens are built for:
 * a stretch of baseline, one aromatase inhibitor, then a switch to another.
 */

const DAYS = 150
const SWITCH_1 = 45 // day the first AI starts
const SWITCH_2 = 105 // day it changes to the second

/** Deterministic noise, so nothing jumps around between renders. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function buildDemo() {
  const end = today()
  const start = shiftISO(end, -(DAYS - 1))
  const dates = dateRange(start, end)
  const r = rng(20260812)

  const symptoms: Symptom[] = SEED_SYMPTOMS.map((s, i) => ({
    id: `sym-${s.key}`,
    user_id: 'demo',
    key: s.key,
    label: s.label,
    category: s.category,
    scale: s.scale,
    higher_is_worse: s.higher_is_worse ?? true,
    tracks_location: s.tracks_location ?? false,
    is_active: !s.inactive,
    sort_order: i,
  }))

  const parts: Part[] = SEED_PARTS.map((p, i) => ({
    id: `part-${i}`,
    user_id: 'demo',
    name: p.name,
    role: p.role,
    note: null,
    is_active: true,
    sort_order: i,
  }))

  const courses: MedCourse[] = [
    {
      id: 'course-1',
      user_id: 'demo',
      drug: 'anastrozole',
      brand: null,
      dose_mg: 1,
      schedule: 'daily',
      is_endocrine: true,
      started_on: dates[SWITCH_1],
      ended_on: dates[SWITCH_2 - 1],
      stop_reason: 'joint pain',
      note: null,
      slot: 1,
    },
    {
      id: 'course-2',
      user_id: 'demo',
      drug: 'letrozole',
      brand: null,
      dose_mg: 2.5,
      schedule: 'daily',
      is_endocrine: true,
      started_on: dates[SWITCH_2],
      ended_on: null,
      stop_reason: null,
      note: null,
      slot: 2,
    },
  ]

  const events: TrackedEvent[] = [
    { id: 'ev-1', user_id: 'demo', occurred_on: dates[SWITCH_1], kind: 'dose_change', title: 'Started anastrozole', note: null },
    { id: 'ev-2', user_id: 'demo', occurred_on: dates[SWITCH_2 - 3], kind: 'appointment', title: 'Oncology follow up', note: null },
    { id: 'ev-3', user_id: 'demo', occurred_on: dates[SWITCH_2], kind: 'dose_change', title: 'Switched to letrozole', note: null },
    { id: 'ev-4', user_id: 'demo', occurred_on: dates[SWITCH_2 + 25], kind: 'life', title: 'Started strength training', note: null },
  ]

  // Per-symptom shape: [baseline, on drug 1, on drug 2]
  const profile: Record<string, [number, number, number]> = {
    joint_pain: [1.5, 6.2, 4.4],
    morning_stiffness: [4, 38, 22],
    muscle_ache: [1.8, 4.4, 3.6],
    hot_flashes: [1.5, 6.5, 5.8],
    night_sweats: [2, 5.4, 4.8],
    fatigue: [4.5, 5.6, 4.9],
    insomnia: [3.5, 5.4, 4.6],
    headache: [1.6, 2.4, 2.1],
    brain_fog: [3.4, 4.6, 4.1],
    neuropathy: [3.2, 3.0, 2.8], // left over from taxol, deliberately flat
    vaginal_dryness: [1.2, 5.2, 5.0],
    anxiety: [4.2, 4.8, 4.2],
    low_mood: [3.6, 4.4, 3.8],
    irritability: [3.0, 4.6, 3.9],
    grief: [4.0, 3.8, 3.4],
  }

  const phaseOf = (i: number) => (i < SWITCH_1 ? 0 : i < SWITCH_2 ? 1 : 2)

  const entries: SymptomEntry[] = []
  const logs: DailyLog[] = []
  const partEntries: PartEntry[] = []

  dates.forEach((d, i) => {
    // A realistic log has holes in it.
    if (r() < 0.12) return

    const phase = phaseOf(i)
    // Side effects ramp in over about three weeks rather than landing at once.
    const sinceStart = phase === 1 ? i - SWITCH_1 : phase === 2 ? i - SWITCH_2 : 0
    const ramp = phase === 0 ? 1 : Math.min(1, 0.35 + sinceStart / 21)

    for (const s of symptoms) {
      if (!s.is_active) continue
      const p = profile[s.key]
      if (!p) continue
      const base = p[0]
      const target = p[phase]
      const level = base + (target - base) * ramp
      const noise = (r() - 0.5) * (s.scale === 'mins' ? 18 : s.scale === 'count' ? 3 : 2.6)
      let v = level + noise
      v = s.scale === 'mins' ? Math.max(0, Math.round(v / 5) * 5) : Math.max(0, Math.round(v))
      if (s.scale === 'sev') v = Math.min(10, v)
      entries.push({
        log_date: d,
        symptom_id: s.id,
        value: v,
        locations:
          s.key === 'joint_pain' && phase > 0
            ? ['Hands', 'Wrists', ...(r() < 0.4 ? ['Knees'] : [])]
            : null,
        note: null,
      })
    }

    const took = phase === 0 ? null : r() < 0.06 ? 'no' : 'yes'
    logs.push({
      log_date: d,
      took_med: took as DailyLog['took_med'],
      med_time: took === 'yes' ? '21:30' : null,
      sleep_hours: Math.round((6.4 + (r() - 0.5) * 2.6) * 2) / 2,
      sleep_quality: Math.max(0, Math.min(10, Math.round(6 - phase * 0.7 + (r() - 0.5) * 3))),
      energy: Math.max(0, Math.min(10, Math.round(5.4 - phase * 0.5 + (r() - 0.5) * 3))),
      mood: Math.max(0, Math.min(10, Math.round(5.6 - phase * 0.4 + (r() - 0.5) * 3.4))),
      self_energy: Math.max(0, Math.min(10, Math.round(5.5 + (r() - 0.5) * 3.4))),
      note:
        i === SWITCH_1 + 24
          ? 'Hands were bad enough this morning that I could not open the coffee jar. Want to raise this.'
          : i === SWITCH_2 + 12
            ? 'Stiffness is noticeably shorter on this one. Still there, but I am out of bed faster.'
            : r() < 0.07
              ? 'Rough one.'
              : null,
    })

    for (const part of parts) {
      if (r() < 0.22) {
        partEntries.push({
          log_date: d,
          part_id: part.id,
          intensity: Math.max(0, Math.min(10, Math.round(4 + (r() - 0.5) * 5))),
          note: null,
        })
      }
    }
  })

  return { symptoms, parts, courses, events, logs, entries, partEntries }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const base = useMemo(buildDemo, [])
  const [data, setData] = useState(base)

  const value = useMemo<StoreValue>(() => {
    const noop = async () => {}
    return {
      ...data,
      loading: false,
      error: null,
      schemaMissing: false,
      refresh: noop,

      saveLog: async (patch) => {
        setData((d) => {
          const i = d.logs.findIndex((l) => l.log_date === patch.log_date)
          const logs = d.logs.slice()
          if (i === -1)
            logs.push({
              took_med: null,
              med_time: null,
              sleep_hours: null,
              sleep_quality: null,
              energy: null,
              mood: null,
              self_energy: null,
              note: null,
              ...patch,
            })
          else logs[i] = { ...logs[i], ...patch }
          return { ...d, logs }
        })
      },

      saveSymptom: async (log_date, symptom_id, value, locations = null, note = null) => {
        setData((d) => {
          const i = d.entries.findIndex(
            (e) => e.log_date === log_date && e.symptom_id === symptom_id,
          )
          const entries = d.entries.slice()
          const row = { log_date, symptom_id, value, locations, note }
          if (i === -1) entries.push(row)
          else entries[i] = row
          return { ...d, entries }
        })
      },

      clearSymptom: async (log_date, symptom_id) => {
        setData((d) => ({
          ...d,
          entries: d.entries.filter(
            (e) => !(e.log_date === log_date && e.symptom_id === symptom_id),
          ),
        }))
      },

      savePart: async (log_date, part_id, intensity, note = null) => {
        setData((d) => {
          const i = d.partEntries.findIndex(
            (e) => e.log_date === log_date && e.part_id === part_id,
          )
          const partEntries = d.partEntries.slice()
          const row = { log_date, part_id, intensity, note }
          if (i === -1) partEntries.push(row)
          else partEntries[i] = row
          return { ...d, partEntries }
        })
      },

      clearPart: async (log_date, part_id) => {
        setData((d) => ({
          ...d,
          partEntries: d.partEntries.filter(
            (e) => !(e.log_date === log_date && e.part_id === part_id),
          ),
        }))
      },

      saveCourse: async (c) => {
        setData((d) => {
          const courses = d.courses.slice()
          const i = courses.findIndex((x) => x.id === c.id)
          if (i === -1)
            courses.push({ ...(c as MedCourse), id: c.id ?? `course-${courses.length + 1}` })
          else courses[i] = { ...courses[i], ...c }
          return { ...d, courses }
        })
      },
      deleteCourse: async (id) => {
        setData((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== id) }))
      },
      saveEvent: async (e) => {
        setData((d) => {
          const events = d.events.slice()
          const i = events.findIndex((x) => x.id === e.id)
          if (i === -1) events.push({ ...(e as TrackedEvent), id: e.id ?? `ev-${events.length + 1}` })
          else events[i] = { ...events[i], ...e }
          return { ...d, events }
        })
      },
      deleteEvent: async (id) => {
        setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) }))
      },
      updateSymptomDef: async (id, patch) => {
        setData((d) => ({
          ...d,
          symptoms: d.symptoms.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }))
      },
      addSymptomDef: async (s) => {
        setData((d) => ({
          ...d,
          symptoms: [
            ...d.symptoms,
            { ...(s as Symptom), id: `sym-custom-${d.symptoms.length}`, user_id: 'demo' },
          ],
        }))
      },
      updatePart: async (id, patch) => {
        setData((d) => ({
          ...d,
          parts: d.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },
      addPart: async (name, role) => {
        setData((d) => ({
          ...d,
          parts: [
            ...d.parts,
            {
              id: `part-${d.parts.length}`,
              user_id: 'demo',
              name,
              role,
              note: null,
              is_active: true,
              sort_order: d.parts.length,
            },
          ],
        }))
      },
    }
  }, [data])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function demoRequested(): boolean {
  if (typeof location === 'undefined') return false
  return new URLSearchParams(location.search).has('demo')
}
