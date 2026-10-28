import { filterRestaurants, isSkipped, maxRoundsFor } from '../game'
import type { Restaurant, SessionSettings } from '../types'
import { matchSummary } from './SetupScreen'

interface Props {
  restaurants: Restaurant[]
  settings: SessionSettings
  onChange: (settings: SessionSettings) => void
  onBack: () => void
  onStart: () => void
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export function SkipScreen({ restaurants, settings, onChange, onBack, onStart }: Props) {
  const candidates = filterRestaurants(restaurants, settings, { includeSkipped: true }).sort(
    (a, b) => a.distanceMiles - b.distanceMiles,
  )
  const cuisines = [...new Set(candidates.map((r) => r.cuisine))].sort()
  const remaining = candidates.filter((r) => !isSkipped(r, settings)).length
  const canStart = maxRoundsFor(remaining) >= 1

  return (
    <div className="setup skip">
      <div className="setup-intro">
        <h1>Already had any of these?</h1>
        <p>X out places or whole cuisines you’re not feeling. We’ll remember for a week.</p>
      </div>

      <fieldset className="field">
        <legend>Skip a cuisine</legend>
        <div className="chips">
          {cuisines.map((cuisine) => (
            <button
              key={cuisine}
              type="button"
              className="chip chip-skip"
              aria-pressed={settings.skippedCuisines.includes(cuisine)}
              onClick={() => onChange({ ...settings, skippedCuisines: toggle(settings.skippedCuisines, cuisine) })}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Skip a place</legend>
        <ul className="skip-list">
          {candidates.map((r) => {
            const cuisineSkipped = settings.skippedCuisines.includes(r.cuisine)
            const skipped = isSkipped(r, settings)
            return (
              <li key={r.id} className={skipped ? 'skipped' : undefined}>
                <span className="skip-emoji" aria-hidden="true">
                  {r.emoji}
                </span>
                <div className="skip-info">
                  <strong>{r.name}</strong>
                  <span>
                    {[r.signatureDish?.name, r.cuisine, `${r.distanceMiles.toFixed(1)} mi`].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  className="skip-x"
                  aria-pressed={skipped}
                  aria-label={`${skipped ? 'Un-skip' : 'Skip'} ${r.name}`}
                  title={cuisineSkipped ? `${r.cuisine} is skipped` : undefined}
                  disabled={cuisineSkipped}
                  onClick={() => onChange({ ...settings, skippedIds: toggle(settings.skippedIds, r.id) })}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <div className="setup-footer">
        <p className="match-count" role="status">
          {matchSummary(remaining, settings.rounds)}
        </p>
        <button type="button" className="btn btn-primary" disabled={!canStart} onClick={onStart}>
          Let’s go
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to settings
        </button>
      </div>
    </div>
  )
}
