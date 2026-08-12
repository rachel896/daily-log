export type Scale = 'sev' | 'count' | 'mins' | 'bool'

export type Category =
  | 'musculoskeletal'
  | 'vasomotor'
  | 'genitourinary'
  | 'neuro'
  | 'systemic'
  | 'emotional'

export const CATEGORY_LABEL: Record<Category, string> = {
  musculoskeletal: 'Joints and muscles',
  vasomotor: 'Hot flashes and sweats',
  genitourinary: 'Vaginal and urinary',
  neuro: 'Nerves and thinking',
  systemic: 'Whole body',
  emotional: 'Mood and feeling',
}

/** Order categories appear in, everywhere. */
export const CATEGORY_ORDER: Category[] = [
  'musculoskeletal',
  'vasomotor',
  'systemic',
  'neuro',
  'genitourinary',
  'emotional',
]

export interface Symptom {
  id: string
  user_id: string
  key: string
  label: string
  category: Category
  scale: Scale
  higher_is_worse: boolean
  tracks_location: boolean
  is_active: boolean
  sort_order: number
}

export type DrugKey =
  | 'anastrozole'
  | 'letrozole'
  | 'exemestane'
  | 'tamoxifen'
  | 'other'

export const DRUG_LABEL: Record<DrugKey, string> = {
  anastrozole: 'Anastrozole (Arimidex)',
  letrozole: 'Letrozole (Femara)',
  exemestane: 'Exemestane (Aromasin)',
  tamoxifen: 'Tamoxifen',
  other: 'Other',
}

/** Typical starting dose, used only to prefill the form. */
export const DRUG_DEFAULT_DOSE: Record<DrugKey, number | null> = {
  anastrozole: 1,
  letrozole: 2.5,
  exemestane: 25,
  tamoxifen: 20,
  other: null,
}

export interface MedCourse {
  id: string
  user_id: string
  drug: DrugKey
  brand: string | null
  dose_mg: number | null
  schedule: string | null
  is_endocrine: boolean
  started_on: string
  ended_on: string | null
  stop_reason: string | null
  note: string | null
  slot: number
}

export type TookMed = 'yes' | 'no' | 'na'

export interface DailyLog {
  id?: string
  user_id?: string
  log_date: string
  took_med: TookMed | null
  med_time: string | null
  sleep_hours: number | null
  sleep_quality: number | null
  energy: number | null
  mood: number | null
  self_energy: number | null
  note: string | null
}

export interface SymptomEntry {
  id?: string
  user_id?: string
  log_date: string
  symptom_id: string
  value: number
  locations: string[] | null
  note: string | null
}

export interface Part {
  id: string
  user_id: string
  name: string
  role: string | null
  note: string | null
  is_active: boolean
  sort_order: number
}

export interface PartEntry {
  id?: string
  user_id?: string
  log_date: string
  part_id: string
  intensity: number
  note: string | null
}

export type EventKind =
  | 'appointment'
  | 'scan'
  | 'infusion'
  | 'dose_change'
  | 'surgery'
  | 'life'
  | 'other'

export const EVENT_LABEL: Record<EventKind, string> = {
  appointment: 'Appointment',
  scan: 'Scan or imaging',
  infusion: 'Infusion or injection',
  dose_change: 'Dose change',
  surgery: 'Surgery or procedure',
  life: 'Life event',
  other: 'Other',
}

export interface TrackedEvent {
  id: string
  user_id: string
  occurred_on: string
  kind: EventKind
  title: string
  note: string | null
}

/** Body areas offered for symptoms that track location. */
export const BODY_AREAS = [
  'Hands',
  'Wrists',
  'Elbows',
  'Shoulders',
  'Neck',
  'Back',
  'Hips',
  'Knees',
  'Ankles',
  'Feet',
] as const
