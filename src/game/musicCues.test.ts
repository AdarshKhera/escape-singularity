import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments } from '../levels/levels'
import { computeMusicTension, jingleForStatus } from './musicCues'

describe('music cues', () => {
  const layout = computeLevelSegments(LEVELS[0])[0]

  it('stays calm in cruise and peaks at the hole', () => {
    const cruise = computeMusicTension('playing', 0, 0, layout)
    const atHole = computeMusicTension('playing', layout.blackHoleX - 10, -layout.holeRadius * 1.1, layout)
    expect(cruise).toBe(0)
    expect(atHole).toBeGreaterThan(0.8)
    expect(atHole).toBeLessThanOrEqual(1)
  })

  it('falls silent once the run stops and maxes out while swallowed', () => {
    expect(computeMusicTension('life-lost', layout.blackHoleX, 0, layout)).toBe(0)
    expect(computeMusicTension('sucked-in', 0, 0, layout)).toBe(1)
  })

  it('plays one stinger per status change', () => {
    expect(jingleForStatus('playing', 'level-complete')).toBe('complete')
    expect(jingleForStatus('playing', 'game-over')).toBe('gameOver')
    expect(jingleForStatus('sucked-in', 'life-lost')).toBe('lifeLost')
    expect(jingleForStatus('level-complete', 'level-complete')).toBeNull()
    expect(jingleForStatus('life-lost', 'playing')).toBeNull()
  })
})
