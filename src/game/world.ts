// Mutable per-frame game state that lives outside React/Zustand on purpose:
// it changes every frame and nothing in the UI needs to re-render for it.
// Only the RAF loop and its systems read or write a GameWorld.

export type ObstacleType =
  | 'asteroid'
  | 'satellite'
  | 'booster'
  | 'blockade'
  | 'rocketPickup'
  | 'shieldPickup'
  | 'moon'

export interface Obstacle {
  id: number
  type: ObstacleType
  worldX: number
  worldY: number
  radius: number
  seed: number
  reinforced?: boolean
  hitsRemaining?: number
}

export interface Projectile {
  id: number
  worldX: number
  worldY: number
}

export interface Explosion {
  id: number
  worldX: number
  worldY: number
  startTime: number
}

export const FIRST_SPAWN_WORLD_X = 2200

export interface GameWorld {
  obstacles: Obstacle[]
  projectiles: Projectile[]
  explosions: Explosion[]
  nextSpawnWorldX: number
  nextId: number
  invulnerableTimer: number
  suckInElapsed: number
  escapeSide: -1 | 1
  prevWorldX: number
  guideFlash: number
  approachArmed: boolean
  lastSegmentHoleX: number | null
  boostTimer: number
  smoothedBoost: number
  boostCooldown: number
  lastBoostRequestId: number
  fuelCacheTaken: boolean
  refuelMessageTimer: number
  pickupBoostTimer: number
  spawnedBlockades: Set<number>
  spawnedEscorts: Set<number>
  spawnedBelts: Set<number>
  lastFireRequestId: number
}

export function createWorld(): GameWorld {
  return {
    obstacles: [],
    projectiles: [],
    explosions: [],
    nextSpawnWorldX: FIRST_SPAWN_WORLD_X,
    nextId: 0,
    invulnerableTimer: 0,
    suckInElapsed: 0,
    escapeSide: -1,
    prevWorldX: 0,
    guideFlash: 0,
    approachArmed: false,
    lastSegmentHoleX: null,
    boostTimer: 0,
    smoothedBoost: 0,
    boostCooldown: 0,
    lastBoostRequestId: 0,
    fuelCacheTaken: false,
    refuelMessageTimer: 0,
    pickupBoostTimer: 0,
    spawnedBlockades: new Set(),
    spawnedEscorts: new Set(),
    spawnedBelts: new Set(),
    lastFireRequestId: 0,
  }
}

// A run restart rewinds worldX; clear the field with it. Request ids and the
// obstacle id counter carry over so stale requests never replay.
export function resetWorldForRun(world: GameWorld): void {
  world.obstacles = []
  world.nextSpawnWorldX = FIRST_SPAWN_WORLD_X
  world.suckInElapsed = 0
  world.guideFlash = 0
  world.approachArmed = false
  world.lastSegmentHoleX = null
  world.boostTimer = 0
  world.smoothedBoost = 0
  world.boostCooldown = 0
  world.fuelCacheTaken = false
  world.refuelMessageTimer = 0
  world.pickupBoostTimer = 0
  world.spawnedBlockades.clear()
  world.spawnedEscorts.clear()
  world.spawnedBelts.clear()
  world.projectiles = []
  world.explosions = []
}
