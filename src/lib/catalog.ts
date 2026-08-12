import type { Category, Scale } from './types'

export interface SeedSymptom {
  key: string
  label: string
  category: Category
  scale: Scale
  higher_is_worse?: boolean
  tracks_location?: boolean
  /** Off by default, so the daily log stays short. Turn on in Settings. */
  inactive?: boolean
  /** Shown under the label on the log screen. */
  hint?: string
}

/**
 * The default catalog, weighted toward what aromatase inhibitors actually do.
 * Joint pain and morning stiffness lead because AI musculoskeletal syndrome is
 * the most common reason people stop taking these drugs, and it is the thing an
 * oncologist can act on if you can show them the shape of it.
 */
export const SEED_SYMPTOMS: SeedSymptom[] = [
  // ---- joints and muscles ----
  {
    key: 'joint_pain',
    label: 'Joint pain',
    category: 'musculoskeletal',
    scale: 'sev',
    tracks_location: true,
    hint: 'Aching or sore joints. Tap the areas below.',
  },
  {
    key: 'morning_stiffness',
    label: 'Morning stiffness',
    category: 'musculoskeletal',
    scale: 'mins',
    hint: 'Minutes until your hands and body loosen up.',
  },
  {
    key: 'muscle_ache',
    label: 'Muscle aches',
    category: 'musculoskeletal',
    scale: 'sev',
  },
  {
    key: 'grip_weakness',
    label: 'Grip weakness',
    category: 'musculoskeletal',
    scale: 'sev',
    hint: 'Dropping things, jars, door handles.',
    inactive: true,
  },
  {
    key: 'bone_pain',
    label: 'Bone pain',
    category: 'musculoskeletal',
    scale: 'sev',
    inactive: true,
  },

  // ---- hot flashes and sweats ----
  {
    key: 'hot_flashes',
    label: 'Hot flashes',
    category: 'vasomotor',
    scale: 'count',
    hint: 'Roughly how many today.',
  },
  {
    key: 'hot_flash_severity',
    label: 'Hot flash intensity',
    category: 'vasomotor',
    scale: 'sev',
    inactive: true,
  },
  {
    key: 'night_sweats',
    label: 'Night sweats',
    category: 'vasomotor',
    scale: 'sev',
  },

  // ---- whole body ----
  { key: 'fatigue', label: 'Fatigue', category: 'systemic', scale: 'sev' },
  {
    key: 'insomnia',
    label: 'Trouble sleeping',
    category: 'systemic',
    scale: 'sev',
    hint: 'Falling asleep or staying asleep.',
  },
  { key: 'nausea', label: 'Nausea', category: 'systemic', scale: 'sev', inactive: true },
  { key: 'headache', label: 'Headache', category: 'systemic', scale: 'sev' },
  {
    key: 'hair_thinning',
    label: 'Hair thinning',
    category: 'systemic',
    scale: 'sev',
    inactive: true,
  },
  {
    key: 'weight_change',
    label: 'Weight feels different',
    category: 'systemic',
    scale: 'sev',
    inactive: true,
  },

  // ---- nerves and thinking ----
  {
    key: 'brain_fog',
    label: 'Brain fog',
    category: 'neuro',
    scale: 'sev',
    hint: 'Word finding, focus, holding a thought.',
  },
  {
    key: 'neuropathy',
    label: 'Numbness or tingling',
    category: 'neuro',
    scale: 'sev',
    tracks_location: true,
    hint: 'Track this separately from joint pain so leftover Taxol neuropathy does not get blamed on the AI.',
  },
  {
    key: 'carpal_tunnel',
    label: 'Hand tingling at night',
    category: 'neuro',
    scale: 'sev',
    inactive: true,
  },

  // ---- vaginal and urinary ----
  {
    key: 'vaginal_dryness',
    label: 'Vaginal dryness',
    category: 'genitourinary',
    scale: 'sev',
  },
  {
    key: 'pain_with_sex',
    label: 'Pain with sex',
    category: 'genitourinary',
    scale: 'sev',
    inactive: true,
  },
  {
    key: 'urinary',
    label: 'Urinary irritation',
    category: 'genitourinary',
    scale: 'sev',
    inactive: true,
  },

  // ---- mood and feeling ----
  { key: 'anxiety', label: 'Anxiety', category: 'emotional', scale: 'sev' },
  {
    key: 'low_mood',
    label: 'Low or flat',
    category: 'emotional',
    scale: 'sev',
    hint: 'Heaviness, numbness, nothing landing.',
  },
  { key: 'irritability', label: 'Irritability', category: 'emotional', scale: 'sev' },
  { key: 'grief', label: 'Grief', category: 'emotional', scale: 'sev' },
  {
    key: 'overwhelm',
    label: 'Overwhelm',
    category: 'emotional',
    scale: 'sev',
    inactive: true,
  },
  {
    key: 'libido',
    label: 'Libido',
    category: 'emotional',
    scale: 'sev',
    higher_is_worse: false,
    hint: '0 is gone, 10 is fully there.',
    inactive: true,
  },
]

/** Hints keyed for lookup on the log screen. */
export const SYMPTOM_HINTS: Record<string, string> = Object.fromEntries(
  SEED_SYMPTOMS.filter((s) => s.hint).map((s) => [s.key, s.hint!]),
)

/** Starting parts list. Everything here is editable in Settings. */
export const SEED_PARTS: { name: string; role: string }[] = [
  { name: 'Little Girl', role: 'exile' },
  { name: 'Shield', role: 'manager' },
  { name: 'Inner Critic', role: 'manager' },
  { name: 'Caretaker', role: 'manager' },
  { name: 'The one who scrolls', role: 'firefighter' },
]
