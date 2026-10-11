import { computeBlackHolePull, computePlanetAccelY, planetInfluenceRadius } from '../physics/gravity'
import {
  ION_FUEL_DRAIN_PER_SECOND,
  ION_STEER_SCALE,
  computeWellsAccelY,
  isInIonCloud,
} from '../physics/hazardFields'
import {
  BOOST_SPEED_ADD,
  CRUISE_LANE_BOUND,
  LATERAL_DAMPING,
  PICKUP_BOOST_MULTIPLIER,
  REFERENCE_SPEED,
  STEER_ACCEL,
  STEER_FUEL_DRAIN_PER_SECOND,
  THROTTLE_ACCEL_RATE,
  THROTTLE_BRAKE_FLOOR,
  THROTTLE_BRAKE_RATE,
  THROTTLE_DECAY_RATE,
  THROTTLE_IDLE_SPEED,
  THROTTLE_MAX_SPEED,
  THRUST_FUEL_DRAIN_PER_SECOND,
  VICTORY_SPEED_MULTIPLIER,
  computeExitDrag,
  laneBoundForHole,
  type LevelPhase,
} from '../levels/worldConfig'
import { planetWorldY } from '../levels/planetMotion'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import { NEUTRAL_TUNING, type ShipTuning } from './shipTuning'

// The ship's flight model as a pure function of (state, controls, world).
// The RAF loop and the headless level simulator both call this exact code,
// so whatever the sim proves achievable is what the player actually flies.

export interface ShipKinematics {
  worldX: number
  lateral: number
  lateralVelocity: number
  forwardSpeed: number
}

export interface ShipControls {
  bank: -1 | 0 | 1
  throttle: -1 | 0 | 1
  hasFuel: boolean
  /** player-triggered double-tap boost active */
  boosting: boolean
  /** picked-up speed booster active */
  pickupBoosting: boolean
  /** temporary extra top speed (planet slingshot), u/s */
  extraSpeed?: number
}

export interface ShipEnvironment {
  level: LevelDefinition
  layout: HoleSegment
  phase: LevelPhase
  /** game seconds; drives planet orbits, rogue planets and well pulses */
  time: number
  /** the selected ship's handling; omitted means the Scout's neutral tuning */
  tuning?: ShipTuning
}

// Fuel drains from thrusting and from steering — braking is the only free
// state. A picked-up booster makes thrust free for its duration, ion clouds
// bleed the tank regardless, and the automatic victory burn once clear is
// free (holding the throttle there changes nothing, so it shouldn't cost).
export function computeFuelDrainRate(
  controls: ShipControls,
  env: ShipEnvironment,
  ship: ShipKinematics,
): number {
  if (env.phase === 'clear') return 0
  const thrustDrain =
    controls.throttle > 0 && !controls.pickupBoosting ? THRUST_FUEL_DRAIN_PER_SECOND : 0
  const steerDrain = controls.bank !== 0 ? STEER_FUEL_DRAIN_PER_SECOND : 0
  const ionDrain = isInIonCloud(env.level, ship.worldX, ship.lateral) ? ION_FUEL_DRAIN_PER_SECOND : 0
  const shipDrain = (env.tuning ?? NEUTRAL_TUNING).fuelDrain
  return (thrustDrain + steerDrain) * (env.level.fuelDrainMultiplier ?? 1) * shipDrain + ionDrain
}

// Sum of every planet's lateral pull on the ship at this instant.
export function computePlanetsPullY(
  level: LevelDefinition,
  blackHoleX: number,
  shipWorldX: number,
  lateral: number,
  time: number,
): number {
  let pull = 0
  for (const planet of level.planets) {
    const dx = shipWorldX - planet.worldX
    const influence = planetInfluenceRadius(planet.radius, planet.influenceRadius)
    if (Math.abs(dx) >= influence) continue
    const dy = lateral - planetWorldY(planet, blackHoleX, time)
    pull += computePlanetAccelY(dx, dy, planet.surfaceGravity, planet.radius, influence)
  }
  return pull
}

