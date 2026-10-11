import { useProgressStore } from '../../state/progressStore'
import { totalStars } from '../../state/starTotals'
import { shipsUnlockedBetween } from '../shipAdapter'

function useUnseenShipCount(): number {
  const stars = useProgressStore((s) => totalStars(s.best))
  const seen = useProgressStore((s) => s.hangarSeenStars)
  return seen >= stars ? 0 : shipsUnlockedBetween(seen, stars).length
}

/** "New" pip on the Hangar button while an unlocked ship has not been looked at. */
export function NewShipBadge() {
  const count = useUnseenShipCount()
  if (count === 0) return null
  return (
    <span className="es-badge" aria-label={`${count} new ${count === 1 ? 'ship' : 'ships'}`}>
      New
    </span>
  )
}
