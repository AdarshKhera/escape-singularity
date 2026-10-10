import { computeOrbitOffset } from './worldConfig'
import type { PlanetDefinition } from './planets'

// Where a planet actually sits laterally at a given game time: its charted
// position, plus the slow orbit near the hole, plus a rogue world's wander.
// Physics, collisions and rendering all read planets through this so they
// can never disagree about where a world is.
export function planetWorldY(planet: PlanetDefinition, blackHoleX: number, time: number): number {
  const orbit = computeOrbitOffset(planet.worldX, blackHoleX, time, planet.worldX)
  const wander = planet.wander
    ? Math.sin(time * planet.wander.speed + planet.worldX * 0.0013) * planet.wander.amplitude
    : 0
  return planet.worldY + orbit + wander
}
