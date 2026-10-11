import { getShipSkin, type ShipStats } from '../render/shipSkins'

// Turns a ship's 1..5 display ratings into the multipliers the flight model
// actually uses. Every effect is a gentle nudge around the Scout's baseline
// (rating 3 = 1.0): the hole pass is tuned to the Scout, and the
// achievability sim proves every level stays escapable for the weakest ship
// on each axis, so a rating is a feel and a trade-off, never a wall.

export interface ShipTuning {
  /** multiplies the throttle's top speed (and the victory burn) */
  maxSpeed: number
  /** multiplies throttle acceleration */
  accel: number
  /** multiplies steering acceleration */
  steer: number
  /** multiplies lateral damping: snappier settling at high handling */
  damping: number
  /** multiplies thrust and steer fuel burn */
  fuelDrain: number
  /** seconds of invulnerability after a hit */
  invulnerableSeconds: number
  /** scales hit shake, hit-stop and flash: tougher hulls shrug more off */
  hitFeedback: number
  /** a shield charge is fitted at the start of every level */
  startShield: boolean
  /** the shield is refitted on every respawn too */
  respawnShield: boolean
}

const BASE_INVULNERABLE_SECONDS = 1.4

export const NEUTRAL_TUNING: ShipTuning = computeShipTuning({
  thrust: 3,
  handling: 3,
  fuel: 3,
  armor: 3,
})

export function computeShipTuning(stats: ShipStats): ShipTuning {
  const thrust = stats.thrust - 3
  const handling = stats.handling - 3
  const fuel = stats.fuel - 3
  const armor = stats.armor - 3
  return {
    maxSpeed: 1 + thrust * 0.04,
    accel: 1 + thrust * 0.12,
    steer: 1 + handling * 0.035,
    damping: 1 + handling * 0.08,
    fuelDrain: 1 - fuel * 0.07,
    invulnerableSeconds: BASE_INVULNERABLE_SECONDS + armor * 0.2,
    hitFeedback: 1 - armor * 0.15,
    startShield: stats.armor >= 4,
    respawnShield: stats.armor >= 5,
  }
}

const cache = new Map<string, ShipTuning>()

/** Tuning for a ship id, memoised: called every frame. */
export function shipTuningFor(skinId: string): ShipTuning {
  let tuning = cache.get(skinId)
  if (!tuning) {
    tuning = computeShipTuning(getShipSkin(skinId).stats)
    cache.set(skinId, tuning)
  }
  return tuning
}
