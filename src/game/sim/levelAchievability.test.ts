import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments, type LevelDefinition } from '../../levels/levels'
import { simulateHolePass } from './simulateHolePass'

// The difficulty contract, checked against the real flight model:
//  - every hole on every level can be escaped above AND below, by an
//    efficient pilot and by a sloppy one who holds the turn throughout;
//  - doing nothing, or committing far too late, gets you swallowed;
//  - the commit window shrinks from early levels to late ones.

const COMMIT_STEP = 100

function latestSurvivingCommit(level: LevelDefinition, segment: number, side: -1 | 1): number {
  let latest = -Infinity
  for (let c = -1400; c <= 6000; c += COMMIT_STEP) {
    if (simulateHolePass(level, segment, { side, commitOffset: c }).survived) latest = c
  }
  return latest
}

describe.each(LEVELS.map((level) => [level.id, level] as const))('level %i', (_id, level) => {
  const segments = computeLevelSegments(level)

  it.each(segments.map((_, i) => i))('hole %i is escapable both ways, even flown sloppily', (segment) => {
    for (const side of [-1, 1] as const) {
      const latest = latestSurvivingCommit(level, segment, side)
      expect(latest).toBeGreaterThan(-1000)
      const commit = Math.min(0, latest - 400)
      const efficient = simulateHolePass(level, segment, { side, commitOffset: commit })
      const sloppy = simulateHolePass(level, segment, { side, commitOffset: commit, sloppy: true })
      expect(efficient.survived).toBe(true)
      expect(sloppy.survived).toBe(true)
      expect(efficient.ranDry).toBe(false)
      expect(efficient.fuelLeft).toBeGreaterThanOrEqual(sloppy.fuelLeft)
    }
  })

  it.each(segments.map((_, i) => i))('hole %i punishes not committing', (segment) => {
    const never = simulateHolePass(level, segment, { side: -1, commitOffset: 1e9 })
    expect(never.survived).toBe(false)
    const tooLate = simulateHolePass(level, segment, { side: -1, commitOffset: 6000 })
    expect(tooLate.survived).toBe(false)
  })
})

describe('difficulty curve', () => {
  it('tightens the commit window from the first level to the last', () => {
    const windowOf = (level: LevelDefinition) =>
      Math.min(...computeLevelSegments(level).map((_, s) => latestSurvivingCommit(level, s, -1)))
    const first = windowOf(LEVELS[0])
    const middle = windowOf(LEVELS[Math.floor(LEVELS.length / 2)])
    const last = windowOf(LEVELS[LEVELS.length - 1])
    expect(first).toBeGreaterThan(middle)
    expect(middle).toBeGreaterThan(last)
    expect(first - last).toBeGreaterThanOrEqual(1200)
  })

  it('leaves less fuel to spare on later levels', () => {
    const spare = (level: LevelDefinition) =>
      Math.min(
        ...computeLevelSegments(level).map(
          (_, s) => simulateHolePass(level, s, { side: -1, commitOffset: -1000, sloppy: true }).fuelLeft,
        ),
      )
    expect(spare(LEVELS[0])).toBeGreaterThan(spare(LEVELS[LEVELS.length - 1]) * 2)
  })
})
