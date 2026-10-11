import { describe, expect, it } from 'vitest'
import { DEFAULT_RECORDS, applyClear, applyCounters, parseRecords } from './recordsStore'

describe('parseRecords', () => {
  it('falls back to defaults for junk', () => {
    expect(parseRecords(null)).toEqual(DEFAULT_RECORDS)
    expect(parseRecords('nope')).toEqual(DEFAULT_RECORDS)
    expect(parseRecords([1, 2])).toEqual(DEFAULT_RECORDS)
  })

  it('clamps counters and drops invalid levels and times', () => {
    const parsed = parseRecords({
      asteroidsDestroyed: -5,
      pickupsCollected: 12.6,
      shipsLost: 'many',
      flawlessLevels: [3, 3, 1, 99, 'x', 2.5],
      fastestMs: { '1': 60000, '0': 1000, '2': -4, abc: 5 },
    })
    expect(parsed.asteroidsDestroyed).toBe(0)
    expect(parsed.pickupsCollected).toBe(13)
    expect(parsed.shipsLost).toBe(0)
    expect(parsed.flawlessLevels).toEqual([1, 3])
    expect(parsed.fastestMs).toEqual({ '1': 60000 })
  })
})

describe('applyCounters', () => {
  it('adds only positive finite gains without mutating', () => {
    const next = applyCounters(DEFAULT_RECORDS, { asteroidsDestroyed: 3, pickupsCollected: -2, nearMisses: Number.NaN })
    expect(next.asteroidsDestroyed).toBe(3)
    expect(next.pickupsCollected).toBe(0)
    expect(next.nearMisses).toBe(0)
    expect(DEFAULT_RECORDS.asteroidsDestroyed).toBe(0)
  })
})

describe('applyClear', () => {
  it('counts the clear, marks flawless once and keeps the fastest time', () => {
    const first = applyClear(DEFAULT_RECORDS, { level: 2, livesLost: 0, timeMs: 90000 })
    const second = applyClear(first, { level: 2, livesLost: 0, timeMs: 120000 })
    const third = applyClear(second, { level: 2, livesLost: 1, timeMs: 70000 })
    expect(third.levelsCleared).toBe(3)
    expect(third.flawlessLevels).toEqual([2])
    expect(third.fastestMs['2']).toBe(70000)
  })

  it('does not mark flawless when lives lost is unknown', () => {
    const next = applyClear(DEFAULT_RECORDS, { level: 4, livesLost: null, timeMs: null })
    expect(next.flawlessLevels).toEqual([])
    expect(next.fastestMs).toEqual({})
  })
})
