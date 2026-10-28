export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'pescatarian',
  'gluten-free',
  'dairy-free',
  'halal',
  'kosher',
] as const
export type DietaryTag = (typeof DIETARY_TAGS)[number]

export const ALLERGENS = [
  'peanuts',
  'tree nuts',
  'shellfish',
  'fish',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'sesame',
] as const
export type Allergen = (typeof ALLERGENS)[number]

export type RatingSource = 'google' | 'yelp'

export type FulfillmentMode = 'pickup' | 'delivery'

/** 'in-house' means the restaurant runs its own delivery. */
export type DeliveryService = 'in-house' | 'doordash' | 'ubereats' | 'grubhub'

export type MapsApp = 'google' | 'apple'

export interface LatLng {
  lat: number
  lng: number
}

export interface PriceRange {
  min: number
  /** Missing for open-ended ranges like "$100+". */
  max?: number
  currency: string
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  address: string
  location?: LatLng
  distanceMiles: number
  signatureDish?: {
    name: string
    description: string
  }
  /** Short description of the place, shown when there's no signature dish. */
  summary?: string
  /** Typical spend per person. */
  priceRange?: PriceRange
  /** 1 ($) to 4 ($$$$); used when there's no price range. */
  priceLevel?: number
  rating: number
  reviewCount: number
  ratingSource: RatingSource
  /** Diets this place has real options for. */
  dietaryOptions: DietaryTag[]
  /** Diets the data source actually reports on. Anything else is unknown, not a "no". */
  dietaryKnown: DietaryTag[]
  /** Allergens that are hard to avoid here (core to the menu or kitchen). */
  allergenRisks: Allergen[]
  /** False when allergenRisks is only a guess from the cuisine type. */
  allergenInfoVerified: boolean
  delivers: boolean
  /** Known delivery channels. Can be empty even when `delivers` is true (channel unknown). */
  deliveryServices: DeliveryService[]
  websiteUrl?: string
  /** Falls back to the website, then a web search. */
  menuUrl?: string
  /** The restaurant's own online ordering page. Falls back to the website, then a web search. */
  orderUrl?: string
  googlePlaceId?: string
  emoji: string
  photoUrl?: string
  /** Photographer credit, which Google requires us to show with its photos. */
  photoAttribution?: string
}

export interface Origin extends LatLng {
  label: string
}

export interface NearbyResult {
  origin: Origin
  restaurants: Restaurant[]
}

export interface SessionSettings {
  mode: FulfillmentMode
  rounds: number
  radiusMiles: number
  dietary: DietaryTag[]
  allergies: Allergen[]
  /** Places the user X'd out, e.g. because they already ate there this week. */
  skippedIds: string[]
  /** Whole cuisines to skip (e.g. "Pizza"). */
  skippedCuisines: string[]
}

export type SlotIndex = 0 | 1

export interface Session {
  settings: SessionSettings
  /** The two restaurants currently on screen. */
  slots: [Restaurant, Restaurant]
  /** Upcoming challengers, in order. */
  queue: Restaurant[]
  /** 1-based round currently being decided. */
  round: number
  totalRounds: number
  /** Which slot holds the survivor of the previous round (null in round 1). */
  championSlot: SlotIndex | null
  winner: Restaurant | null
}
