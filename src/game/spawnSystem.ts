import {
  BELT_ROCK_COUNT,
  BELT_ROCK_HITS,
  BELT_ROCK_RADIUS_MAX,
  BELT_ROCK_RADIUS_MIN,
  BELT_ROCK_SPACING,
  BLOCKADE_RADIUS,
  ROCKET_PICKUP_RADIUS,
  SHIELD_PICKUP_RADIUS,
  SHIELD_UNLOCK_LEVEL,
  WEAPON_UNLOCK_LEVEL,
} from '../levels/worldConfig'
import type { LevelDefinition } from '../levels/levels'
import type { GameWorld, ObstacleType } from './world'

// how far ahead of the ship things are spawned
const SPAWN_LOOKAHEAD = 2600
const BELT_LOOKAHEAD = 3200

// Deterministic pseudo-random in [0, 1) — used for belt pickup placement so
// it lands somewhere different-feeling per belt, but identically on every
// respawn of the same run rather than re-rolling and possibly stranding the
// player without ammo.
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function pickDebrisType(roll: number, levelId: number): ObstacleType {
  const weaponsUnlocked = levelId >= WEAPON_UNLOCK_LEVEL
  const shieldsUnlocked = levelId >= SHIELD_UNLOCK_LEVEL
  if (shieldsUnlocked && roll < 0.05) return 'shieldPickup'
  if (weaponsUnlocked && roll < 0.16) return 'rocketPickup'
  if (roll < 0.23) return 'booster'
  if (roll < 0.53) return 'satellite'
  return 'asteroid'
}

function radiusForType(type: ObstacleType): number {
  if (type === 'asteroid') return 26 + Math.random() * 22
  if (type === 'rocketPickup') return ROCKET_PICKUP_RADIUS
  if (type === 'shieldPickup') return SHIELD_PICKUP_RADIUS
  return 20
}

// debris flanks the clear central corridor, only during the cruise
function spawnDebris(world: GameWorld, level: LevelDefinition, shipWorldX: number): void {
  while (world.nextSpawnWorldX < Math.min(shipWorldX + SPAWN_LOOKAHEAD, level.cruiseEndX)) {
    const type = pickDebrisType(Math.random(), level.id)
    const side = Math.random() < 0.5 ? -1 : 1
    const corridor = level.corridorHalfWidth
    const offset = corridor + Math.random() * corridor * 1.6
    world.obstacles.push({
      id: world.nextId++,
      type,
      worldX: world.nextSpawnWorldX,
      worldY: side * offset,
      radius: radiusForType(type),
      seed: Math.random() * 10,
    })
    world.nextSpawnWorldX += level.debrisSpacing + Math.random() * level.debrisSpacing * 0.85
  }
}

// scripted blockades: unlike random debris, these must be dodged
function spawnBlockades(world: GameWorld, level: LevelDefinition, shipWorldX: number): void {
  level.blockades.forEach((blockadeX, index) => {
    if (world.spawnedBlockades.has(index)) return
    if (shipWorldX + SPAWN_LOOKAHEAD < blockadeX) return
    world.spawnedBlockades.add(index)
    world.obstacles.push({
      id: world.nextId++,
      type: 'blockade',
      worldX: blockadeX,
      worldY: 0,
      radius: BLOCKADE_RADIUS,
      seed: Math.random() * 10,
    })
  })
}

// rock belts: a true wall of reinforced rocks spanning the ship's full
// cruise reach — only a rocket opens a way through. A rocket pickup is
// guaranteed somewhere before it, offset by a seeded pseudo-random so it
// isn't the same trivial spot every time, but is identical across respawns.
function spawnBelts(world: GameWorld, level: LevelDefinition, shipWorldX: number): void {
  ;(level.belts ?? []).forEach((beltX, index) => {
    if (world.spawnedBelts.has(index)) return
    if (shipWorldX + BELT_LOOKAHEAD < beltX) return
    world.spawnedBelts.add(index)

    for (let i = 0; i < BELT_ROCK_COUNT; i++) {
      const worldY = (i - (BELT_ROCK_COUNT - 1) / 2) * BELT_ROCK_SPACING
      const radius =
        BELT_ROCK_RADIUS_MIN +
        seededRandom(beltX + i) * (BELT_ROCK_RADIUS_MAX - BELT_ROCK_RADIUS_MIN)
      const jitterX = (seededRandom(beltX + i * 1.9) - 0.5) * 80
      world.obstacles.push({
        id: world.nextId++,
        type: 'asteroid',
        worldX: beltX + jitterX,
        worldY,
        radius,
        seed: seededRandom(beltX + i * 3.7) * 10,
        reinforced: true,
        hitsRemaining: BELT_ROCK_HITS,
      })
    }

    const pickupLead = 900 + seededRandom(beltX * 1.7) * 700
    const pickupLateral =
      (seededRandom(beltX * 2.3) - 0.5) * 2 * (level.corridorHalfWidth + 120)
    world.obstacles.push({
      id: world.nextId++,
      type: 'rocketPickup',
      worldX: beltX - pickupLead,
      worldY: pickupLateral,
      radius: ROCKET_PICKUP_RADIUS,
      seed: seededRandom(beltX * 3.1),
    })
  })
}

// planet escorts: rubble or a small moon riding alongside a world
function spawnEscorts(world: GameWorld, level: LevelDefinition, shipWorldX: number): void {
  level.escorts.forEach((escort, index) => {
    if (world.spawnedEscorts.has(index)) return
    if (shipWorldX + SPAWN_LOOKAHEAD < escort.worldX) return
    world.spawnedEscorts.add(index)
    world.obstacles.push({
      id: world.nextId++,
      type: escort.kind === 'moon' ? 'moon' : 'asteroid',
      worldX: escort.worldX,
      worldY: escort.worldY,
      radius: escort.kind === 'moon' ? 46 : 24,
      seed: escort.seed,
    })
  })
}

export function runSpawners(world: GameWorld, level: LevelDefinition, shipWorldX: number): void {
  spawnDebris(world, level, shipWorldX)
  spawnBlockades(world, level, shipWorldX)
  spawnBelts(world, level, shipWorldX)
  spawnEscorts(world, level, shipWorldX)
}
