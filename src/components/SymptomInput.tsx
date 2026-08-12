import { useState } from 'react'
import { BODY_AREAS, type Symptom, type SymptomEntry } from '../lib/types'
import { SYMPTOM_HINTS } from '../lib/catalog'
import { formatValue } from '../lib/stats'
import { Chip } from './ui'

interface Props {
  symptom: Symptom
  entry: SymptomEntry | undefined
  onChange: (value: number, locations: string[] | null) => void
  onClear: () => void
}

const MINUTE_PRESETS = [0, 5, 15, 30, 45, 60, 90, 120]

export default function SymptomInput({ symptom, entry, onChange, onClear }: Props) {
  const [openLocations, setOpenLocations] = useState(false)
  const value = entry ? Number(entry.value) : null
  const locations = entry?.locations ?? []
  const hint = SYMPTOM_HINTS[symptom.key]

  const set = (v: number) => onChange(v, locations.length ? locations : null)

  const toggleLocation = (area: string) => {
    const next = locations.includes(area)
      ? locations.filter((a) => a !== area)
      : [...locations, area]
    onChange(value ?? 0, next.length ? next : null)
  }

  return (
    <div className="sym">
      <div className="sym-head">
        <span className="name">{symptom.label}</span>
        <span className="spacer" />
        {value !== null ? (
          <>
            <span className="val">{formatValue(value, symptom.scale)}</span>
            <button
              type="button"
              className="btn ghost sm"
              onClick={onClear}
              aria-label={`Clear ${symptom.label}`}
              style={{ minHeight: 26, padding: '0 6px' }}
            >
              ✕
            </button>
          </>
        ) : (
          <span className="val unset">–</span>
        )}
      </div>

      {hint && <div className="hint">{hint}</div>}

      {symptom.scale === 'sev' && (
        <>
          <div className="ticks">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${symptom.label} ${i}`}
                data-on={value !== null && i <= value}
                data-sel={value === i}
                onClick={() => set(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="ticks-scale">
            <span>{symptom.higher_is_worse ? 'none' : 'gone'}</span>
            <span>{symptom.higher_is_worse ? 'worst it gets' : 'fully there'}</span>
          </div>
        </>
      )}

      {symptom.scale === 'count' && (
        <div className="stepper">
          <button type="button" onClick={() => set(Math.max(0, (value ?? 0) - 1))} aria-label="Less">
            −
          </button>
          <span className="readout">{value ?? 0}</span>
          <button type="button" onClick={() => set((value ?? 0) + 1)} aria-label="More">
            +
          </button>
          <span className="tiny muted">today</span>
        </div>
      )}

      {symptom.scale === 'mins' && (
        <div className="row" style={{ gap: 6 }}>
          {MINUTE_PRESETS.map((m) => (
            <Chip key={m} on={value === m} onClick={() => set(m)}>
              {m === 0 ? 'none' : m >= 120 ? '2 hr +' : `${m} min`}
            </Chip>
          ))}
        </div>
      )}

      {symptom.scale === 'bool' && (
        <div className="row" style={{ gap: 6 }}>
          <Chip on={value === 1} onClick={() => set(1)}>
            yes
          </Chip>
          <Chip on={value === 0} onClick={() => set(0)}>
            no
          </Chip>
        </div>
      )}

      {symptom.tracks_location && (
        <div className="stack" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn ghost sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setOpenLocations((o) => !o)}
          >
            {locations.length ? locations.join(', ') : 'Add where'}
            <span className="muted">{openLocations ? '▴' : '▾'}</span>
          </button>
          {openLocations && (
            <div className="row" style={{ gap: 6 }}>
              {BODY_AREAS.map((a) => (
                <Chip key={a} on={locations.includes(a)} onClick={() => toggleLocation(a)}>
                  {a}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
