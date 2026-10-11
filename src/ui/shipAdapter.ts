import { SHIP_SKINS, type ShipSkin } from '../render/shipSkins'

// UI view of the ship roster. Progression fields (stats, role, unlockStars)
// come from the skin data when present; until then the agreed thresholds and
// neutral stats stand in, so the hangar works either way.

export interface ShipStats {
  thrust: number
  handling: number
  fuel: number
  armor: number
}

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

const FALLBACK_UNLOCK_STARS: Readonly<Record<string, number>> = {
  scout: 0,
  lancer: 3,
  halo: 6,
  vanguard: 10,
  ember: 14,
  viper: 18,
  nova: 24,
  titan: 30,
}
const NEUTRAL_STATS: ShipStats = { thrust: 3, handling: 3, fuel: 3, armor: 3 }
const FALLBACK_ROLE = 'Balanced'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function rating(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(STAT_MAX, Math.max(1, Math.round(value)))
}

function readStats(raw: unknown): ShipStats {
  const rec = asRecord(raw)
  if (!rec) return NEUTRAL_STATS
  return {
    thrust: rating(rec.thrust, NEUTRAL_STATS.thrust),
    handling: rating(rec.handling, NEUTRAL_STATS.handling),
    fuel: rating(rec.fuel, NEUTRAL_STATS.fuel),
    armor: rating(rec.armor, NEUTRAL_STATS.armor),
  }
}

function readUnlockStars(raw: unknown, id: string): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.round(raw)
  return FALLBACK_UNLOCK_STARS[id] ?? 0
}

function readRole(raw: unknown): string {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : FALLBACK_ROLE
}

export function toShipView(skin: ShipSkin): ShipView {
  const extra = asRecord(skin) ?? {}
  return {
    id: skin.id,
    label: skin.label,
    detail: skin.detail.replace(/\s*·\s*/g, ' / '),
    prefix: skin.prefix,
    role: readRole(extra.role),
    stats: readStats(extra.stats),
    unlockStars: skin.id === DEFAULT_SHIP_ID ? 0 : readUnlockStars(extra.unlockStars, skin.id),
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
