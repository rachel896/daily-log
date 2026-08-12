/**
 * Medication periods are an identity encoding, so they take categorical slots
 * in fixed order. Slot 0 is the no-drug baseline and stays grey on purpose,
 * so "before" never competes with a drug for attention.
 */
export function slotColor(slot: number): string {
  switch (slot) {
    case 1:
      return 'var(--series-1)'
    case 2:
      return 'var(--series-2)'
    case 3:
      return 'var(--series-3)'
    default:
      return 'var(--series-0)'
  }
}

/** The same hue as a background wash, kept well under the line's weight. */
export function slotWash(slot: number, strength = 10): string {
  return `color-mix(in srgb, ${slotColor(slot)} ${strength}%, transparent)`
}
