import { SHIP_SKINS, type ShipSkin, type ShipStats } from '../render/shipSkins'
import { displayText } from './levelFormat'

// UI view of the ship roster: the skin data plus display formatting, and the
// unlock rules the hangar and level-complete screen share.

export type { ShipStats }

export interface ShipView {
  id: string
  label: string
  detail: string
  prefix: string
  role: string
  stats: ShipStats
  unlockStars: number
}

export const STAT_KEYS: readonly (keyof ShipStats)[] = ['thrust', 'handling', 'fuel', 'armor']
export const STAT_LABELS: Readonly<Record<keyof ShipStats, string>> = {
  thrust: 'Thrust',
  handling: 'Handling',
  fuel: 'Fuel',
  armor: 'Armor',
}
export const STAT_MAX = 5
export const DEFAULT_SHIP_ID = 'scout'

export function toShipView(skin: ShipSkin): ShipView {
  return {
    id: skin.id,
    label: skin.label,
    detail: skin.detail.replace(/\s*·\s*/g, ' / '),
    prefix: skin.prefix,
    role: displayText(skin.role),
    stats: skin.stats,
    unlockStars: skin.id === DEFAULT_SHIP_ID ? 0 : skin.unlockStars,
  }
}

export const SHIPS: readonly ShipView[] = SHIP_SKINS.map(toShipView)

export function getShip(id: string): ShipView {
  return SHIPS.find((s) => s.id === id) ?? SHIPS[0]
}

export function isShipUnlocked(ship: ShipView, totalStars: number): boolean {
  return totalStars >= ship.unlockStars
}

export function isShipIdUnlocked(id: string, totalStars: number): boolean {
  const ship = SHIPS.find((s) => s.id === id)
  return ship !== undefined && isShipUnlocked(ship, totalStars)
}

/** Ships that the jump from `before` to `after` stars unlocked, in roster order. */
export function shipsUnlockedBetween(before: number, after: number): readonly ShipView[] {
  return SHIPS.filter((s) => s.unlockStars > before && s.unlockStars <= after)
}

/** The next ship still to earn, or null once the hangar is full. */
export function nextShipToUnlock(totalStars: number): ShipView | null {
  const locked = SHIPS.filter((s) => !isShipUnlocked(s, totalStars))
  return locked.reduce<ShipView | null>((min, s) => (!min || s.unlockStars < min.unlockStars ? s : min), null)
}
