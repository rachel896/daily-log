import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from 'date-fns'

/** Everything in this app moves dates around as 'YYYY-MM-DD' local strings. */
export type ISODate = string

export function toISO(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

export function fromISO(s: ISODate): Date {
  return startOfDay(parseISO(s))
}

export function today(): ISODate {
  return toISO(new Date())
}

export function shiftISO(s: ISODate, days: number): ISODate {
  return toISO(addDays(fromISO(s), days))
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISO(b), fromISO(a))
}

/** Inclusive list of dates from a to b. */
export function dateRange(a: ISODate, b: ISODate): ISODate[] {
  const n = daysBetween(a, b)
  if (n < 0) return []
  const out: ISODate[] = []
  for (let i = 0; i <= n; i++) out.push(shiftISO(a, i))
  return out
}

export function prettyDate(s: ISODate): string {
  return format(fromISO(s), 'EEE d MMM yyyy')
}

export function shortDate(s: ISODate): string {
  return format(fromISO(s), 'd MMM')
}

export function monthLabel(s: ISODate): string {
  return format(fromISO(s), 'MMM yyyy')
}

export function relativeDay(s: ISODate): string {
  const diff = daysBetween(s, today())
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  return prettyDate(s)
}

export function clampISO(s: ISODate, min: ISODate, max: ISODate): ISODate {
  if (daysBetween(min, s) < 0) return min
  if (daysBetween(s, max) < 0) return max
  return s
}
