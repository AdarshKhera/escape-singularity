// Mutable per-frame game state that lives outside React/Zustand on purpose:
// it changes every frame and nothing in the UI needs to re-render for it.
// Only the RAF loop and its systems read or write a GameWorld.

import { createFeedback, resetFeedback, type Feedback } from './feedback'
import { ParticlePool } from './particles'

export type ObstacleType =
  | 'asteroid'
  | 'satellite'
  | 'booster'
  | 'blockade'
  | 'rocketPickup'
  | 'shieldPickup'
  | 'moon'
  | 'derelict'
  | 'comet'

export interface Obstacle {
  id: number
  type: ObstacleType
  worldX: number
  worldY: number
  radius: number
  seed: number
  /** own motion, world units per second (comets, showers, drifting rocks) */
  vx: number
  vy: number
  /** rotation, radians and radians/second (derelicts spin) */
  angle: number
  spin: number
  /** derelicts: half the length of the spinning wreck */
  halfLength?: number
  reinforced?: boolean
  hitsRemaining?: number
  maxHits?: number
  /** seconds of white hit-flash left after an armour hit */
  hitFlash: number
  /** smallest hull gap seen so far, for near-miss scoring */
  closestGap: number
  nearMissScored: boolean
}

export interface Projectile {
  id: number
  worldX: number
  worldY: number
  /** seconds alive, drives the trail and wobble */
  age: number
}

export interface Ring {
  worldX: number
  worldY: number
  /** game seconds at spawn */
  start: number
  duration: number
  /** world units at the end of the expansion */
  maxRadius: number
  rgb: string
}

export interface Popup {
  text: string
  worldX: number
  worldY: number
  start: number
  rgb: string
}

/** A telegraph for an incoming hazard, drawn at the screen edge. */
export interface Warning {
  kind: 'shower' | 'comet'
  /** lateral side it comes from: -1 above, 1 below, 0 straight ahead */
  side: -1 | 0 | 1
  /** real seconds left */
  timer: number
}

export interface PendingShower {
  /** game seconds until the rocks arrive */
  timer: number
  index: number
}

export interface PlanetPass {
  /** closest approach so far, in planet radii from the centre */
  minRatio: number
  touched: boolean
  done: boolean
}

export const FIRST_SPAWN_WORLD_X = 2200

export interface GameWorld {
  obstacles: Obstacle[]
  projectiles: Projectile[]
  rings: Ring[]
  popups: Popup[]
  warnings: Warning[]
  pendingShowers: PendingShower[]
  particles: ParticlePool
  feedback: Feedback
  /** game clock in seconds: freezes on hit-stop, slows in slow-mo */
  simTime: number
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
  slingshotTimer: number
  fireCooldown: number
  spawnedBlockades: Set<number>
  spawnedEscorts: Set<number>
  spawnedBelts: Set<number>
  spawnedShowers: Set<number>
  spawnedComets: Set<number>
  planetPasses: Map<string, PlanetPass>
  /** blackHoleX of every hole already escaped this attempt */
  escapedHoles: Set<number>
  /** smallest horizon gap for the current hole, for its skim bonus */
  segmentMinGap: number
  lastFireRequestId: number
  /** transient banner (slingshot, warnings, intros) and its remaining seconds */
  eventBanner: string | null
  eventBannerTimer: number
  introShown: boolean
  /** attempt clock in game ms, and when it was last pushed to the store */
  runTimeMs: number
  runTimePushedMs: number
  /** fractional thruster particles carried between frames */
  thrusterCarry: number
  /** last frame's camera scale (screen px per world unit), for screen-sized effects */
  viewScale: number
}

export function createWorld(): GameWorld {
  return {
    obstacles: [],
    projectiles: [],
    rings: [],
    popups: [],
    warnings: [],
    pendingShowers: [],
    particles: new ParticlePool(),
    feedback: createFeedback(),
    simTime: 0,
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
    slingshotTimer: 0,
    fireCooldown: 0,
    spawnedBlockades: new Set(),
    spawnedEscorts: new Set(),
    spawnedBelts: new Set(),
    spawnedShowers: new Set(),
    spawnedComets: new Set(),
    planetPasses: new Map(),
    escapedHoles: new Set(),
    segmentMinGap: Infinity,
    lastFireRequestId: 0,
    eventBanner: null,
    eventBannerTimer: 0,
    introShown: false,
    runTimeMs: 0,
    runTimePushedMs: 0,
    thrusterCarry: 0,
    viewScale: 0.62,
  }
}

// A run restart rewinds worldX; clear the field with it. Request ids and the
// obstacle id counter carry over so stale requests never replay.
export function resetWorldForRun(world: GameWorld): void {
  world.obstacles = []
  world.projectiles = []
  world.rings = []
  world.popups = []
  world.warnings = []
  world.pendingShowers = []
  world.particles.clear()
  resetFeedback(world.feedback)
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
  world.slingshotTimer = 0
  world.fireCooldown = 0
  world.spawnedBlockades.clear()
  world.spawnedEscorts.clear()
  world.spawnedBelts.clear()
  world.spawnedShowers.clear()
  world.spawnedComets.clear()
  world.planetPasses.clear()
  world.escapedHoles.clear()
  world.segmentMinGap = Infinity
  world.eventBanner = null
  world.eventBannerTimer = 0
  world.introShown = false
  world.runTimeMs = 0
  world.runTimePushedMs = 0
  world.thrusterCarry = 0
}

export interface ObstacleInit {
  type: ObstacleType
  worldX: number
  worldY: number
  radius: number
  seed: number
  vx?: number
  vy?: number
  spin?: number
  halfLength?: number
  reinforced?: boolean
  hits?: number
}

export function addObstacle(world: GameWorld, init: ObstacleInit): Obstacle {
  const obstacle: Obstacle = {
    id: world.nextId++,
    type: init.type,
    worldX: init.worldX,
    worldY: init.worldY,
    radius: init.radius,
    seed: init.seed,
    vx: init.vx ?? 0,
    vy: init.vy ?? 0,
    angle: init.seed,
    spin: init.spin ?? 0,
    halfLength: init.halfLength,
    reinforced: init.reinforced,
    hitsRemaining: init.hits,
    maxHits: init.hits,
    hitFlash: 0,
    closestGap: Infinity,
    nearMissScored: false,
  }
  world.obstacles.push(obstacle)
  return obstacle
}
