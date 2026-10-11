import { useGameStore } from '../state/gameStore'
import { onShipHit } from './gameEvents'
import { shipTuningFor } from './shipTuning'
import type { GameWorld } from './world'

// Anything solid touching the hull: a held shield absorbs it for free,
// otherwise a life is lost. Returns false while invulnerable (no effect).
export function damageShip(world: GameWorld, shipWorldX: number, lateral: number): boolean {
  const store = useGameStore.getState()
  if (store.invulnerable || store.status !== 'playing') return false
  const shielded = store.shieldCharges > 0
  if (shielded) {
    store.consumeShield()
    useGameStore.setState({ invulnerable: true })
  } else {
    store.loseLife('collision')
  }
  const tuning = shipTuningFor(store.shipSkinId)
  world.invulnerableTimer = tuning.invulnerableSeconds
  onShipHit(world, shipWorldX, lateral, shielded, tuning.hitFeedback)
  return true
}
