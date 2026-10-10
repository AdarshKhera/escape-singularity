import { describe, expect, it } from 'vitest'
import { LEVELS, MAX_LEVEL, activeSegment, computeLevelSegments, getLevel } from './levels'
import { BLACK_HOLE_RADIUS } from './worldConfig'

describe('computeLevelSegments', () => {
  it('builds one segment per hole, chained without overlap', () => {
    for (const level of LEVELS) {
      const segments = computeLevelSegments(level)
      expect(segments).toHaveLength(1 + (level.extraHoles?.length ?? 0))
      expect(segments[0].holeRadius).toBe(BLACK_HOLE_RADIUS)
      for (let i = 1; i < segments.length; i++) {
        const gap = level.extraHoles?.[i - 1].gapX ?? 0
        // the next reveal (camera pull-back, wider lane) starts only after a
        // calm gap past the previous level end, never overlapping it
        expect(segments[i].revealStartX).toBe(segments[i - 1].levelEndX + gap)
        expect(segments[i].holeRadius).toBeGreaterThan(segments[i - 1].holeRadius)
      }
    }
  })
})

describe('activeSegment', () => {
  const level = LEVELS.find((l) => (l.extraHoles?.length ?? 0) >= 2) ?? LEVELS[LEVELS.length - 1]
  const segments = computeLevelSegments(level)

  it('hands over at each segment end and sticks to the last', () => {
    expect(activeSegment(segments, 0)).toBe(segments[0])
    expect(activeSegment(segments, segments[0].levelEndX)).toBe(segments[0])
    expect(activeSegment(segments, segments[0].levelEndX + 1)).toBe(segments[1])
    const last = segments[segments.length - 1]
    expect(activeSegment(segments, last.levelEndX + 1e6)).toBe(last)
  })
})

describe('level list', () => {
  it('has unique sequential ids with names for the level select', () => {
    LEVELS.forEach((level, i) => {
      expect(level.id).toBe(i + 1)
      expect(level.name.length).toBeGreaterThan(0)
      expect(level.subtitle.length).toBeGreaterThan(0)
    })
    expect(MAX_LEVEL).toBe(LEVELS.length)
    expect(getLevel(999)).toBe(LEVELS[0])
  })

  it('never uses em dashes in player-facing text', () => {
    for (const level of LEVELS) {
      const text = [level.name, level.subtitle, level.intro ?? '', level.blackHoleName, level.blackHoleDescription]
      for (const extra of level.extraHoles ?? []) text.push(extra.name, extra.description)
      for (const planet of level.planets) text.push(planet.name, planet.note)
      for (const t of text) expect(t).not.toContain('—')
    }
  })
})
