import { MAX_PULL, PULL_RANGE } from '../levels/worldConfig'

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

// ---- planets ----
//
// Planets use real-shaped gravity: acceleration = g * PLANET_G * (r / d)^2,
// i.e. surface gravity scaled by the inverse square of distance in planet
// radii. Inside the surface it is held at the surface value (the core is
// lethal anyway). The field is faded to exactly zero at the influence edge
// so crossing into it never kicks the ship.
//
// Tuned so that even the heaviest world (3 g) pulls well under the ship's
// steering authority (STEER_ACCEL 2200) one radius off its surface: planets
// bend the line and punish drifting, but never trap a ship that steers.
export const PLANET_G = 520
export const PLANET_INFLUENCE_RADII = 7
// the field is full strength out to this many radii, then fades to the edge
const PLANET_FADE_START_RADII = 3.5

export function planetInfluenceRadius(radius: number, override?: number): number {
  return override ?? radius * PLANET_INFLUENCE_RADII
}

// Lateral acceleration on the ship from one planet. dx/dy are ship minus
// planet centre, in world units. Positive result pushes toward +lateral.
export function computePlanetAccelY(
  dx: number,
  dy: number,
  surfaceGravity: number,
  radius: number,
  influence: number = planetInfluenceRadius(radius),
): number {
  const distance = Math.hypot(dx, dy)
  if (distance >= influence || distance < 1e-6) return 0
  const clamped = Math.max(distance, radius)
  const magnitude = surfaceGravity * PLANET_G * (radius / clamped) ** 2
  const fadeStart = Math.min(radius * PLANET_FADE_START_RADII, influence * 0.9)
  const fade =
    distance <= fadeStart ? 1 : 1 - smoothstep((distance - fadeStart) / (influence - fadeStart))
  // pull points from the ship toward the planet: -dy / distance
  return (-dy / distance) * magnitude * fade
}

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}
