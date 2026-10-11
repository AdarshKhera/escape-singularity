import { describe, expect, it } from 'vitest'
import { PLANET_RADIUS, STEER_ACCEL } from '../levels/worldConfig'
import { LEVELS } from '../levels/levels'
import {
  PLANET_G,
  computeBlackHolePull,
  computePlanetAccelY,
  planetInfluenceRadius,
  planetMassFactor,
} from './gravity'
import { WELL_FIELD_RADIUS, computeWellAccelY, wellActivation } from './hazardFields'

describe('computeBlackHolePull', () => {
  it('pulls toward the centreline, symmetrically above and below', () => {
    const up = computeBlackHolePull(-2000, 1000, 2500, 10000)
    const down = computeBlackHolePull(2000, 1000, 2500, 10000)
    expect(up).toBeGreaterThan(0)
    expect(down).toBeLessThan(0)
    expect(up).toBeCloseTo(-down)
    expect(computeBlackHolePull(0, 0, 2500, 10000)).toBe(0)
  })

  it('peaks level with the hole, is capped, and is zero out of range', () => {
    expect(Math.abs(computeBlackHolePull(100, 0, 2500, 10000))).toBeCloseTo(2500)
    expect(computeBlackHolePull(100, 10001, 2500, 10000)).toBeCloseTo(0)
    // keyed to distance along the path, so climbing away buys no relief
    expect(computeBlackHolePull(-500, 2000, 2500, 10000)).toBeCloseTo(
      computeBlackHolePull(-5000, 2000, 2500, 10000),
    )
  })
})

describe('computePlanetAccelY', () => {
  it('scales with surface gravity and falls off with distance', () => {
    const r = 150
    const near = computePlanetAccelY(0, 2 * r, 1, r)
    const far = computePlanetAccelY(0, 3 * r, 1, r)
    const heavy = computePlanetAccelY(0, 2 * r, 2, r)
    expect(near).toBeLessThan(0) // ship below the planet is pulled up
    expect(Math.abs(far)).toBeLessThan(Math.abs(near))
    expect(heavy).toBeCloseTo(near * 2)
    expect(Math.abs(near)).toBeCloseTo((PLANET_G * r * r) / (4 * r * r))
  })

  it('makes bigger worlds harder to escape: stronger pull and longer reach', () => {
    const small = PLANET_RADIUS * 0.6
    const big = PLANET_RADIUS * 2.4
    expect(planetMassFactor(small)).toBe(1)
    expect(planetMassFactor(PLANET_RADIUS)).toBe(1)
    expect(planetMassFactor(big)).toBeGreaterThan(1.4)
    // the same surface gravity, one radius off the surface, pulls harder on the bigger world
    const pullAt = (r: number) => Math.abs(computePlanetAccelY(0, r * 2, 1, r))
    expect(pullAt(big)).toBeGreaterThan(pullAt(PLANET_RADIUS) * planetMassFactor(big) * 0.99)
    // and its field reaches further, in radii as well as in units
    expect(planetInfluenceRadius(big) / big).toBeGreaterThan(planetInfluenceRadius(PLANET_RADIUS) / PLANET_RADIUS)
    expect(planetInfluenceRadius(small) / small).toBe(planetInfluenceRadius(PLANET_RADIUS) / PLANET_RADIUS)
  })

  it('fades to exactly zero at the edge of influence', () => {
    const r = 200
    const edge = planetInfluenceRadius(r)
    expect(computePlanetAccelY(0, edge, 3, r)).toBe(0)
    expect(Math.abs(computePlanetAccelY(0, edge * 0.99, 3, r))).toBeLessThan(5)
  })

  it('never out-pulls the ship\'s steering on any authored planet', () => {
    for (const level of LEVELS) {
      for (const planet of level.planets) {
        const atSurface = Math.abs(computePlanetAccelY(0, planet.radius, planet.surfaceGravity, planet.radius))
        expect(atSurface).toBeLessThan(STEER_ACCEL)
      }
    }
  })
})

describe('gravity wells', () => {
  const well = { worldX: 0, worldY: 0, strength: 1800, period: 3 }
  it('pulse fully on and fully off within a cycle', () => {
    const samples = Array.from({ length: 300 }, (_, i) => wellActivation(well, (i / 300) * well.period))
    expect(Math.max(...samples)).toBeCloseTo(1)
    expect(Math.min(...samples)).toBe(0)
  })

  it('pull is bounded below steering and zero outside the field', () => {
    expect(Math.abs(computeWellAccelY(0, 60, 99999, 1))).toBeLessThan(STEER_ACCEL)
    expect(computeWellAccelY(0, WELL_FIELD_RADIUS + 1, 1800, 1)).toBe(0)
    expect(computeWellAccelY(0, 300, 1800, 0)).toBe(0)
  })
})
