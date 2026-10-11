import { describe, expect, it } from 'vitest'
import { toLevelResult, toTutorialPrompt } from './gameStoreAdapters'
import { counterGains } from './useRunRecorder'
import { addSeenTip, parseSettings } from '../state/settingsStore'
import { tipKey } from './coachHints'

describe('toTutorialPrompt', () => {
  it('validates shape and action', () => {
    expect(toTutorialPrompt(null)).toBeNull()
    expect(toTutorialPrompt({ id: 1, text: '  ' })).toBeNull()
    expect(toTutorialPrompt({ id: 2, text: 'Steer', action: 'warp' })).toEqual({ id: 2, text: 'Steer', action: null })
    expect(toTutorialPrompt({ id: 3, text: 'Fire!', action: 'fire' })).toEqual({ id: 3, text: 'Fire!', action: 'fire' })
  })
})

describe('toLevelResult', () => {
  it('reads optional fields defensively', () => {
    expect(toLevelResult({ stars: 5, score: 10, livesLost: 0, isNewBest: true })).toEqual({
      stars: 3,
      score: 10,
      livesLost: 0,
      timeMs: null,
      isNewBest: true,
    })
  })
})

describe('counterGains', () => {
  const stats = (n: number) => ({
    asteroidsDestroyed: n,
    pickupsCollected: n,
    timeMs: 0,
    nearMisses: null,
    slingshots: n,
  })

  it('counts increases and ignores resets', () => {
    expect(counterGains(stats(1), stats(3))).toEqual({ asteroidsDestroyed: 2, pickupsCollected: 2, slingshots: 2 })
    expect(counterGains(stats(5), stats(0))).toEqual({})
    expect(counterGains(null, stats(2))).toEqual({})
  })
})

describe('seen tips', () => {
  it('dedupes, bounds and validates stored tips', () => {
    const key = tipKey('  Steer   AWAY ')
    expect(key).toBe('tip:steer away')
    expect(addSeenTip(addSeenTip([], key), key)).toEqual([key])
    const parsed = parseSettings({ seenTips: ['a', 'a', 7, '', 'b'], reducedMotion: 'yes' })
    expect(parsed.seenTips).toEqual(['a', 'b'])
    expect(parsed.reducedMotion).toBe(false)
  })
})
