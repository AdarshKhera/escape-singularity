import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments } from './levels'
import { CRUISE_LANE_BOUND, SHIP_RADIUS, laneBoundForHole } from './worldConfig'
import { planetWorldY } from './planetMotion'
import { PLANET_CORE_FRACTION } from '../game/planetSystem'

// Planets are solid at the core, so at every moment there must be a lane
// past each one inside the reachable band.
describe('planets', () => {
  it('always leave a ship-wide gap beside the core', () => {
    for (const level of LEVELS) {
      const layout = computeLevelSegments(level)[0]
      for (const planet of level.planets) {
        const bound =
          planet.worldX <= layout.revealStartX ? CRUISE_LANE_BOUND : laneBoundForHole(layout.holeRadius)
        for (let t = 0; t < 60; t += 0.25) {
          const y = planetWorldY(planet, layout.blackHoleX, t)
          const core = planet.radius * PLANET_CORE_FRACTION + SHIP_RADIUS
          const above = y - core - -bound
          const below = bound - (y + core)
          expect(Math.max(above, below)).toBeGreaterThan(SHIP_RADIUS * 2)
        }
      }
    }
  })
})