// the camera can't follow this far off-centre before the approach opens up,
// so cruise flight gets a tighter lane than the escape does
export function laneBoundAt(shipWorldX: number, layout: HoleSegment): number {
  return shipWorldX <= layout.revealStartX ? CRUISE_LANE_BOUND : laneBoundForHole(layout.holeRadius)
}

/** The throttle's top speed for a ship. */
export function shipMaxSpeed(tuning: ShipTuning = NEUTRAL_TUNING): number {
  return THROTTLE_MAX_SPEED * tuning.maxSpeed
}

function stepForwardSpeed(
  forwardSpeed: number,
  controls: ShipControls,
  phase: LevelPhase,
  tuning: ShipTuning,
  dt: number,
): number {
  // every boost source stacks: a picked-up booster raises the floor, a
  // double-tap or a slingshot on top of it pushes even faster
  const extra = controls.extraSpeed ?? 0
  const maxSpeed = shipMaxSpeed(tuning)
  const accelRate = THROTTLE_ACCEL_RATE * tuning.accel
  const speedCeiling =
    maxSpeed +
    (controls.pickupBoosting ? maxSpeed * (PICKUP_BOOST_MULTIPLIER - 1) : 0) +
    (controls.boosting ? BOOST_SPEED_ADD : 0) +
    extra

  let speed = forwardSpeed
  if (phase === 'clear') {
    // clear of the hole: the burn is automatic, not player-held
    speed = maxSpeed
  } else if (controls.throttle > 0) {
    speed = Math.min(speedCeiling, speed + accelRate * dt)
  } else if (controls.throttle < 0) {
    speed = Math.max(THROTTLE_BRAKE_FLOOR, speed - THROTTLE_BRAKE_RATE * dt)
  } else {
    speed += (THROTTLE_IDLE_SPEED - speed) * Math.min((THROTTLE_DECAY_RATE * dt) / REFERENCE_SPEED, 1)
  }
  if (controls.boosting || controls.pickupBoosting || extra > 0) {
    speed = Math.min(speedCeiling, speed + accelRate * dt)
  }
  return speed
}

export function stepShip(
  ship: ShipKinematics,
  controls: ShipControls,
  env: ShipEnvironment,
  dt: number,
): ShipKinematics {
  const { level, layout, phase, time } = env
  const tuning = env.tuning ?? NEUTRAL_TUNING
  const distanceToHole = layout.blackHoleX - ship.worldX

  const gravityPullY = computeBlackHolePull(
    ship.lateral,
    distanceToHole,
    level.maxPull,
    level.pullRange,
  )
  const planetPullY = computePlanetsPullY(level, layout.blackHoleX, ship.worldX, ship.lateral, time)
  const wellPullY = computeWellsAccelY(level, ship.worldX, ship.lateral, time)
  const steerScale = isInIonCloud(level, ship.worldX, ship.lateral) ? ION_STEER_SCALE : 1
  const steerAccelY =
    controls.bank !== 0 && controls.hasFuel ? controls.bank * STEER_ACCEL * tuning.steer * steerScale : 0

  // breaking free costs extra drag for a short stretch, so clearing the
  // hole takes visible effort rather than snapping to a fast coast
  const exitDrag = computeExitDrag(ship.worldX, layout.blackHoleX)

  let lateralVelocity = ship.lateralVelocity
  lateralVelocity += (gravityPullY + planetPullY + wellPullY + steerAccelY) * dt
  lateralVelocity -= lateralVelocity * LATERAL_DAMPING * tuning.damping * (1 + exitDrag) * dt

  let lateral = ship.lateral + lateralVelocity * dt
  const laneBound = laneBoundAt(ship.worldX, layout)
  if (Math.abs(lateral) > laneBound) {
    lateral = Math.sign(lateral) * laneBound
    lateralVelocity = 0
  }

  const forwardSpeed = stepForwardSpeed(ship.forwardSpeed, controls, phase, tuning, dt)
  const victoryBurn = phase === 'clear' ? VICTORY_SPEED_MULTIPLIER : 1
  const worldX = ship.worldX + forwardSpeed * victoryBurn * dt

  return { worldX, lateral, lateralVelocity, forwardSpeed }
}
