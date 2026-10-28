import { MAX_RADIUS, MAX_ROUNDS, MIN_RADIUS, MIN_ROUNDS, filterRestaurants, maxRoundsFor } from '../game'
import { ALLERGENS, DIETARY_TAGS } from '../types'
import type { FulfillmentMode, Restaurant, SessionSettings } from '../types'
import { LocationField } from './LocationField'
import type { LocationStatus } from './LocationField'

const MODES: { value: FulfillmentMode; label: string }[] = [
  { value: 'pickup', label: '🛍️ Pickup' },
  { value: 'delivery', label: '🛵 Delivery' },
]

interface Props {
  restaurants: Restaurant[]
  settings: SessionSettings
  location: LocationStatus
  /** Shown instead of the match count while loading or on error. */
  status: string | null
  onChange: (settings: SessionSettings) => void
  onStart: () => void
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export function matchSummary(matches: number, requestedRounds: number): string {
  const rounds = Math.min(requestedRounds, maxRoundsFor(matches))
  if (matches === 0) return 'No places match. Try a wider radius or fewer filters.'
  if (matches === 1) return 'Only 1 place matches. Try a wider radius or fewer filters.'
  if (rounds < requestedRounds) return `${matches} places match, enough for ${rounds} round${rounds === 1 ? '' : 's'}.`
  return `${matches} places match.`
}

export function SetupScreen({ restaurants, settings, location, status, onChange, onStart }: Props) {
  // Skipped places still count here so the user can reach the skip screen and un-skip them.
  const matches = filterRestaurants(restaurants, settings, { includeSkipped: true }).length
  const canStart = !status && maxRoundsFor(matches) >= 1

  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault()
        if (canStart) onStart()
      }}
    >
      <div className="setup-intro">
        <h1>Can’t decide where to eat?</h1>
        <p>Two places at a time. Keep the one you like better. Last one standing is dinner.</p>
      </div>

      <LocationField {...location} />

      <div className="segmented" role="radiogroup" aria-label="Pickup or delivery">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={settings.mode === mode.value}
            onClick={() => onChange({ ...settings, mode: mode.value })}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <section className="field">
        <label htmlFor="rounds">
          <span>Rounds</span>
          <strong>{settings.rounds}</strong>
        </label>
        <input
          id="rounds"
          type="range"
          min={MIN_ROUNDS}
          max={MAX_ROUNDS}
          value={settings.rounds}
          onChange={(e) => onChange({ ...settings, rounds: Number(e.target.value) })}
        />
      </section>

      <section className="field">
        <label htmlFor="radius">
          <span>{settings.mode === 'delivery' ? 'Deliver from within' : 'How far will you go?'}</span>
          <strong>
            {settings.radiusMiles} mi
          </strong>
        </label>
        <input
          id="radius"
          type="range"
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          value={settings.radiusMiles}
          onChange={(e) => onChange({ ...settings, radiusMiles: Number(e.target.value) })}
        />
      </section>

      <fieldset className="field">
        <legend>Dietary needs</legend>
        <div className="chips">
          {DIETARY_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="chip"
              aria-pressed={settings.dietary.includes(tag)}
              onClick={() => onChange({ ...settings, dietary: toggle(settings.dietary, tag) })}
            >
              {tag}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend>Allergies to avoid</legend>
        <div className="chips">
          {ALLERGENS.map((allergen) => (
            <button
              key={allergen}
              type="button"
              className="chip chip-warn"
              aria-pressed={settings.allergies.includes(allergen)}
              onClick={() => onChange({ ...settings, allergies: toggle(settings.allergies, allergen) })}
            >
              {allergen}
            </button>
          ))}
        </div>
        {settings.allergies.length > 0 && (
          <p className="hint">
            We hide places where these are hard to avoid, but always confirm with the restaurant.
          </p>
        )}
      </fieldset>

      <div className="setup-footer">
        <p className="match-count" role="status">
          {status ?? matchSummary(matches, settings.rounds)}
        </p>
        <button type="submit" className="btn btn-primary" disabled={!canStart}>
          Start swiping
        </button>
      </div>
    </form>
  )
}
