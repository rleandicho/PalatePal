import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session, SlotIndex } from '../types'
import { RestaurantCard } from './RestaurantCard'

const LEAVE_MS = 280

interface Props {
  session: Session
  onPick: (keep: SlotIndex) => void
  onQuit: () => void
}

export function SwipeScreen({ session, onPick, onQuit }: Props) {
  const [leaving, setLeaving] = useState<{ slot: SlotIndex; direction: number } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Let the rejected card fly off before the next challenger takes its slot.
  const choose = useCallback(
    (keep: SlotIndex, direction?: number) => {
      if (leaving) return
      const out: SlotIndex = keep === 0 ? 1 : 0
      setLeaving({ slot: out, direction: direction ?? (out === 0 ? -1 : 1) })
      timer.current = window.setTimeout(() => {
        setLeaving(null)
        onPick(keep)
      }, LEAVE_MS)
    },
    [leaving, onPick],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') choose(0)
      if (e.key === 'ArrowRight') choose(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choose])

  const isFinal = session.round === session.totalRounds

  const renderCard = (slot: SlotIndex) => {
    const restaurant = session.slots[slot]
    const other: SlotIndex = slot === 0 ? 1 : 0
    return (
      <RestaurantCard
        key={restaurant.id}
        restaurant={restaurant}
        settings={session.settings}
        badge={session.championSlot === slot ? 'Still standing' : undefined}
        leaving={leaving?.slot === slot ? leaving.direction : null}
        onKeep={() => choose(slot)}
        onDismiss={(direction) => choose(other, direction)}
      />
    )
  }

  return (
    <div className="swipe">
      <div className="swipe-top">
        <button type="button" className="btn btn-ghost" onClick={onQuit}>
          ← Settings
        </button>
        <span className="round" role="status">
          {isFinal ? 'Final round' : `Round ${session.round} of ${session.totalRounds}`}
        </span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={session.totalRounds}
        aria-valuenow={session.round - 1}
      >
        <div style={{ width: `${((session.round - 1) / session.totalRounds) * 100}%` }} />
      </div>

      {/* The "or" sits between the cards in the DOM so it lands in the gap at every layout. */}
      <div className="versus">
        {renderCard(0)}
        <span className="versus-or" aria-hidden="true">
          or
        </span>
        {renderCard(1)}
      </div>

      <p className="hint swipe-hint">Tap “Keep this one”, or swipe away the one you don’t want.</p>
    </div>
  )
}
