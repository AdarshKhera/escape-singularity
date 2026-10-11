/** Display ratings, each an integer 1..5; every ship's ratings sum to 12. */
export interface ShipStats {
  /** top speed and acceleration */
  thrust: number
  /** steering authority and how quickly lateral drift settles */
  handling: number
  /** fuel economy: higher burns the tank more slowly */
  fuel: number
  /** hit tolerance: 4+ starts each level shielded, higher softens hits */
  armor: number
}

export interface ShipSkin {
  id: string
  label: string
  detail: string
  /** sprite file prefix under /assets/ship/ */
  prefix: string
  /** flight ratings, applied in physics through src/game/shipTuning.ts */
  stats: ShipStats
  /** total stars (across all levels, max 36) needed to unlock this ship */
  unlockStars: number
  /** one or two word archetype shown in the hangar, e.g. 'Interceptor' */
  role: string
}

// Each ship is a genuinely different sprite: the same Foozle hull composited
// with a different engine and weapon from the pack, so they read as distinct
// craft rather than palette swaps. Their ratings always sum to 12, so each
// one trades something away and none is strictly better than another.
export const SHIP_SKINS: ShipSkin[] = [
  {
    id: 'scout',
    label: 'Scout',
    detail: 'Clean hull · base engine',
    prefix: 'scout',
    stats: { thrust: 3, handling: 3, fuel: 3, armor: 3 },
    unlockStars: 0,
    role: 'Balanced',
  },
  {
    id: 'lancer',
    label: 'Lancer',
    detail: 'Clean hull · burst engine',
    prefix: 'lancer',
    stats: { thrust: 4, handling: 3, fuel: 2, armor: 3 },
    unlockStars: 3,
    role: 'Sprinter',
  },
  {
    id: 'halo',
    label: 'Halo',
    detail: 'Clean hull · supercharged',
    prefix: 'halo',
    stats: { thrust: 5, handling: 2, fuel: 3, armor: 2 },
    unlockStars: 6,
    role: 'Racer',
  },
  {
    id: 'vanguard',
    label: 'Vanguard',
    detail: 'Auto cannon · base engine',
    prefix: 'vanguard',
    stats: { thrust: 2, handling: 3, fuel: 3, armor: 4 },
    unlockStars: 10,
    role: 'Guardian',
  },
  {
    id: 'ember',
    label: 'Ember',
    detail: 'Rockets · burst engine',
    prefix: 'ember',
    stats: { thrust: 3, handling: 4, fuel: 3, armor: 2 },
    unlockStars: 14,
    role: 'Skirmisher',
  },
  {
    id: 'viper',
    label: 'Viper',
    detail: 'Zapper · supercharged',
    prefix: 'viper',
    stats: { thrust: 4, handling: 5, fuel: 2, armor: 1 },
    unlockStars: 18,
    role: 'Interceptor',
  },
  {
    id: 'nova',
    label: 'Nova',
    detail: 'Space gun · pulse engine',
    prefix: 'nova',
    stats: { thrust: 3, handling: 2, fuel: 5, armor: 2 },
    unlockStars: 24,
    role: 'Long Hauler',
  },
  {
    id: 'titan',
    label: 'Titan',
    detail: 'Rockets · pulse engine',
    prefix: 'titan',
    stats: { thrust: 2, handling: 2, fuel: 3, armor: 5 },
    unlockStars: 30,
    role: 'Juggernaut',
  },
]

export const SHIP_THRUST_FRAME_COUNT = 4

// 'full' has no suffix on disk (it's the baseline set); the others are
// generated per-ship damage variants of the same hull.
export const DAMAGE_TIERS = ['full', 'slight', 'damaged'] as const
export type DamageTier = (typeof DAMAGE_TIERS)[number]

// 3 lives = full hull, 2 = slight damage, 1 (or fewer) = damaged.
export function damageTierForLives(lives: number): DamageTier {
  if (lives >= 3) return 'full'
  if (lives === 2) return 'slight'
  return 'damaged'
}

export function getShipSkin(id: string): ShipSkin {
  return SHIP_SKINS.find((s) => s.id === id) ?? SHIP_SKINS[0]
}

function damagedPrefix(prefix: string, tier: DamageTier): string {
  return tier === 'full' ? prefix : `${prefix}_${tier}`
}

const SHIP_BASE = `${import.meta.env.BASE_URL}assets/ship/`

export function shipThrustFrameSrc(prefix: string, tier: DamageTier, index: number): string {
  return `${SHIP_BASE}${damagedPrefix(prefix, tier)}_thrust_${index}.png`
}

export function shipIdleSrc(prefix: string, tier: DamageTier): string {
  return `${SHIP_BASE}${damagedPrefix(prefix, tier)}_idle.png`
}
