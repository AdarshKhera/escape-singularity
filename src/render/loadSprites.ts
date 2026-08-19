import {
  DAMAGE_TIERS,
  SHIP_SKINS,
  SHIP_THRUST_FRAME_COUNT,
  shipIdleSrc,
  shipThrustFrameSrc,
  type DamageTier,
} from './shipSkins'

const CELESTIAL_BASE = `${import.meta.env.BASE_URL}assets/celestial/`
const WEAPON_BASE = `${import.meta.env.BASE_URL}assets/weapons/`
const PLANET_SPRITE_COUNT = 12
const SHIELD_FRAME_COUNT = 12
const MOON_SPRITE_COUNT = 8

const SPRITE_FILES = {
  asteroid0: CELESTIAL_BASE + 'asteroid_0.png',
  asteroid1: CELESTIAL_BASE + 'asteroid_1.png',
  asteroid2: CELESTIAL_BASE + 'asteroid_2.png',
  asteroid3: CELESTIAL_BASE + 'asteroid_3.png',
  rocket: WEAPON_BASE + 'rocket_1.png',
  shieldIcon: WEAPON_BASE + 'shield_0.png',
} as const

export type SpriteName = keyof typeof SPRITE_FILES

export interface ShipSpriteSet {
  thrustFrames: HTMLImageElement[]
  idleFrame: HTMLImageElement
}

export interface Sprites extends Record<SpriteName, HTMLImageElement> {
  /** keyed by `${skinId}:${damageTier}` */
  ships: Record<string, ShipSpriteSet>
  planets: HTMLImageElement[]
  moons: HTMLImageElement[]
  shieldFrames: HTMLImageElement[]
}

function loadImage(src: string): HTMLImageElement {
  const img = new Image()
  img.src = src
  return img
}

function shipKey(skinId: string, tier: DamageTier): string {
  return `${skinId}:${tier}`
}

export function loadSprites(): Sprites {
  const entries = Object.entries(SPRITE_FILES) as [SpriteName, string][]
  const base = Object.fromEntries(
    entries.map(([name, src]) => [name, loadImage(src)]),
  ) as Record<SpriteName, HTMLImageElement>

  // every ship, in every damage tier, is preloaded so switching or taking a
  // hit never pops
  const ships: Record<string, ShipSpriteSet> = {}
  for (const skin of SHIP_SKINS) {
    for (const tier of DAMAGE_TIERS) {
      ships[shipKey(skin.id, tier)] = {
        thrustFrames: Array.from({ length: SHIP_THRUST_FRAME_COUNT }, (_, i) =>
          loadImage(shipThrustFrameSrc(skin.prefix, tier, i)),
        ),
        idleFrame: loadImage(shipIdleSrc(skin.prefix, tier)),
      }
    }
  }

  const planets = Array.from({ length: PLANET_SPRITE_COUNT }, (_, i) =>
    loadImage(`${CELESTIAL_BASE}planet_${i}.png`),
  )

  const moons = Array.from({ length: MOON_SPRITE_COUNT }, (_, i) =>
    loadImage(`${CELESTIAL_BASE}small_body_${i}.png`),
  )

  const shieldFrames = Array.from({ length: SHIELD_FRAME_COUNT }, (_, i) =>
    loadImage(`${WEAPON_BASE}shield_${i}.png`),
  )

  return { ...base, ships, planets, moons, shieldFrames }
}

export function getShipSpriteSet(
  sprites: Sprites,
  skinId: string,
  tier: DamageTier,
): ShipSpriteSet {
  return sprites.ships[shipKey(skinId, tier)] ?? Object.values(sprites.ships)[0]
}

export function pickAsteroidSprite(sprites: Sprites, seed: number): HTMLImageElement {
  const variants = [sprites.asteroid0, sprites.asteroid1, sprites.asteroid2, sprites.asteroid3]
  return variants[Math.floor(seed * variants.length) % variants.length]
}

export function pickPlanetSprite(sprites: Sprites, spriteIndex: number): HTMLImageElement {
  return sprites.planets[spriteIndex % sprites.planets.length]
}

export function pickMoonSprite(sprites: Sprites, seed: number): HTMLImageElement {
  return sprites.moons[Math.floor(seed * sprites.moons.length) % sprites.moons.length]
}
