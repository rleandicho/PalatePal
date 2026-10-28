import type { LatLng, NearbyResult } from '../types'
import { MOCK_RESTAURANTS } from './mockRestaurants'

/** Search around coordinates, or around a typed address / zip code. */
export type SearchFrom = LatLng | { text: string }

export interface NearbyQuery {
  from: SearchFrom
  radiusMiles: number
}

export interface RestaurantProvider {
  fetchNearby(query: NearbyQuery, signal?: AbortSignal): Promise<NearbyResult>
}

/** Real data via our /api/restaurants function (Google Places). */
export const googleProvider: RestaurantProvider = {
  async fetchNearby({ from, radiusMiles }, signal) {
    const params = new URLSearchParams({ radius: String(radiusMiles) })
    if ('text' in from) params.set('near', from.text)
    else params.set('lat', from.lat.toFixed(5)), params.set('lng', from.lng.toFixed(5))

    const res = await fetch(`/api/restaurants?${params}`, { signal })
    const body = (await res.json().catch(() => null)) as (NearbyResult & { error?: string }) | null
    if (!res.ok || !body) throw new Error(body?.error ?? 'Couldn’t load nearby restaurants.')
    return body
  },
}

/** Fixed demo data; ignores the location. Enable with VITE_DATA_SOURCE=mock. */
export const mockProvider: RestaurantProvider = {
  async fetchNearby({ from, radiusMiles }) {
    return {
      origin: 'text' in from ? { lat: 0, lng: 0, label: from.text } : { ...from, label: 'your location' },
      restaurants: MOCK_RESTAURANTS.filter((r) => r.distanceMiles <= radiusMiles),
    }
  },
}

export const provider: RestaurantProvider =
  import.meta.env.VITE_DATA_SOURCE === 'mock' ? mockProvider : googleProvider
