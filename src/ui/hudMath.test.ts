import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments } from '../levels/levels'
import { gaugeCells, horizonProgress } from './hudMath'

describe('horizonProgress', () => {
  const single = computeLevelSegments(LEVELS[0])
  const multi = computeLevelSegments(LEVELS[LEVELS.length - 1])

  it('runs from the launch to the hole and counts down', () => {
    expect(horizonProgress(single, 0).fraction).toBe(0)
    expect(horizonProgress(single, single[0].blackHoleX).fraction).toBe(1)
    expect(horizonProgress(single, single[0].blackHoleX).seconds).toBe(0)
    const mid = horizonProgress(single, single[0].blackHoleX / 2)
    expect(mid.fraction).toBeCloseTo(0.5)
    expect(mid.seconds).toBeGreaterThan(0)
  })

  it('moves on to the next hole after clearing the previous one', () => {
    expect(multi.length).toBeGreaterThan(1)
    const before = horizonProgress(multi, multi[0].blackHoleX - 1)
    expect(before.holeIndex).toBe(1)
    const after = horizonProgress(multi, multi[0].levelEndX + 1)
    expect(after.holeIndex).toBe(2)
    expect(after.holeCount).toBe(multi.length)
    expect(after.fraction).toBeLessThan(0.05)
  })

  it('stays within 0..1 past the end', () => {
    const end = multi[multi.length - 1].levelEndX
    const p = horizonProgress(multi, end + 5000)
    expect(p.fraction).toBeGreaterThanOrEqual(0)
    expect(p.fraction).toBeLessThanOrEqual(1)
  })
})

describe('gaugeCells', () => {
  it('rounds, clamps, and never shows an empty gauge while fuel remains', () => {
    expect(gaugeCells(1, 12)).toBe(12)
    expect(gaugeCells(0.5, 12)).toBe(6)
    expect(gaugeCells(0.001, 12)).toBe(1)
    expect(gaugeCells(0, 12)).toBe(0)
    expect(gaugeCells(5, 12)).toBe(12)
    expect(gaugeCells(-1, 12)).toBe(0)
  })
})
