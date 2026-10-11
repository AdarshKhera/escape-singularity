import { describe, expect, it } from 'vitest'
import { SHIP_SKINS } from '../render/shipSkins'
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

  it('carries each skin real stats, role and threshold through', () => {
    for (const skin of SHIP_SKINS) {
      const view = toShipView(skin)
      expect(view.stats).toEqual(skin.stats)
      expect(view.role).toBe(skin.role)
      expect(view.unlockStars).toBe(skin.unlockStars)
    }
  })

  it('formats the detail line and keeps the starter ship free', () => {
    const scout = SHIP_SKINS.find((s) => s.id === 'scout')
    expect(scout).toBeDefined()
    if (!scout) return
    const view = toShipView({ ...scout, unlockStars: 5 })
    expect(view.unlockStars).toBe(0)
    expect(view.detail).toBe('Clean hull / base engine')
  })
})
