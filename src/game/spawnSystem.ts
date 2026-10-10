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
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import { addObstacle, type GameWorld, type ObstacleType } from './world'

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

const DERELICT_THICKNESS = 13

// debris flanks the clear central corridor, only during the cruise. From
// level 2 on, rocks carry their own slow lateral drift, so the corridor
// isn't a fixed safe line; later levels mix in spinning derelicts.
// Running low makes fuel orbs more common, so a rough patch of flying is a
// setback rather than a guaranteed dead end before the cache.
const LOW_FUEL_FRACTION = 0.3
const LOW_FUEL_ORB_CHANCE = 0.35

// Debris runs through each hole's cruise: from the level start to the first
// cruise end, then after each escape (past a short calm) up to the next
// hole's cruise end.
const POST_ESCAPE_CALM = 1200

function debrisWindowFor(segments: HoleSegment[], x: number): { start: number; end: number } | null {
  for (let i = 0; i < segments.length; i++) {
    const start = i === 0 ? 0 : segments[i - 1].levelEndX + POST_ESCAPE_CALM
    const end = segments[i].cruiseEndX
    if (x < end) return { start, end }
  }
  return null
}

function spawnDebris(
  world: GameWorld,
  level: LevelDefinition,
  segments: HoleSegment[],
  shipWorldX: number,
  fuelFraction: number,
): void {
  const drift = level.hazards?.driftSpeed ?? 0
  const derelictChance = level.hazards?.derelictChance ?? 0
  for (;;) {
    const span = debrisWindowFor(segments, world.nextSpawnWorldX)
    if (!span) return
    if (world.nextSpawnWorldX < span.start) world.nextSpawnWorldX = span.start
    if (world.nextSpawnWorldX >= Math.min(shipWorldX + SPAWN_LOOKAHEAD, span.end)) return
    let type = pickDebrisType(Math.random(), level.id)
    if (type === 'asteroid' && fuelFraction < LOW_FUEL_FRACTION && Math.random() < LOW_FUEL_ORB_CHANCE) {
      type = 'satellite'
    }
    if (type === 'asteroid' && Math.random() < derelictChance) type = 'derelict'
    const side = Math.random() < 0.5 ? -1 : 1
    const corridor = level.corridorHalfWidth
    const offset = corridor + Math.random() * corridor * 1.6
    const hazard = type === 'asteroid' || type === 'derelict'
    // drifters lean toward the corridor more often than away from it
    const vy = hazard && drift > 0 ? (Math.random() - 0.3) * -side * drift : 0
    addObstacle(world, {
      type,
      worldX: world.nextSpawnWorldX,
      worldY: side * offset,
      radius: type === 'derelict' ? DERELICT_THICKNESS : radiusForType(type),
      seed: Math.random() * 10,
      vy,
      spin: type === 'derelict' ? (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.9) : 0,
      halfLength: type === 'derelict' ? 48 + Math.random() * 30 : undefined,
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
    addObstacle(world, {
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
      addObstacle(world, {
        type: 'asteroid',
        worldX: beltX + jitterX,
        worldY,
        radius,
        seed: seededRandom(beltX + i * 3.7) * 10,
        reinforced: true,
        hits: BELT_ROCK_HITS,
      })
    }

    const pickupLead = 900 + seededRandom(beltX * 1.7) * 700
    const pickupLateral =
      (seededRandom(beltX * 2.3) - 0.5) * 2 * (level.corridorHalfWidth + 120)
    addObstacle(world, {
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
    addObstacle(world, {
      type: escort.kind === 'moon' ? 'moon' : 'asteroid',
      worldX: escort.worldX,
      worldY: escort.worldY,
      radius: escort.kind === 'moon' ? 46 : 24,
      seed: escort.seed,
    })
  })
}

export function runSpawners(
  world: GameWorld,
  level: LevelDefinition,
  segments: HoleSegment[],
  shipWorldX: number,
  fuelFraction: number,
): void {
  spawnDebris(world, level, segments, shipWorldX, fuelFraction)
  spawnBlockades(world, level, shipWorldX)
  spawnBelts(world, level, shipWorldX)
  spawnEscorts(world, level, shipWorldX)
}
