import { describe, expect, it } from 'vitest'
import { computeAchievements, earnedIds } from './achievements'
import { DEFAULT_RECORDS } from './recordsStore'

const best = (entries: [number, number][]) =>
  Object.fromEntries(entries.map(([level, stars]) => [String(level), { stars, score: 1000 }]))

describe('computeAchievements', () => {
  it('returns ten achievements, none earned on a fresh save', () => {
    const list = computeAchievements({ best: {}, records: DEFAULT_RECORDS, maxLevel: 12 })
    expect(list).toHaveLength(10)
    expect(earnedIds(list)).toEqual([])
    expect(new Set(list.map((a) => a.id)).size).toBe(10)
  })

  it('earns clear, star and record based awards from real data only', () => {
    const list = computeAchievements({
      best: best([
        [1, 3],
        [2, 1],
      ]),
      records: { ...DEFAULT_RECORDS, flawlessLevels: [1], asteroidsDestroyed: 60 },
      maxLevel: 12,
    })
    expect(earnedIds(list)).toEqual(['first-light', 'untouched', 'perfectionist', 'demolition'])
  })

  it('caps progress at the target', () => {
    const list = computeAchievements({
      best: {},
      records: { ...DEFAULT_RECORDS, pickupsCollected: 500 },
      maxLevel: 12,
    })
    const scavenger = list.find((a) => a.id === 'scavenger')
    expect(scavenger).toMatchObject({ earned: true, value: 100, target: 100 })
  })
})
