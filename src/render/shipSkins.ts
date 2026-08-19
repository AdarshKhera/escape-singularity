export interface ShipSkin {
  id: string
  label: string
  detail: string
  /** sprite file prefix under /assets/ship/ */
  prefix: string
}

// Each ship is a genuinely different sprite: the same Foozle hull composited
// with a different engine and weapon from the pack, so they read as distinct
// craft rather than palette swaps.
export const SHIP_SKINS: ShipSkin[] = [
  { id: 'scout', label: 'Scout', detail: 'Clean hull · base engine', prefix: 'scout' },
  { id: 'lancer', label: 'Lancer', detail: 'Clean hull · burst engine', prefix: 'lancer' },
  { id: 'halo', label: 'Halo', detail: 'Clean hull · supercharged', prefix: 'halo' },
  { id: 'vanguard', label: 'Vanguard', detail: 'Auto cannon · base engine', prefix: 'vanguard' },
  { id: 'ember', label: 'Ember', detail: 'Rockets · burst engine', prefix: 'ember' },
  { id: 'viper', label: 'Viper', detail: 'Zapper · supercharged', prefix: 'viper' },
  { id: 'nova', label: 'Nova', detail: 'Space gun · pulse engine', prefix: 'nova' },
  { id: 'titan', label: 'Titan', detail: 'Rockets · pulse engine', prefix: 'titan' },
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

export function shipThrustFrameSrc(prefix: string, tier: DamageTier, index: number): string {
  return `/assets/ship/${damagedPrefix(prefix, tier)}_thrust_${index}.png`
}

export function shipIdleSrc(prefix: string, tier: DamageTier): string {
  return `/assets/ship/${damagedPrefix(prefix, tier)}_idle.png`
}
