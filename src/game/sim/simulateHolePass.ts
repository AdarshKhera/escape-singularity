import {
  FUEL_MAX,
  THROTTLE_MAX_SPEED,
  resolvePhase,
} from '../../levels/worldConfig'
import { computeLevelSegments, type LevelDefinition } from '../../levels/levels'
import { computeFuelDrainRate, laneBoundAt, stepShip, type ShipKinematics } from '../shipStep'

// Headless flight through one black hole passage, driven by a simple
// autopilot but using the exact flight model the game runs (stepShip, its
// lane clamps, fuel drain rules and the horizon capture test). Used by tests
// to prove every hole is escapable on both sides, and to measure how much
// margin a decent line leaves.

export interface PassPolicy {
  /** -1 escapes above the hole, 1 below */
  side: -1 | 1
  /** worldX, relative to the segment's approachStartX, where steering begins */
  commitOffset: number
  /** how far beyond the horizon the autopilot tries to hold, as a radius multiple */
  clearanceFactor?: number
  /**
   * Fly like a nervous human: once committed, hold the turn continuously
   * (even pinned against the lane edge) until well past the hole. Burns far
   * more fuel than the efficient line; every level must still allow it.
   */
  sloppy?: boolean
}

export interface PassResult {
  survived: boolean
  /** smallest distance between ship and horizon edge, world units */
  minClearance: number
  fuelLeft: number
  ranDry: boolean
  seconds: number
}

const SIM_DT = 1 / 60
const MAX_SIM_SECONDS = 400

function wantsToSteer(
  ship: ShipKinematics,
  policy: PassPolicy,
  holeX: number,
  holeRadius: number,
  commitX: number,
  laneBound: number,
): boolean {
  if (ship.worldX < commitX) return false
  const out = ship.lateral * policy.side
  const dx = ship.worldX - holeX
  if (policy.sloppy) return dx < holeRadius * 0.6
  const factor = policy.clearanceFactor ?? 1.35
  if (dx < 0) return out < Math.min(holeRadius * factor, laneBound - 1)
  // past the hole: only hold enough height that the horizon stays behind us
  const needed = Math.sqrt(Math.max((holeRadius * 1.08) ** 2 - dx * dx, 0))
  return out < needed + holeRadius * 0.12
}

export function simulateHolePass(
  level: LevelDefinition,
  segmentIndex: number,
  policy: PassPolicy,
  startFuel: number = FUEL_MAX,
): PassResult {
  const layout = computeLevelSegments(level)[segmentIndex]
  let ship: ShipKinematics = {
    worldX: layout.fuelCacheX,
    lateral: 0,
    lateralVelocity: 0,
    forwardSpeed: THROTTLE_MAX_SPEED,
  }
  let fuel = startFuel
  let ranDry = false
  let minClearance = Infinity
  const commitX = layout.approachStartX + policy.commitOffset

  for (let t = 0; t < MAX_SIM_SECONDS; t += SIM_DT) {
    const phase = resolvePhase(ship.worldX, layout)
    const steer = wantsToSteer(
      ship,
      policy,
      layout.blackHoleX,
      layout.holeRadius,
      commitX,
      laneBoundAt(ship.worldX, layout),
    )
    const controls = {
      bank: steer ? policy.side : 0,
      throttle: 1,
      hasFuel: fuel > 0,
      boosting: false,
      pickupBoosting: false,
    } as const
    const env = { level, layout, phase, time: t }
    const drain = computeFuelDrainRate(controls, env, ship)
    if (drain > 0 && fuel > 0) fuel = Math.max(0, fuel - drain * SIM_DT)
    if (fuel <= 0) ranDry = true

    ship = stepShip(ship, controls, env, SIM_DT)

    const clearance = Math.hypot(layout.blackHoleX - ship.worldX, ship.lateral) - layout.holeRadius
    minClearance = Math.min(minClearance, clearance)
    if (clearance <= 0) {
      return { survived: false, minClearance, fuelLeft: fuel, ranDry, seconds: t }
    }
    if (ship.worldX >= layout.escapeClearX) {
      return { survived: true, minClearance, fuelLeft: fuel, ranDry, seconds: t }
    }
  }
  return { survived: false, minClearance, fuelLeft: fuel, ranDry, seconds: MAX_SIM_SECONDS }
}
