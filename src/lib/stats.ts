import { daysBetween, shiftISO, today, type ISODate } from './dates'
import {
  DRUG_LABEL,
  type DailyLog,
  type MedCourse,
  type Symptom,
  type SymptomEntry,
} from './types'

// ---------------------------------------------------------------
//  Periods: the spans of time we compare against each other
// ---------------------------------------------------------------

export interface Period {
  id: string
  label: string
  sublabel: string
  start: ISODate
  /** Inclusive. */
  end: ISODate
  /** Chart band colour slot, 0 means "no drug". */
  slot: number
}

/**
 * Turns the endocrine courses into comparable periods, and prepends a
 * "before" period if there is logged data from before the first course.
 * That baseline is the whole reason to start logging early.
 */
export function periodsFromCourses(
  courses: MedCourse[],
  earliestLog: ISODate | null,
): Period[] {
  const endocrine = courses
    .filter((c) => c.is_endocrine)
    .slice()
    .sort((a, b) => a.started_on.localeCompare(b.started_on))

  const out: Period[] = []

  if (endocrine.length && earliestLog) {
    const firstStart = endocrine[0].started_on
    if (daysBetween(earliestLog, firstStart) > 0) {
      out.push({
        id: 'baseline',
        label: 'Before endocrine therapy',
        sublabel: 'Your baseline',
        start: earliestLog,
        end: shiftISO(firstStart, -1),
        slot: 0,
      })
    }
  }

  for (const c of endocrine) {
    out.push({
      id: c.id,
      label: DRUG_LABEL[c.drug] ?? c.drug,
      sublabel: c.dose_mg ? `${c.dose_mg} mg ${c.schedule ?? 'daily'}` : (c.schedule ?? ''),
      start: c.started_on,
      end: c.ended_on ?? today(),
      slot: c.slot,
    })
  }

  if (!out.length && earliestLog) {
    out.push({
      id: 'all',
      label: 'All logged days',
      sublabel: 'No medication added yet',
      start: earliestLog,
      end: today(),
      slot: 0,
    })
  }

  return out
}

export function courseOnDate(courses: MedCourse[], date: ISODate): MedCourse | null {
  for (const c of courses) {
    if (!c.is_endocrine) continue
    if (daysBetween(c.started_on, date) < 0) continue
    if (c.ended_on && daysBetween(date, c.ended_on) < 0) continue
    return c
  }
  return null
}

export function inPeriod(p: Period, date: ISODate): boolean {
  return daysBetween(p.start, date) >= 0 && daysBetween(date, p.end) >= 0
}

// ---------------------------------------------------------------
//  Summary maths
// ---------------------------------------------------------------

export interface Summary {
  n: number
  mean: number
  median: number
  q1: number
  q3: number
  min: number
  max: number
}

export function summarize(values: number[]): Summary | null {
  const v = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b)
  if (!v.length) return null
  return {
    n: v.length,
    mean: v.reduce((s, x) => s + x, 0) / v.length,
    median: quantile(v, 0.5),
    q1: quantile(v, 0.25),
    q3: quantile(v, 0.75),
    min: v[0],
    max: v[v.length - 1],
  }
}

/** Linear-interpolated quantile on an already sorted array. */
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

// ---------------------------------------------------------------
//  Comparing two periods, symptom by symptom
// ---------------------------------------------------------------

export interface SymptomComparison {
  symptom: Symptom
  a: Summary | null
  b: Summary | null
  /** b minus a, on the raw scale. Positive means the value went up. */
  delta: number | null
  /** True when the change is in the unpleasant direction. */
  worse: boolean | null
  /**
   * Marks a change big enough and backed by enough days to be worth raising.
   * This is a readability aid on your own data, not a statistical test.
   */
  notable: boolean
}

const MIN_DAYS_FOR_NOTABLE = 10

export function compareSymptoms(
  symptoms: Symptom[],
  entries: SymptomEntry[],
  a: Period,
  b: Period,
): SymptomComparison[] {
  const byId = new Map<string, { a: number[]; b: number[] }>()
  for (const s of symptoms) byId.set(s.id, { a: [], b: [] })

  for (const e of entries) {
    const bucket = byId.get(e.symptom_id)
    if (!bucket) continue
    if (inPeriod(a, e.log_date)) bucket.a.push(Number(e.value))
    if (inPeriod(b, e.log_date)) bucket.b.push(Number(e.value))
  }

  return symptoms.map((s) => {
    const bucket = byId.get(s.id)!
    const sa = summarize(bucket.a)
    const sb = summarize(bucket.b)
    const delta = sa && sb ? sb.median - sa.median : null
    const worse =
      delta === null || delta === 0 ? null : s.higher_is_worse ? delta > 0 : delta < 0

    const threshold = notableThreshold(s)
    const notable =
      sa !== null &&
      sb !== null &&
      sa.n >= MIN_DAYS_FOR_NOTABLE &&
      sb.n >= MIN_DAYS_FOR_NOTABLE &&
      Math.abs(delta ?? 0) >= threshold

    return { symptom: s, a: sa, b: sb, delta, worse, notable }
  })
}

