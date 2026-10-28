import type { DietaryTag, Restaurant, Session, SessionSettings, SlotIndex } from './types'

export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 15
export const MIN_RADIUS = 1
export const MAX_RADIUS = 25

export const DEFAULT_SETTINGS: SessionSettings = {
  mode: 'pickup',
  rounds: 5,
  radiusMiles: 5,
  dietary: [],
  allergies: [],
  skippedIds: [],
  skippedCuisines: [],
}

export function isSkipped(r: Restaurant, settings: SessionSettings): boolean {
  return settings.skippedIds.includes(r.id) || settings.skippedCuisines.includes(r.cuisine)
}

/** Selected diets the data source can't confirm either way for this place. */
export function unconfirmedDiets(r: Restaurant, settings: SessionSettings): DietaryTag[] {
  return settings.dietary.filter((tag) => !r.dietaryKnown.includes(tag))
}

/**
 * Restaurants within the radius that satisfy every dietary need and avoid every allergen.
 * A diet the source doesn't report on doesn't exclude a place; the card flags it instead.
 * In delivery mode, only places that deliver. Skipped places are dropped unless `includeSkipped`.
 */
export function filterRestaurants(
  all: Restaurant[],
  settings: SessionSettings,
  { includeSkipped = false } = {},
): Restaurant[] {
  return all.filter(
    (r) =>
      (includeSkipped || !isSkipped(r, settings)) &&
      r.distanceMiles <= settings.radiusMiles &&
      (settings.mode === 'pickup' || r.delivers) &&
      settings.dietary.every((tag) => r.dietaryOptions.includes(tag) || !r.dietaryKnown.includes(tag)) &&
      !settings.allergies.some((a) => r.allergenRisks.includes(a)),
  )
}

/** N rounds needs N + 1 restaurants: two to start, then one new challenger per round. */
export function maxRoundsFor(candidateCount: number): number {
  return Math.min(MAX_ROUNDS, Math.max(0, candidateCount - 1))
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Returns null when there aren't at least two matching restaurants. */
export function createSession(all: Restaurant[], settings: SessionSettings): Session | null {
  const candidates = shuffle(filterRestaurants(all, settings))
  const totalRounds = Math.min(settings.rounds, maxRoundsFor(candidates.length))
  if (totalRounds < 1) return null

  const [first, second, ...rest] = candidates
  return {
    settings,
    slots: [first, second],
    queue: rest.slice(0, totalRounds - 1),
    round: 1,
    totalRounds,
    championSlot: null,
    winner: null,
  }
}

/** Keep the restaurant in `keep`; the other slot gets the next challenger, or the game ends. */
export function pick(session: Session, keep: SlotIndex): Session {
  if (session.winner) return session

  const kept = session.slots[keep]
  if (session.round >= session.totalRounds || session.queue.length === 0) {
    return { ...session, championSlot: keep, winner: kept }
  }

  const [challenger, ...queue] = session.queue
  const slots: [Restaurant, Restaurant] = keep === 0 ? [kept, challenger] : [challenger, kept]
  return { ...session, slots, queue, round: session.round + 1, championSlot: keep }
}
