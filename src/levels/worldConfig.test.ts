import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APPROACH_LEAD_SECONDS,
  ESCAPE_CLEAR_GAP,
  REFERENCE_SPEED,
  computeExitDrag,
  computeLevelLayout,
  computeStruggleT,
  laneBoundForHole,
  resolvePhase,
} from './worldConfig'

describe('computeLevelLayout', () => {
  it('orders every phase boundary along the flight path', () => {
    for (const lead of [10, 12.5, 14]) {
      const l = computeLevelLayout(20000, lead)
      expect(l.revealStartX).toBeLessThan(l.cruiseEndX)
      expect(l.cruiseEndX).toBeLessThan(l.fuelCacheX)
      expect(l.fuelCacheX).toBeLessThan(l.approachStartX)
      expect(l.approachStartX).toBeLessThan(l.blackHoleX)
      expect(l.blackHoleX).toBeLessThan(l.escapeClearX)
      expect(l.escapeClearX).toBeLessThan(l.levelEndX)
    }
  })

  it('gives exactly lead seconds of approach at reference speed', () => {
    const l = computeLevelLayout(9000, 12)
    expect((l.blackHoleX - l.approachStartX) / REFERENCE_SPEED).toBeCloseTo(12)
    expect(l.escapeClearX - l.blackHoleX).toBe(ESCAPE_CLEAR_GAP)
  })

  it('is translation invariant: only distances from the cruise end matter', () => {
    const a = computeLevelLayout(10000)
    const b = computeLevelLayout(30000)
    expect(b.blackHoleX - a.blackHoleX).toBe(20000)
    expect(b.zoomSpan).toBe(a.zoomSpan)
    expect(computeLevelLayout(10000, DEFAULT_APPROACH_LEAD_SECONDS)).toEqual(a)
  })
})

describe('phases', () => {
  const l = computeLevelLayout(9000)
  it('resolves each phase at its boundary', () => {
    expect(resolvePhase(l.approachStartX - 1, l)).toBe('cruise')
    expect(resolvePhase(l.approachStartX, l)).toBe('approach')
    expect(resolvePhase(l.blackHoleX, l)).toBe('escape')
    expect(resolvePhase(l.escapeClearX, l)).toBe('clear')
  })

  it('struggle peaks at the hole and is zero outside the pass', () => {
    expect(computeStruggleT(l.blackHoleX, l)).toBeCloseTo(1)
    expect(computeStruggleT(l.approachStartX, l)).toBe(0)
    expect(computeStruggleT(l.escapeClearX, l)).toBe(0)
  })

  it('exit drag only ever exists just past the hole', () => {
    expect(computeExitDrag(l.blackHoleX - 10, l.blackHoleX)).toBe(0)
    expect(computeExitDrag(l.blackHoleX + 10, l.blackHoleX)).toBeGreaterThan(0)
    expect(computeExitDrag(l.blackHoleX + 100000, l.blackHoleX)).toBe(0)
  })
})

describe('laneBoundForHole', () => {
  it('always leaves room beyond the horizon, proportionally', () => {
    for (const r of [3000, 4500, 6000]) {
      expect(laneBoundForHole(r)).toBeGreaterThan(r * 1.5)
    }
  })
})
