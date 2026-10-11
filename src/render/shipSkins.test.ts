import { describe, expect, it } from 'vitest'
import { SHIP_SKINS, getShipSkin, type ShipStats } from './shipSkins'

const STAT_KEYS: (keyof ShipStats)[] = ['thrust', 'handling', 'fuel', 'armor']

function dominates(a: ShipStats, b: ShipStats): boolean {
  return STAT_KEYS.every((k) => a[k] >= b[k]) && STAT_KEYS.some((k) => a[k] > b[k])
}

describe('ship roster', () => {
  it('unlocks at the agreed star thresholds', () => {
    const thresholds = Object.fromEntries(SHIP_SKINS.map((s) => [s.id, s.unlockStars]))
    expect(thresholds).toEqual({
      scout: 0,
      lancer: 3,
      halo: 6,
      vanguard: 10,
      ember: 14,
      viper: 18,
      nova: 24,
      titan: 30,
    })
  })

  it('rates every stat as an integer from 1 to 5', () => {
    for (const ship of SHIP_SKINS) {
      for (const key of STAT_KEYS) {
        expect(Number.isInteger(ship.stats[key])).toBe(true)
        expect(ship.stats[key]).toBeGreaterThanOrEqual(1)
        expect(ship.stats[key]).toBeLessThanOrEqual(5)
      }
    }
  })

  it('keeps the Scout balanced and gives every ship a role', () => {
    expect(getShipSkin('scout').stats).toEqual({ thrust: 3, handling: 3, fuel: 3, armor: 3 })
    for (const ship of SHIP_SKINS) {
      expect(ship.role.trim().split(/\s+/).length).toBeLessThanOrEqual(2)
    }
  })

  it('never makes one ship strictly better than another', () => {
    for (const a of SHIP_SKINS) {
      for (const b of SHIP_SKINS) {
        if (a.id !== b.id) expect(dominates(a.stats, b.stats)).toBe(false)
      }
    }
  })
})
