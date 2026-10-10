import { computeBlackHolePull, computePlanetPull } from '../physics/gravity'
import {
  BOOST_SPEED_ADD,
  CRUISE_LANE_BOUND,
  LANE_BOUND,
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
  computeOrbitOffset,
  type LevelPhase,
} from '../levels/worldConfig'
import type { HoleSegment, LevelDefinition } from '../levels/levels'

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
}

export interface ShipEnvironment {
  level: LevelDefinition
  layout: HoleSegment
  phase: LevelPhase
  /** seconds, drives planet orbits */
  time: number
}

// Fuel drains from thrusting and from steering — braking is the only free
// state. A picked-up booster makes thrust free for its duration.
export function computeFuelDrainRate(controls: ShipControls): number {
  const thrustDrain =
    controls.throttle > 0 && !controls.pickupBoosting ? THRUST_FUEL_DRAIN_PER_SECOND : 0
  const steerDrain = controls.bank !== 0 ? STEER_FUEL_DRAIN_PER_SECOND : 0
  return thrustDrain + steerDrain
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
    const dxPlanet = shipWorldX - planet.worldX
    const influence = planet.influenceRadius ?? planet.radius * 6
    if (Math.abs(dxPlanet) >= influence) continue
    const orbitY = planet.worldY + computeOrbitOffset(planet.worldX, blackHoleX, time, planet.worldX)
    pull += computePlanetPull(lateral - orbitY, dxPlanet, planet.pullStrength)
  }
  return pull
}

// the camera can't follow this far off-centre before the approach opens up,
// so cruise flight gets a tighter lane than the escape does
export function laneBoundAt(shipWorldX: number, layout: HoleSegment): number {
  return shipWorldX <= layout.revealStartX ? CRUISE_LANE_BOUND : LANE_BOUND
}

function stepForwardSpeed(
  forwardSpeed: number,
  controls: ShipControls,
  phase: LevelPhase,
  dt: number,
): number {
  // both boost sources stack: a picked-up booster raises the floor, a
  // double-tap on top of it pushes even faster rather than being capped
  const speedCeiling =
    THROTTLE_MAX_SPEED +
    (controls.pickupBoosting ? THROTTLE_MAX_SPEED * (PICKUP_BOOST_MULTIPLIER - 1) : 0) +
    (controls.boosting ? BOOST_SPEED_ADD : 0)

  let speed = forwardSpeed
  if (phase === 'clear') {
    // clear of the hole: the burn is automatic, not player-held
    speed = THROTTLE_MAX_SPEED
  } else if (controls.throttle > 0) {
    speed = Math.min(speedCeiling, speed + THROTTLE_ACCEL_RATE * dt)
  } else if (controls.throttle < 0) {
    speed = Math.max(THROTTLE_BRAKE_FLOOR, speed - THROTTLE_BRAKE_RATE * dt)
  } else {
    speed += (THROTTLE_IDLE_SPEED - speed) * Math.min((THROTTLE_DECAY_RATE * dt) / REFERENCE_SPEED, 1)
  }
  if (controls.boosting || controls.pickupBoosting) {
    speed = Math.min(speedCeiling, speed + THROTTLE_ACCEL_RATE * dt)
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
  const distanceToHole = layout.blackHoleX - ship.worldX

  const gravityPullY = computeBlackHolePull(
    ship.lateral,
    distanceToHole,
    level.maxPull,
    level.pullRange,
  )
  const planetPullY = computePlanetsPullY(level, layout.blackHoleX, ship.worldX, ship.lateral, time)
  const steerAccelY = controls.bank !== 0 && controls.hasFuel ? controls.bank * STEER_ACCEL : 0

  // breaking free costs extra drag for a short stretch, so clearing the
  // hole takes visible effort rather than snapping to a fast coast
  const exitDrag = computeExitDrag(ship.worldX, layout.blackHoleX)

  let lateralVelocity = ship.lateralVelocity
  lateralVelocity += (gravityPullY + planetPullY + steerAccelY) * dt
  lateralVelocity -= lateralVelocity * LATERAL_DAMPING * (1 + exitDrag) * dt

  let lateral = ship.lateral + lateralVelocity * dt
  const laneBound = laneBoundAt(ship.worldX, layout)
  if (Math.abs(lateral) > laneBound) {
    lateral = Math.sign(lateral) * laneBound
    lateralVelocity = 0
  }

  const forwardSpeed = stepForwardSpeed(ship.forwardSpeed, controls, phase, dt)
  const victoryBurn = phase === 'clear' ? VICTORY_SPEED_MULTIPLIER : 1
  const worldX = ship.worldX + forwardSpeed * victoryBurn * dt

  return { worldX, lateral, lateralVelocity, forwardSpeed }
}
