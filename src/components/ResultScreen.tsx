import { useState } from 'react'
import {
  DELIVERY_LABELS,
  MAPS_LABELS,
  deliveryOptions,
  deliveryOrderLink,
  directionsLink,
  loadMapsApp,
  menuLink,
  pickupOrderLink,
  saveMapsApp,
} from '../links'
import type { MapsApp, Restaurant, SessionSettings } from '../types'
import { RestaurantCard } from './RestaurantCard'

interface Props {
  winner: Restaurant
  settings: SessionSettings
  rounds: number
  onPlayAgain: () => void
  onChangeSettings: () => void
}

const external = { target: '_blank', rel: 'noopener noreferrer' }

export function ResultScreen({ winner, settings, rounds, onPlayAgain, onChangeSettings }: Props) {
  const [mapsApp, setMapsApp] = useState<MapsApp>(loadMapsApp)
  const otherMapsApp: MapsApp = mapsApp === 'google' ? 'apple' : 'google'
  const delivery = settings.mode === 'delivery'

  const switchMapsApp = () => {
    saveMapsApp(otherMapsApp)
    setMapsApp(otherMapsApp)
  }

  return (
    <div className="result">
      <div className="setup-intro">
        <h1>{delivery ? 'You’re ordering from here' : 'You’re eating here'}</h1>
        <p>
          {winner.name} survived {rounds} round{rounds === 1 ? '' : 's'}. {winner.address},{' '}
          {winner.distanceMiles.toFixed(1)} mi away.
        </p>
      </div>

      <RestaurantCard restaurant={winner} settings={settings} badge="Winner" />

      <div className="result-actions">
        {delivery ? (
          <>
            {deliveryOptions(winner).map(({ service, confirmed }, i) => (
              <a
                key={service}
                className={`btn ${i === 0 ? 'btn-primary' : 'btn-secondary'}`}
                href={deliveryOrderLink(winner, service)}
                {...external}
              >
                {service === 'in-house'
                  ? 'Order delivery from the restaurant'
                  : `${confirmed ? 'Order on' : 'Look for it on'} ${DELIVERY_LABELS[service]}`}
              </a>
            ))}
            {!winner.deliveryServices.length && (
              <p className="hint">We know they deliver, but not through which app.</p>
            )}
          </>
        ) : (
          <a className="btn btn-primary" href={pickupOrderLink(winner)} {...external}>
            Order pickup
          </a>
        )}
        <a className="btn btn-secondary" href={menuLink(winner)} {...external}>
          {winner.menuUrl || !winner.websiteUrl ? 'View menu' : 'Website & menu'}
        </a>
        {!delivery && (
          <div className="directions">
            <a className="btn btn-secondary" href={directionsLink(winner, mapsApp)} {...external}>
              Directions in {MAPS_LABELS[mapsApp]}
            </a>
            <button type="button" className="btn btn-ghost" onClick={switchMapsApp}>
              Use {MAPS_LABELS[otherMapsApp]} instead
            </button>
          </div>
        )}
      </div>

      <div className="result-actions result-restart">
        <button type="button" className="btn btn-ghost" onClick={onPlayAgain}>
          Go again
        </button>
        <button type="button" className="btn btn-ghost" onClick={onChangeSettings}>
          Change settings
        </button>
      </div>
    </div>
  )
}
