import { describe, expect, it } from 'vitest'
import { CRUISE_LANE_BOUND, SHIP_RADIUS, STEER_ACCEL, LATERAL_DAMPING } from '../levels/worldConfig'
import {
  SHOWER_GAP_HALF_WIDTH,
  SHOWER_MAX_GAP_SHIFT,
  computeShowerGaps,
  computeShowerWaveRocks,
} from './hazardSystem'

const ROCK_MAX_RADIUS = 20
const ROCK_JITTER = 8

describe('meteor showers', () => {
  it('always leave a flyable gap inside the lane, reachable wave to wave', () => {
    for (let seed = 0; seed < 300; seed++) {
      const gaps = computeShowerGaps(seed * 3.17)
      gaps.forEach((gap, i) => {
        expect(Math.abs(gap)).toBeLessThanOrEqual(CRUISE_LANE_BOUND - SHOWER_GAP_HALF_WIDTH)
        if (i > 0) expect(Math.abs(gap - gaps[i - 1])).toBeLessThanOrEqual(SHOWER_MAX_GAP_SHIFT + 1)
        const rocks = computeShowerWaveRocks(gap)
        const nearest = Math.min(...rocks.map((y) => Math.abs(y - gap)))
        // clear half-width after rock size and placement jitter
        expect(nearest - ROCK_MAX_RADIUS - ROCK_JITTER).toBeGreaterThan(SHIP_RADIUS * 2)
      })
    }
  })

  it('shift between gaps is coverable at full steer before the next wave arrives', () => {
    const terminalLateralSpeed = STEER_ACCEL / LATERAL_DAMPING
    // ~0.7s between waves at cruise speed; allow half of that to reposition
    expect(terminalLateralSpeed * 0.35).toBeGreaterThan(SHOWER_MAX_GAP_SHIFT)
  })
})
