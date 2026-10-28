/**
 * GET /api/restaurants?lat=..&lng=..&radius=<miles>
 * GET /api/restaurants?near=<address or zip>&radius=<miles>
 *
 * Looks up nearby restaurants with the Google Places API (New) and maps them to our
 * Restaurant model. Runs server-side so GOOGLE_MAPS_API_KEY never reaches the browser.
 *
 * Only type imports from src/: Vercel compiles this file on its own.
 */
import type { Allergen, DietaryTag, NearbyResult, Origin, Restaurant } from '../src/types'

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'
const METERS_PER_MILE = 1609.344
const MAX_RADIUS_MILES = 25
const FIELD_MASK = [
  'id',
  'displayName',
  'shortFormattedAddress',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'priceRange',
  'primaryType',
  'primaryTypeDisplayName',
  'delivery',
  'servesVegetarianFood',
  'websiteUri',
  'photos',
  'editorialSummary',
  'businessStatus',
]
  .map((f) => `places.${f}`)
  .join(',')

interface Money {
  currencyCode?: string
  units?: string
}

interface Place {
  id: string
  displayName?: { text: string }
  shortFormattedAddress?: string
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  priceRange?: { startPrice?: Money; endPrice?: Money }
  primaryType?: string
  primaryTypeDisplayName?: { text: string }
  delivery?: boolean
  servesVegetarianFood?: boolean
  websiteUri?: string
  photos?: { name: string; authorAttributions?: { displayName?: string }[] }[]
  editorialSummary?: { text: string }
  businessStatus?: string
}

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

const EMOJI: Record<string, string> = {
  american_restaurant: '🍔',
  bakery: '🥐',
  bar: '🍸',
  barbecue_restaurant: '🍖',
  breakfast_restaurant: '🍳',
  brunch_restaurant: '🥞',
  cafe: '☕',
  chicken_restaurant: '🍗',
  chinese_restaurant: '🥡',
  coffee_shop: '☕',
  dessert_shop: '🍰',
  fast_food_restaurant: '🍟',
  french_restaurant: '🥖',
  greek_restaurant: '🥙',
  hamburger_restaurant: '🍔',
  ice_cream_shop: '🍦',
  indian_restaurant: '🍛',
  italian_restaurant: '🍝',
  japanese_restaurant: '🍱',
  korean_restaurant: '🍚',
  lebanese_restaurant: '🥙',
  mediterranean_restaurant: '🥙',
  mexican_restaurant: '🌮',
  middle_eastern_restaurant: '🥙',
  pizza_restaurant: '🍕',
  ramen_restaurant: '🍜',
  sandwich_shop: '🥪',
  seafood_restaurant: '🦞',
  spanish_restaurant: '🥘',
  steak_house: '🥩',
  sushi_restaurant: '🍣',
  thai_restaurant: '🍜',
  turkish_restaurant: '🥙',
  vegan_restaurant: '🌱',
  vegetarian_restaurant: '🥗',
  vietnamese_restaurant: '🍲',
}

/**
 * Google has no allergen data, so these are cautious guesses from the cuisine:
 * allergens that are hard to avoid in that kind of kitchen.
 */
