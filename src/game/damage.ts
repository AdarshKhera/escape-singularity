import { useGameStore } from '../state/gameStore'
import { onShipHit } from './gameEvents'
import { shipTuningFor } from './shipTuning'
import type { GameWorld } from './world'

// Game seconds between a fatal hit and the life actually being lost. The
// hit also starts a slow-mo, so this plays out as roughly a second of real
// time: the ship bursts, the world holds still, and the player sees exactly
// what got them before the relaunch screen appears.
export const DEATH_BEAT_SECONDS = 0.32

// Anything solid touching the hull: a held shield absorbs it for free,
// otherwise the ship is destroyed and, after the death beat, a life is lost.
// Returns false while invulnerable or already going down (no effect).
export function damageShip(world: GameWorld, shipWorldX: number, lateral: number): boolean {
  const store = useGameStore.getState()
  if (store.invulnerable || store.status !== 'playing' || world.deathBeat > 0) return false
  const shielded = store.shieldCharges > 0
  if (shielded) {
    store.consumeShield()
    useGameStore.setState({ invulnerable: true })
  } else {
    world.deathBeat = DEATH_BEAT_SECONDS
    store.emitHaptic('explosion')
  }
  const tuning = shipTuningFor(store.shipSkinId)
  world.invulnerableTimer = tuning.invulnerableSeconds
  onShipHit(world, shipWorldX, lateral, shielded, tuning.hitFeedback)
  return true
}

// Counts the death beat down; true while it is still playing out. When it
// ends the life is lost, exactly as an instant hit used to.
export function stepDeathBeat(world: GameWorld, dt: number): boolean {
  if (world.deathBeat <= 0) return false
  world.deathBeat -= dt
  if (world.deathBeat <= 0) {
    world.deathBeat = 0
    useGameStore.getState().loseLife('collision')
  }
  return true
}
