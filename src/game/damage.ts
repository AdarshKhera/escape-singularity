import { useGameStore } from '../state/gameStore'
import { onShipHit } from './gameEvents'
import type { GameWorld } from './world'

export const INVULNERABLE_SECONDS = 1.4

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
  world.invulnerableTimer = INVULNERABLE_SECONDS
  onShipHit(world, shipWorldX, lateral, shielded)
  return true
}
