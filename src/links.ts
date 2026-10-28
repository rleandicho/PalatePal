import type { DeliveryService, MapsApp, Restaurant } from './types'

export const DELIVERY_LABELS: Record<DeliveryService, string> = {
  'in-house': 'In-house',
  doordash: 'DoorDash',
  ubereats: 'Uber Eats',
  grubhub: 'Grubhub',
}

export const MAPS_LABELS: Record<MapsApp, string> = {
  google: 'Google Maps',
  apple: 'Apple Maps',
}

const MAPS_PREF_KEY = 'palatepal.mapsApp'

function place(r: Restaurant): string {
  return `${r.name}, ${r.address}`
}

function webSearch(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

export function menuLink(r: Restaurant): string {
  return r.menuUrl ?? r.websiteUrl ?? webSearch(`${place(r)} menu`)
}

export function pickupOrderLink(r: Restaurant): string {
  return r.orderUrl ?? r.websiteUrl ?? webSearch(`${place(r)} order pickup`)
}

/** Known delivery channels, or every app to check when the source only says "delivers". */
export function deliveryOptions(r: Restaurant): { service: DeliveryService; confirmed: boolean }[] {
  if (r.deliveryServices.length > 0) return r.deliveryServices.map((service) => ({ service, confirmed: true }))
  const apps: DeliveryService[] = ['doordash', 'ubereats', 'grubhub']
  return apps.map((service) => ({ service, confirmed: false }))
}

export function deliveryOrderLink(r: Restaurant, service: DeliveryService): string {
  const q = encodeURIComponent(r.name)
  switch (service) {
    case 'in-house':
      return r.orderUrl ?? r.websiteUrl ?? webSearch(`${place(r)} order delivery`)
    case 'doordash':
      return `https://www.doordash.com/search/store/${q}/`
    case 'ubereats':
      return `https://www.ubereats.com/search?q=${q}`
    case 'grubhub':
      return `https://www.grubhub.com/search?queryText=${q}`
  }
}

/** Driving directions from the user's current location (both apps default the origin to it). */
export function directionsLink(r: Restaurant, app: MapsApp): string {
  const name = encodeURIComponent(r.name)
  if (app === 'apple') {
    const destination = r.location ? `${r.location.lat},${r.location.lng}` : encodeURIComponent(place(r))
    return `https://maps.apple.com/?daddr=${destination}&q=${name}&dirflg=d`
  }
  const placeId = r.googlePlaceId ? `&destination_place_id=${r.googlePlaceId}` : ''
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place(r))}${placeId}&travelmode=driving`
}

/** The last maps app the user chose, else Apple Maps on Apple devices and Google Maps elsewhere. */
export function loadMapsApp(): MapsApp {
  try {
    const saved = localStorage.getItem(MAPS_PREF_KEY)
    if (saved === 'google' || saved === 'apple') return saved
  } catch {
    // Storage unavailable (private mode); fall through to the platform default.
  }
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? 'apple' : 'google'
}

export function saveMapsApp(app: MapsApp): void {
  try {
    localStorage.setItem(MAPS_PREF_KEY, app)
  } catch {
    // Preference just won't persist.
  }
}
