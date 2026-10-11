import { describe, expect, it } from 'vitest'
import { SHIP_SKINS } from '../render/shipSkins'
import { NEUTRAL_TUNING, computeShipTuning, shipTuningFor } from './shipTuning'

describe('ship tuning', () => {
  it('leaves the Scout exactly on the baseline', () => {
    const scout = shipTuningFor('scout')
    expect(scout.maxSpeed).toBe(1)
    expect(scout.steer).toBe(1)
    expect(scout.fuelDrain).toBe(1)
    expect(scout.startShield).toBe(false)
    expect(scout).toEqual(NEUTRAL_TUNING)
  })

  it('maps each rating onto its own axis, in the right direction', () => {
    const base = { thrust: 3, handling: 3, fuel: 3, armor: 3 }
    expect(computeShipTuning({ ...base, thrust: 5 }).maxSpeed).toBeGreaterThan(1)
    expect(computeShipTuning({ ...base, handling: 1 }).steer).toBeLessThan(1)
    expect(computeShipTuning({ ...base, fuel: 5 }).fuelDrain).toBeLessThan(1)
    expect(computeShipTuning({ ...base, armor: 4 }).startShield).toBe(true)
    expect(computeShipTuning({ ...base, armor: 5 }).respawnShield).toBe(true)
    expect(computeShipTuning({ ...base, armor: 1 }).invulnerableSeconds).toBeLessThan(
      NEUTRAL_TUNING.invulnerableSeconds,
    )
  })

  it('keeps every ship within a gentle band of the baseline', () => {
    for (const ship of SHIP_SKINS) {
      const t = shipTuningFor(ship.id)
      expect(t.maxSpeed).toBeGreaterThanOrEqual(0.9)
      expect(t.maxSpeed).toBeLessThanOrEqual(1.1)
      expect(t.steer).toBeGreaterThanOrEqual(0.9)
      expect(t.fuelDrain).toBeLessThanOrEqual(1.2)
      expect(t.invulnerableSeconds).toBeGreaterThan(0.8)
    }
  })
})