const CUISINE_ALLERGENS: Record<string, Allergen[]> = {
  bakery: ['wheat', 'dairy', 'eggs', 'tree nuts'],
  breakfast_restaurant: ['eggs', 'dairy', 'wheat'],
  brunch_restaurant: ['eggs', 'dairy', 'wheat'],
  chinese_restaurant: ['soy', 'wheat', 'sesame', 'peanuts'],
  greek_restaurant: ['sesame', 'dairy'],
  hamburger_restaurant: ['wheat', 'dairy', 'sesame'],
  indian_restaurant: ['dairy', 'tree nuts'],
  italian_restaurant: ['wheat', 'dairy'],
  japanese_restaurant: ['soy', 'sesame', 'wheat', 'fish'],
  korean_restaurant: ['soy', 'sesame'],
  lebanese_restaurant: ['sesame'],
  mediterranean_restaurant: ['sesame'],
  middle_eastern_restaurant: ['sesame'],
  pizza_restaurant: ['wheat', 'dairy'],
  ramen_restaurant: ['wheat', 'soy', 'eggs', 'sesame'],
  sandwich_shop: ['wheat'],
  seafood_restaurant: ['shellfish', 'fish'],
  sushi_restaurant: ['fish', 'shellfish', 'soy', 'sesame'],
  thai_restaurant: ['peanuts', 'fish', 'shellfish', 'soy'],
  turkish_restaurant: ['sesame', 'dairy'],
  vegan_restaurant: ['tree nuts', 'soy'],
  vietnamese_restaurant: ['fish', 'soy'],
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

function cuisineFrom(place: Place): string {
  const label = place.primaryTypeDisplayName?.text ?? 'Restaurant'
  return label.replace(/ Restaurant$/, '') || 'Restaurant'
}

function dietaryFrom(place: Place): Pick<Restaurant, 'dietaryOptions' | 'dietaryKnown'> {
  if (place.primaryType === 'vegan_restaurant') {
    return { dietaryOptions: ['vegan', 'vegetarian'], dietaryKnown: ['vegan', 'vegetarian'] }
  }
  if (place.primaryType === 'vegetarian_restaurant') {
    return { dietaryOptions: ['vegetarian'], dietaryKnown: ['vegetarian'] }
  }
  if (place.servesVegetarianFood === undefined) return { dietaryOptions: [], dietaryKnown: [] }
  const options: DietaryTag[] = place.servesVegetarianFood ? ['vegetarian'] : []
  return { dietaryOptions: options, dietaryKnown: ['vegetarian'] }
}

function toRestaurant(place: Place, origin: Origin): Restaurant | null {
  if (!place.displayName?.text || !place.location || place.rating === undefined) return null
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return null

  const location = { lat: place.location.latitude, lng: place.location.longitude }
  const start = Number(place.priceRange?.startPrice?.units)
  const end = Number(place.priceRange?.endPrice?.units)
  const photo = place.photos?.[0]
  const type = place.primaryType ?? ''

  return {
    id: place.id,
    googlePlaceId: place.id,
    name: place.displayName.text,
    cuisine: cuisineFrom(place),
    address: place.shortFormattedAddress ?? place.formattedAddress ?? '',
    location,
    distanceMiles: Math.round(milesBetween(origin, location) * 10) / 10,
    summary: place.editorialSummary?.text,
    priceRange: Number.isFinite(start)
      ? {
          min: start,
          max: Number.isFinite(end) ? end : undefined,
          currency: place.priceRange?.startPrice?.currencyCode ?? 'USD',
        }
      : undefined,
    priceLevel: place.priceLevel ? PRICE_LEVELS[place.priceLevel] : undefined,
    rating: place.rating,
    reviewCount: place.userRatingCount ?? 0,
    ratingSource: 'google',
    ...dietaryFrom(place),
    allergenRisks: CUISINE_ALLERGENS[type] ?? [],
    allergenInfoVerified: false,
    delivers: place.delivery === true,
    deliveryServices: [],
    websiteUrl: place.websiteUri,
    emoji: EMOJI[type] ?? '🍽️',
    photoUrl: photo ? `/api/photo?name=${encodeURIComponent(photo.name)}` : undefined,
    photoAttribution: photo?.authorAttributions?.[0]?.displayName,
  }
}

async function geocode(query: string, key: string): Promise<Origin | null> {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = (await res.json()) as {
    status: string
    results: { formatted_address: string; geometry: { location: { lat: number; lng: number } } }[]
  }
  const top = data.results[0]
  if (data.status !== 'OK' || !top) return null
  return { ...top.geometry.location, label: top.formatted_address }
}

async function searchNearby(origin: Origin, radiusMiles: number, rank: 'POPULARITY' | 'DISTANCE', key: string) {
  const res = await fetch(PLACES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      maxResultCount: 20,
      rankPreference: rank,
      locationRestriction: {
        circle: {
          center: { latitude: origin.lat, longitude: origin.lng },
          radius: radiusMiles * METERS_PER_MILE,
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`Places search failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { places?: Place[] }
  return data.places ?? []
}

export async function GET(request: Request): Promise<Response> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return json({ error: 'Server is missing GOOGLE_MAPS_API_KEY.' }, 500)

  const params = new URL(request.url).searchParams
  const radiusMiles = Number(params.get('radius') ?? 5)
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0 || radiusMiles > MAX_RADIUS_MILES) {
    return json({ error: `radius must be between 0 and ${MAX_RADIUS_MILES} miles.` }, 400)
  }

  try {
    let origin: Origin | null
    const near = params.get('near')?.trim()
    if (near) {
      if (near.length > 200) return json({ error: 'Location is too long.' }, 400)
      origin = await geocode(near, key)
      if (!origin) return json({ error: `Couldn’t find “${near}”.` }, 404)
    } else {
      const lat = Number(params.get('lat'))
      const lng = Number(params.get('lng'))
      if (!params.get('lat') || !params.get('lng') || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return json({ error: 'Provide lat and lng, or near.' }, 400)
      }
      origin = { lat, lng, label: 'your location' }
    }

    // Nearby Search returns at most 20 places, so combine the most popular with the closest.
    const batches = await Promise.allSettled([
      searchNearby(origin, radiusMiles, 'POPULARITY', key),
      searchNearby(origin, radiusMiles, 'DISTANCE', key),
    ])
    const fulfilled = batches.filter((b) => b.status === 'fulfilled')
    if (fulfilled.length === 0) throw (batches[0] as PromiseRejectedResult).reason

    const byId = new Map<string, Restaurant>()
    for (const place of fulfilled.flatMap((b) => b.value)) {
      const restaurant = byId.has(place.id) ? null : toRestaurant(place, origin)
      if (restaurant) byId.set(place.id, restaurant)
    }

    const result: NearbyResult = { origin, restaurants: [...byId.values()] }
    return json(result)
  } catch (error) {
    console.error(error)
    return json({ error: 'Couldn’t reach Google Places. Try again in a moment.' }, 502)
  }
}
