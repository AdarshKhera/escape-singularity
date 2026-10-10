import { describe, expect, it } from 'vitest'
import {
  SCORE,
  STYLE_FUEL_FRACTION,
  STYLE_SKIM_FRACTION,
  computeCompletionBonus,
  computeSkimBonus,
  computeStars,
} from './scoring'
import { mergeBestResult } from './bestResults'

describe('computeStars', () => {
  const base = { completed: true, livesLost: 0, fuelFraction: 0.5, bestSkimFraction: null }
  it('awards 0 for not finishing', () => {
    expect(computeStars({ ...base, completed: false })).toBe(0)
  })
  it('awards three for a flawless, fuel-efficient escape', () => {
    expect(computeStars(base)).toBe(3)
  })
  it('drops the flawless star when a life was lost', () => {
    expect(computeStars({ ...base, livesLost: 1 })).toBe(2)
  })
  it('lets a horizon skim earn style even on an empty tank', () => {
    const dry = { ...base, fuelFraction: 0 }
    expect(computeStars(dry)).toBe(2)
    expect(computeStars({ ...dry, bestSkimFraction: STYLE_SKIM_FRACTION })).toBe(3)
    expect(computeStars({ ...dry, fuelFraction: STYLE_FUEL_FRACTION })).toBe(3)
  })
})

describe('computeSkimBonus', () => {
  it('pays most for the closest skims and nothing far out or inside', () => {
    expect(computeSkimBonus(0, 3000)).toBe(SCORE.maxSkimBonus)
    expect(computeSkimBonus(300, 3000)).toBeGreaterThan(computeSkimBonus(600, 3000))
    expect(computeSkimBonus(3000, 3000)).toBe(0)
    expect(computeSkimBonus(-1, 3000)).toBe(0)
  })
  it('is relative to the hole size', () => {
    expect(computeSkimBonus(450, 4500)).toBe(computeSkimBonus(300, 3000))
  })
})

describe('completion and bests', () => {
  it('rewards lives and fuel left', () => {
    const low = computeCompletionBonus({ distance: 10000, livesLeft: 1, fuelFraction: 0 })
    const high = computeCompletionBonus({ distance: 10000, livesLeft: 3, fuelFraction: 1 })
    expect(high - low).toBe(2 * SCORE.perLifeLeft + SCORE.fuelBonus)
  })
  it('only replaces a best when it improves, without mutating the input', () => {
    const start = { 1: { stars: 2, score: 5000 } }
    const worse = mergeBestResult(start, 1, { stars: 1, score: 4000 })
    expect(worse.isNewBest).toBe(false)
    expect(worse.results).toBe(start)
    const better = mergeBestResult(start, 1, { stars: 3, score: 4500 })
    expect(better.isNewBest).toBe(true)
    expect(better.results[1]).toEqual({ stars: 3, score: 5000 })
    expect(start[1]).toEqual({ stars: 2, score: 5000 })
  })
})
