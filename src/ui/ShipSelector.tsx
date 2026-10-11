import { useState } from 'react'
import { shipThrustFrameSrc } from '../render/shipSkins'
import { useProgressStore } from '../state/progressStore'
import { totalStars } from '../state/starTotals'
import { playUiSound } from './audioAdapter'
import { LockIcon, StarGlyph } from './icons'
import { SHIPS, STAT_KEYS, STAT_LABELS, STAT_MAX, getShip, isShipUnlocked, type ShipView } from './shipAdapter'

interface ShipSelectorProps {
  equippedId: string
  onEquip: (id: string) => void
}

// The hangar is the progression screen: every ship has a role and stats,
// later ships unlock with total stars, and locked ones show as silhouettes
// with exactly how many stars are still needed.
export function ShipSelector({ equippedId, onEquip }: ShipSelectorProps) {
  const stars = useProgressStore((s) => totalStars(s.best))
  const [viewingId, setViewingId] = useState(equippedId)
  const [deniedTick, setDeniedTick] = useState(0)
  const ship = getShip(viewingId)
  const unlocked = isShipUnlocked(ship, stars)

  const choose = (candidate: ShipView) => {
    setViewingId(candidate.id)
    if (isShipUnlocked(candidate, stars)) {
      onEquip(candidate.id)
      return
    }
    playUiSound('denied')
    setDeniedTick((t) => t + 1)
  }

  return (
    <div className="es-hangar">
      <div
        key={`${ship.id}-${deniedTick}`}
        className={`es-hangar__stage${unlocked ? '' : ' es-hangar__stage--locked'}${deniedTick > 0 && !unlocked ? ' es-shake' : ''}`}
      >
        <img
          className="es-hangar__preview"
          src={shipThrustFrameSrc(ship.prefix, 'full', 1)}
          alt={unlocked ? ship.label : `${ship.label}, locked`}
          draggable={false}
        />
        <div className="es-hangar__name">{ship.label}</div>
        <span className="es-hangar__role">{ship.role}</span>
        <ShipStatus ship={ship} unlocked={unlocked} equipped={ship.id === equippedId} stars={stars} />
      </div>

      <div className="es-hangar__panel">
        <StatBars ship={ship} />
        <div className="es-hangar__grid" role="radiogroup" aria-label="Ship">
          {SHIPS.map((s) => (
            <ShipThumb
              key={s.id}
              ship={s}
              unlocked={isShipUnlocked(s, stars)}
              equipped={s.id === equippedId}
              viewing={s.id === ship.id}
              onChoose={choose}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ShipStatusProps {
  ship: ShipView
  unlocked: boolean
  equipped: boolean
  stars: number
}

function ShipStatus({ ship, unlocked, equipped, stars }: ShipStatusProps) {
  if (!unlocked) {
    const needed = ship.unlockStars - stars
    return (
      <span className="es-hangar__status es-hangar__status--locked">
        <LockIcon />
        Earn {needed} more {needed === 1 ? 'star' : 'stars'}
      </span>
    )
  }
  return <span className="es-hangar__status">{equipped ? 'Equipped' : ship.detail}</span>
}

function StatBars({ ship }: { ship: ShipView }) {
  return (
    <dl className="es-statbars" aria-label={`${ship.label} stats`}>
      {STAT_KEYS.map((key) => (
        <div key={key} className="es-statbar">
          <dt className="es-statbar__label">{STAT_LABELS[key]}</dt>
          <dd className="es-statbar__track" aria-label={`${ship.stats[key]} of ${STAT_MAX}`}>
            {Array.from({ length: STAT_MAX }, (_, i) => (
              <span
                key={i}
                className={`es-statbar__seg${i < ship.stats[key] ? ' es-statbar__seg--on' : ''}`}
                style={{ transitionDelay: `${i * 30}ms` }}
              />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

interface ShipThumbProps {
  ship: ShipView
  unlocked: boolean
  equipped: boolean
  viewing: boolean
  onChoose: (ship: ShipView) => void
}

function ShipThumb({ ship, unlocked, equipped, viewing, onChoose }: ShipThumbProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={equipped}
      aria-label={unlocked ? ship.label : `${ship.label}, locked, needs ${ship.unlockStars} stars`}
      data-sound={unlocked ? 'toggle' : 'none'}
      data-viewing={viewing}
      className={`es-hangar__thumb${unlocked ? '' : ' es-hangar__thumb--locked'}`}
      onClick={() => onChoose(ship)}
    >
      <img src={shipThrustFrameSrc(ship.prefix, 'full', 0)} alt="" draggable={false} />
      {!unlocked && (
        <span className="es-hangar__req">
          <StarGlyph />
          {ship.unlockStars}
        </span>
      )}
    </button>
  )
}
