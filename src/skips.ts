import type { SessionSettings } from './types'

const SKIPS_KEY = 'palatepal.skips'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type Skips = Pick<SessionSettings, 'skippedIds' | 'skippedCuisines'>

/** Stored as key -> time it was first skipped, so each skip expires a week after it was made. */
type StoredSkips = Record<string, number>

const idKey = (id: string) => `place:${id}`
const cuisineKey = (cuisine: string) => `cuisine:${cuisine}`

function read(): StoredSkips {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SKIPS_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as StoredSkips) : {}
  } catch {
    return {}
  }
}

/** Skips made within the last week. */
export function loadSkips(now = Date.now()): Skips {
  const skips: Skips = { skippedIds: [], skippedCuisines: [] }
  for (const [key, at] of Object.entries(read())) {
    if (typeof at !== 'number' || now - at > WEEK_MS) continue
    if (key.startsWith('place:')) skips.skippedIds.push(key.slice('place:'.length))
    if (key.startsWith('cuisine:')) skips.skippedCuisines.push(key.slice('cuisine:'.length))
  }
  return skips
}

export function saveSkips({ skippedIds, skippedCuisines }: Skips, now = Date.now()): void {
  const previous = read()
  const next: StoredSkips = {}
  for (const key of [...skippedIds.map(idKey), ...skippedCuisines.map(cuisineKey)]) {
    next[key] = previous[key] && now - previous[key] <= WEEK_MS ? previous[key] : now
  }
  try {
    localStorage.setItem(SKIPS_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable; skips still apply to this visit.
  }
}
