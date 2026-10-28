import { useState } from 'react'

export interface LocationStatus {
  /** Where we're searching from, once known. */
  label: string | null
  locating: boolean
  error: string | null
  onUseMyLocation: () => void
  onSearch: (text: string) => void
}

export function LocationField({ label, locating, error, onUseMyLocation, onSearch }: LocationStatus) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const showForm = editing || (!label && !locating) || !!error

  if (!showForm) {
    return (
      <div className="location">
        <span className="location-label">
          📍 {locating ? 'Finding your location…' : label === 'your location' ? 'Near you' : `Near ${label}`}
        </span>
        {!locating && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Change
          </button>
        )}
      </div>
    )
  }

  const submit = () => {
    if (!text.trim()) return
    onSearch(text.trim())
    setEditing(false)
  }

  return (
    <div className="location location-edit">
      <label htmlFor="location-input">Where are you?</label>
      <div className="location-row">
        <input
          id="location-input"
          type="text"
          inputMode="search"
          autoComplete="postal-code"
          placeholder="City, address or zip code"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // The setup screen is a form; Enter here should search, not start the game.
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!text.trim()}>
          Go
        </button>
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          setEditing(false)
          onUseMyLocation()
        }}
      >
        📍 Use my current location
      </button>
      {error && (
        <p className="hint location-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
