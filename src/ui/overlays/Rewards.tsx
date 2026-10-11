import { shipThrustFrameSrc } from '../../render/shipSkins'
import { useGameStore } from '../../state/gameStore'
import { useProgressStore } from '../../state/progressStore'
import { useRecordsStore } from '../../state/recordsStore'
import { computeAchievements } from '../../state/achievements'
import { MAX_LEVEL } from '../../levels/levels'
import { Button } from '../primitives'
import { CheckIcon } from '../icons'
import { getShip } from '../shipAdapter'
import type { Celebration } from '../celebrationStore'

// What this clear earned beyond stars: a freshly unlocked ship to equip on
// the spot, and any awards that just completed.
export function Rewards({ celebration }: { celebration: Celebration }) {
  const shipId = celebration.newShipIds[celebration.newShipIds.length - 1]
  return (
    <div className="es-rewards">
      {shipId && <NewShip shipId={shipId} extra={celebration.newShipIds.length - 1} />}
      {celebration.newAchievementIds.length > 0 && <NewAwards ids={celebration.newAchievementIds} />}
    </div>
  )
}

function NewShip({ shipId, extra }: { shipId: string; extra: number }) {
  const ship = getShip(shipId)
  const equippedId = useGameStore((s) => s.shipSkinId)
  const setShipSkinId = useGameStore((s) => s.setShipSkinId)
  const equipped = equippedId === ship.id

  return (
    <div className="es-unlock">
      <span className="es-unlock__eyebrow">New ship unlocked</span>
      <div className="es-unlock__ship">
        <span className="es-unlock__rays" aria-hidden="true" />
        <img src={shipThrustFrameSrc(ship.prefix, 'full', 1)} alt="" draggable={false} />
      </div>
      <span className="es-unlock__name">{ship.label}</span>
      <span className="es-unlock__role">
        {ship.role}
        {extra > 0 && ` · +${extra} more in the hangar`}
      </span>
      <Button
        className="es-unlock__equip"
        variant={equipped ? 'ghost' : 'default'}
        disabled={equipped}
        onClick={() => setShipSkinId(ship.id)}
      >
        {equipped ? 'Equipped' : 'Equip'}
      </Button>
    </div>
  )
}

function NewAwards({ ids }: { ids: readonly string[] }) {
  const best = useProgressStore((s) => s.best)
  const records = useRecordsStore()
  const titles = computeAchievements({ best, records, maxLevel: MAX_LEVEL })
    .filter((a) => ids.includes(a.id))
    .map((a) => ({ id: a.id, title: a.title }))

  return (
    <div className="es-newawards">
      <span className="es-label">{titles.length === 1 ? 'Award earned' : 'Awards earned'}</span>
      {titles.map((a, i) => (
        <span key={a.id} className="es-newaward" style={{ animationDelay: `${1400 + i * 160}ms` }}>
          <CheckIcon />
          {a.title}
        </span>
      ))}
    </div>
  )
}
