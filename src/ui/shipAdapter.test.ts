import { describe, expect, it } from 'vitest'
import { SHIPS, isShipIdUnlocked, nextShipToUnlock, shipsUnlockedBetween, toShipView } from './shipAdapter'

describe('ship progression', () => {
  it('always has the scout unlocked from zero stars', () => {
    expect(isShipIdUnlocked('scout', 0)).toBe(true)
    expect(isShipIdUnlocked('titan', 0)).toBe(false)
    expect(isShipIdUnlocked('not-a-ship', 99)).toBe(false)
  })

  it('reports ships unlocked by a star jump, in roster order', () => {
    const ids = shipsUnlockedBetween(5, 14).map((s) => s.id)
    expect(ids).toEqual(SHIPS.filter((s) => s.unlockStars > 5 && s.unlockStars <= 14).map((s) => s.id))
    expect(shipsUnlockedBetween(14, 14)).toEqual([])
  })

  it('finds the next ship to earn, or none when all are unlocked', () => {
    const maxNeeded = Math.max(...SHIPS.map((s) => s.unlockStars))
    expect(nextShipToUnlock(maxNeeded)).toBeNull()
    expect(nextShipToUnlock(0)?.unlockStars).toBeGreaterThan(0)
  })

  it('reads contract fields when present and clamps ratings', () => {
    const view = toShipView({
      id: 'lancer',
      label: 'Lancer',
      detail: 'Clean hull · burst engine',
      prefix: 'lancer',
      ...{ stats: { thrust: 9, handling: 0, fuel: 2.4, armor: 'x' }, unlockStars: 4, role: 'Interceptor' },
    })
    expect(view.stats).toEqual({ thrust: 5, handling: 1, fuel: 2, armor: 3 })
    expect(view.unlockStars).toBe(4)
    expect(view.role).toBe('Interceptor')
    expect(view.detail).toBe('Clean hull / burst engine')
  })

  it('falls back to agreed thresholds and neutral stats', () => {
    const view = toShipView({ id: 'nova', label: 'Nova', detail: '', prefix: 'nova' })
    expect(view.unlockStars).toBe(24)
    expect(view.role).toBe('Balanced')
    expect(view.stats).toEqual({ thrust: 3, handling: 3, fuel: 3, armor: 3 })
  })
})