/** How much change matters depends on what the scale means. */
function notableThreshold(s: Symptom): number {
  switch (s.scale) {
    case 'sev':
      return 2 // 2 points on 0-10
    case 'count':
      return 2 // 2 more hot flashes a day
    case 'mins':
      return 15 // 15 more minutes of morning stiffness
    case 'bool':
      return 0.25
  }
}

// ---------------------------------------------------------------
//  Adherence
// ---------------------------------------------------------------

export interface Adherence {
  taken: number
  missed: number
  unanswered: number
  /** Of the days you answered, the share you took it. */
  pct: number | null
}

export function adherence(logs: DailyLog[], p: Period): Adherence {
  let taken = 0
  let missed = 0
  let unanswered = 0
  for (const l of logs) {
    if (!inPeriod(p, l.log_date)) continue
    if (l.took_med === 'yes') taken++
    else if (l.took_med === 'no') missed++
    else unanswered++
  }
  const answered = taken + missed
  return { taken, missed, unanswered, pct: answered ? (taken / answered) * 100 : null }
}

// ---------------------------------------------------------------
//  Series building for charts
// ---------------------------------------------------------------

export interface PointNullable {
  date: ISODate
  value: number | null
}

/** One value per day across the range, null where nothing was logged. */
export function seriesFor(
  symptomId: string,
  entries: SymptomEntry[],
  dates: ISODate[],
): PointNullable[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.symptom_id === symptomId) map.set(e.log_date, Number(e.value))
  }
  return dates.map((d) => ({ date: d, value: map.has(d) ? map.get(d)! : null }))
}

/**
 * Centred rolling median, skipping gaps. Daily symptom scores are spiky and a
 * raw line hides the trend, which is the thing you are actually looking for.
 */
export function smooth(points: PointNullable[], window = 7): PointNullable[] {
  const half = Math.floor(window / 2)
  return points.map((p, i) => {
    const slice: number[] = []
    for (let j = i - half; j <= i + half; j++) {
      const v = points[j]?.value
      if (v !== null && v !== undefined) slice.push(v)
    }
    if (slice.length < Math.max(2, Math.ceil(window / 3))) {
      return { date: p.date, value: null }
    }
    slice.sort((a, b) => a - b)
    return { date: p.date, value: quantile(slice, 0.5) }
  })
}

/** Formats a value with the unit its scale implies. */
export function formatValue(v: number, scale: Symptom['scale']): string {
  const r = Math.round(v * 10) / 10
  switch (scale) {
    case 'sev':
      return `${r}`
    case 'count':
      return `${r}`
    case 'mins':
      return `${Math.round(v)} min`
    case 'bool':
      return v >= 0.5 ? 'yes' : 'no'
  }
}

export type Band = 'none' | 'mild' | 'moderate' | 'severe'

/**
 * Turns a raw value into the word a person would use for it. Used for the
 * severity pill, which always shows the word beside the colour so the colour
 * is never carrying the meaning on its own.
 *
 * Returns null where a band would be meaningless, such as libido, which is
 * rated with higher being better.
 */
export function severityBand(value: number, s: Symptom): Band | null {
  if (!s.higher_is_worse) return null
  const cuts: Record<Symptom['scale'], [number, number, number]> = {
    sev: [0, 3, 6],
    count: [0, 2, 5],
    mins: [0, 15, 45],
    bool: [0, 0, 0],
  }
  const [none, mild, moderate] = cuts[s.scale]
  if (value <= none) return 'none'
  if (value <= mild) return 'mild'
  if (value <= moderate) return 'moderate'
  return 'severe'
}

export function scaleMax(scale: Symptom['scale'], observedMax: number): number {
  switch (scale) {
    case 'sev':
      return 10
    case 'count':
      return Math.max(5, Math.ceil(observedMax / 5) * 5)
    case 'mins':
      return Math.max(30, Math.ceil(observedMax / 15) * 15)
    case 'bool':
      return 1
  }
}
