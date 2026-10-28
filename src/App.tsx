import { useCallback, useEffect, useRef, useState } from 'react'
import { InstallButton } from './components/InstallButton'
import { ResultScreen } from './components/ResultScreen'
import { SetupScreen } from './components/SetupScreen'
import type { LocationStatus } from './components/LocationField'
import { SkipScreen } from './components/SkipScreen'
import { SwipeScreen } from './components/SwipeScreen'
import { provider } from './data/provider'
import type { SearchFrom } from './data/provider'
import { DEFAULT_SETTINGS, createSession, pick } from './game'
import { getCurrentPosition } from './location'
import { loadSkips, saveSkips } from './skips'
import type { NearbyResult, Session, SessionSettings, SlotIndex } from './types'

const FETCH_DEBOUNCE_MS = 400

export function App() {
  const [settings, setSettings] = useState<SessionSettings>(() => ({ ...DEFAULT_SETTINGS, ...loadSkips() }))
  const [from, setFrom] = useState<SearchFrom | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [nearby, setNearby] = useState<NearbyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [choosingSkips, setChoosingSkips] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  // Results for this visit, so dragging the radius back and forth doesn't refetch.
  const cache = useRef(new Map<string, NearbyResult>())

  const useMyLocation = useCallback(() => {
    setLocating(true)
    setLocationError(null)
    getCurrentPosition()
      .then(setFrom)
      .catch((error: Error) => setLocationError(error.message))
      .finally(() => setLocating(false))
  }, [])

  useEffect(useMyLocation, [useMyLocation])

  useEffect(() => {
    if (!from) return
    const key = JSON.stringify([from, settings.radiusMiles])
    const cached = cache.current.get(key)
    if (cached) {
      setNearby(cached)
      setFetchError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      provider
        .fetchNearby({ from, radiusMiles: settings.radiusMiles }, controller.signal)
        .then((result) => {
          cache.current.set(key, result)
          setNearby(result)
          setFetchError(null)
        })
        .catch((error: Error) => {
          if (controller.signal.aborted) return
          setFetchError(error.message)
          // A typed location that couldn't be found should be re-entered.
          if ('text' in from) setNearby(null)
        })
        .finally(() => !controller.signal.aborted && setLoading(false))
    }, FETCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [from, settings.radiusMiles])

  const restaurants = nearby?.restaurants ?? []

  const location: LocationStatus = {
    // With coordinates we know where the user is even if the restaurant lookup failed.
    label: nearby?.origin.label ?? (from && !('text' in from) ? 'your location' : null),
    locating,
    error: locationError ?? (from && 'text' in from ? fetchError : null),
    onUseMyLocation: useMyLocation,
    onSearch: (text) => {
      setLocationError(null)
      setFrom({ text })
    },
  }

  const start = () => {
    saveSkips(settings)
    setChoosingSkips(false)
    setSession(createSession(restaurants, settings))
  }
  const handlePick = (keep: SlotIndex) => setSession((s) => s && pick(s, keep))

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">🍽️ PalatePal</span>
        <InstallButton />
      </header>
      <main className="app-main">
        {!session && choosingSkips ? (
          <SkipScreen
            restaurants={restaurants}
            settings={settings}
            onChange={setSettings}
            onBack={() => setChoosingSkips(false)}
            onStart={start}
          />
        ) : !session ? (
          <SetupScreen
            restaurants={restaurants}
            settings={settings}
            location={location}
            status={
              !from
                ? locating
                  ? 'Finding your location…'
                  : 'Set your location to find places.'
                : loading
                  ? 'Finding places near you…'
                  : fetchError && !('text' in from)
                    ? fetchError
                    : null
            }
            onChange={setSettings}
            onStart={() => setChoosingSkips(true)}
          />
        ) : session.winner ? (
          <ResultScreen
            winner={session.winner}
            settings={session.settings}
            rounds={session.totalRounds}
            onPlayAgain={start}
            onChangeSettings={() => setSession(null)}
          />
        ) : (
          <SwipeScreen session={session} onPick={handlePick} onQuit={() => setSession(null)} />
        )}
      </main>
    </div>
  )
}
