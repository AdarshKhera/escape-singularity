import { MAX_PULL, PULL_RANGE } from '../levels/worldConfig'

// Per-level overrides fall back to the level 1 baseline.

// Lateral drag back toward the centreline.
//
// Keyed to distance along the flight path only — NOT to total distance from the
// hole. Climbing away therefore never buys relief: the pull peaks exactly as the
// ship draws level with the hole, which is the moment it needs to be furthest
// out. The player has to hold the turn the whole way through rather than
// reaching a safe altitude and coasting.
export function computeBlackHolePull(
  lateral: number,
  forwardDistance: number,
  maxPull: number = MAX_PULL,
  pullRange: number = PULL_RANGE,
): number {
  if (lateral === 0) return 0
  const proximity = Math.min(Math.max(1 - Math.abs(forwardDistance) / pullRange, 0), 1)
  return -Math.sign(lateral) * maxPull * Math.pow(proximity, 1.5)
}

// Planets keep a simple inverse-square falloff; they are small enough that it
// never traps the player.
const MIN_DISTANCE = 40

export function computePlanetPull(
  lateralOffset: number,
  forwardOffset: number,
  strength: number,
): number {
  const distance = Math.max(Math.hypot(lateralOffset, forwardOffset), MIN_DISTANCE)
  return (-lateralOffset / distance) * (strength / (distance * distance))
}
