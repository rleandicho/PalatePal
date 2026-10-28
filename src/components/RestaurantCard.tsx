import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { unconfirmedDiets } from '../game'
import { DELIVERY_LABELS } from '../links'
import type { Restaurant, SessionSettings } from '../types'

const SWIPE_THRESHOLD = 110

interface Props {
  restaurant: Restaurant
  settings: SessionSettings
  badge?: string
  /** Direction (-1 left, 1 right) the card is flying off in, if it was just rejected. */
  leaving?: number | null
  onKeep?: () => void
  /** Called with the swipe direction when the card is dragged away. */
  onDismiss?: (direction: number) => void
}

function hueFor(id: string): number {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}

/** "$10–20" or "$100+" per person, else "$$", else nothing. */
function formatPrice(r: Restaurant): { label: string; value: string } | null {
  const range = r.priceRange
  if (range) {
    const money = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: range.currency,
      maximumFractionDigits: 0,
    })
    const min = money.format(range.min)
    // Only the first number carries the currency symbol: "$10–20".
    const value = range.max ? `${min}–${money.format(range.max).replace(/^\D+/, '')}` : `${min}+`
    return { label: 'Per person', value }
  }
  if (r.priceLevel) return { label: 'Price', value: '$'.repeat(r.priceLevel) }
  return null
}

export function RestaurantCard({ restaurant: r, settings, badge, leaving, onKeep, onDismiss }: Props) {
  const [dx, setDx] = useState(0)
  const [photoFailed, setPhotoFailed] = useState(false)
  const price = formatPrice(r)
  const notes = [
    ...unconfirmedDiets(r, settings).map((tag) => `${tag[0].toUpperCase()}${tag.slice(1)} options not confirmed`),
    ...(settings.allergies.length > 0 && !r.allergenInfoVerified
      ? ['No allergen info for this place. Check with the restaurant.']
      : []),
  ]
  const dragStart = useRef<number | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!onDismiss || (e.target as HTMLElement).closest('button')) return
    dragStart.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (dragStart.current !== null) setDx(e.clientX - dragStart.current)
  }
  const endDrag = () => {
    if (dragStart.current === null) return
    dragStart.current = null
    if (Math.abs(dx) > SWIPE_THRESHOLD) onDismiss?.(Math.sign(dx))
    setDx(0)
  }

  const style: CSSProperties = { '--hue': hueFor(r.id) } as CSSProperties
  if (leaving) {
    style.transform = `translateX(${leaving * 130}vw) rotate(${leaving * 18}deg)`
    style.opacity = 0
  } else if (dx !== 0) {
    style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`
    style.transition = 'none'
  }

  return (
    <article
      className={`card${onDismiss ? ' card-draggable' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="card-hero">
        {r.photoUrl && !photoFailed ? (
          <>
            <img src={r.photoUrl} alt="" draggable={false} onError={() => setPhotoFailed(true)} />
            {r.photoAttribution && <span className="card-credit">Photo: {r.photoAttribution}</span>}
          </>
        ) : (
          <span aria-hidden="true">{r.emoji}</span>
        )}
        {badge && <span className="card-badge">{badge}</span>}
        {Math.abs(dx) > SWIPE_THRESHOLD && <span className="card-nope">Nope</span>}
      </div>

      <div className="card-body">
        <div className="card-title">
          <h2>{r.name}</h2>
          <p>
            {r.cuisine} · {r.distanceMiles.toFixed(1)} mi
          </p>
        </div>

        {r.signatureDish ? (
          <div className="card-dish">
            <span className="label">Signature dish</span>
            <strong>{r.signatureDish.name}</strong>
            <p>{r.signatureDish.description}</p>
          </div>
        ) : (
          r.summary && (
            <div className="card-dish">
              <span className="label">About</span>
              <p className="card-summary">{r.summary}</p>
            </div>
          )
        )}

        <dl className="card-stats">
          {price && (
            <div>
              <dt>{price.label}</dt>
              <dd>{price.value}</dd>
            </div>
          )}
          <div>
            <dt>{r.ratingSource === 'google' ? 'Google' : 'Yelp'} rating</dt>
            <dd>
              <span className="star" aria-hidden="true">
                ★
              </span>{' '}
              {r.rating.toFixed(1)} <small>({r.reviewCount.toLocaleString()})</small>
            </dd>
          </div>
        </dl>

        {settings.mode === 'delivery' &&
          (r.deliveryServices.length > 0 ? (
            <div className="card-delivery">
              <span className="label">Delivers via</span>
              <ul>
                {r.deliveryServices.map((service) => (
                  <li key={service} className={`service service-${service}`}>
                    {DELIVERY_LABELS[service]}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="card-note">🛵 Offers delivery</p>
          ))}

        {notes.length > 0 && (
          <ul className="card-notes">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {onKeep && (
          <button type="button" className="btn btn-primary" onClick={onKeep}>
            Keep this one
          </button>
        )}
      </div>
    </article>
  )
}
