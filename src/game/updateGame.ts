import { useGameStore } from '../state/gameStore'
import {
  BOOST_COOLDOWN_SECONDS,
  BOOST_SECONDS,
  FUEL_CACHE_RADIUS,
  FUEL_MAX,
  GUIDE_FLASH_SECONDS,
  SHIP_RADIUS,
  SUCK_IN_SECONDS,
  resolvePhase,
  type LevelPhase,
} from '../levels/worldConfig'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import type { GameWorld } from './world'
import { computeFuelDrainRate, stepShip } from './shipStep'
import { runSpawners } from './spawnSystem'
import { INVULNERABLE_SECONDS, resolveObstacleCollisions } from './collisionSystem'
import { handleFireRequest, stepProjectiles } from './combatSystem'

// the approach warning fires this far ahead of the pull window opening
const EARLY_WARNING_LEAD = 2600
const REFUEL_MESSAGE_SECONDS = 1.6

export interface FrameContext {
  level: LevelDefinition
  layout: HoleSegment
  dt: number
  /** seconds */
  time: number
  /** ms, performance.now() */
  now: number
}

function resolveBanner(world: GameWorld, phase: LevelPhase): string | null {
  if (world.refuelMessageTimer > 0) return 'FUEL CACHE COLLECTED'
  if (world.guideFlash > 0) return 'BLACK HOLE APPROACHING'
  if (phase === 'escape') return 'ESCAPING'
  if (phase === 'clear') return 'COURSE CORRECTED'
  return null
}

function updateWarnings(world: GameWorld, shipWorldX: number, layout: HoleSegment, dt: number) {
  // warn well before the pull window actually opens, so the player has
  // time to read it and choose a line rather than react to it
  if (!world.approachArmed && shipWorldX >= layout.approachStartX - EARLY_WARNING_LEAD) {
    world.approachArmed = true
    world.guideFlash = GUIDE_FLASH_SECONDS
  }
  if (world.guideFlash > 0) world.guideFlash -= dt
  if (world.refuelMessageTimer > 0) world.refuelMessageTimer -= dt
}

// the single pre-approach fuel cache — must actually be flown through
function checkFuelCache(world: GameWorld, shipWorldX: number, lateral: number, layout: HoleSegment) {
  if (world.fuelCacheTaken) return
  const cacheDx = layout.fuelCacheX - shipWorldX
  if (Math.hypot(cacheDx, lateral) < FUEL_CACHE_RADIUS + SHIP_RADIUS) {
    world.fuelCacheTaken = true
    useGameStore.getState().addFuel(FUEL_MAX)
    world.refuelMessageTimer = REFUEL_MESSAGE_SECONDS
  }
}

// double-tap boost: a burst, then a cooldown that starts once it ends
function updateBoost(world: GameWorld, boostRequestId: number, dt: number) {
  if (
    boostRequestId !== world.lastBoostRequestId &&
    world.boostTimer <= 0 &&
    world.boostCooldown <= 0
  ) {
    world.boostTimer = BOOST_SECONDS
  }
  world.lastBoostRequestId = boostRequestId

  const wasBoosting = world.boostTimer > 0
  if (world.boostTimer > 0) world.boostTimer -= dt
  if (wasBoosting && world.boostTimer <= 0) world.boostCooldown = BOOST_COOLDOWN_SECONDS
  if (world.boostCooldown > 0) world.boostCooldown -= dt
}

function updateInvulnerability(world: GameWorld, dt: number) {
  if (world.invulnerableTimer <= 0) return
  world.invulnerableTimer -= dt
  if (world.invulnerableTimer <= 0) useGameStore.setState({ invulnerable: false })
}

export function updatePlaying(world: GameWorld, frame: FrameContext): void {
  const { level, layout, dt, time, now } = frame
  const store = useGameStore.getState()
  const shipWorldX = store.shipWorldX
  const phase = resolvePhase(shipWorldX, layout)
  if (phase !== store.phase) store.setPhase(phase)

  updateWarnings(world, shipWorldX, layout, dt)
  const banner = resolveBanner(world, phase)
  if (banner !== store.bannerMessage) store.setBannerMessage(banner)

  // lock in which way the player committed, for the guide path
  if (phase === 'approach' && store.shipLateral !== 0) {
    world.escapeSide = store.shipLateral < 0 ? -1 : 1
  }

  checkFuelCache(world, shipWorldX, store.shipLateral, layout)

  const pickupBoosting = world.pickupBoostTimer > 0
  if (world.pickupBoostTimer > 0) world.pickupBoostTimer -= dt
  updateBoost(world, store.boostRequestId, dt)

  const controls = {
    bank: store.bankInput,
    throttle: store.throttleInput,
    hasFuel: store.fuel > 0,
    boosting: world.boostTimer > 0,
    pickupBoosting,
  }
  const drainRate = computeFuelDrainRate(controls)
  if (drainRate > 0 && store.fuel > 0) store.drainFuel(drainRate * dt)

  const next = stepShip(
    {
      worldX: shipWorldX,
      lateral: store.shipLateral,
      lateralVelocity: store.shipLateralVelocity,
      forwardSpeed: store.shipForwardSpeed,
    },
    controls,
    { level, layout, phase, time },
    dt,
  )
  store.tickShip(next.worldX, next.lateral, next.lateralVelocity, next.forwardSpeed)

  updateInvulnerability(world, dt)
  runSpawners(world, level, next.worldX)
  resolveObstacleCollisions(world, next.worldX, next.lateral)
  handleFireRequest(world, next.worldX, next.lateral)
  stepProjectiles(world, next.worldX, dt, now)

  // caught by the horizon
  const distanceToCentre = Math.hypot(layout.blackHoleX - next.worldX, next.lateral)
  if (distanceToCentre <= layout.holeRadius) {
    world.suckInElapsed = 0
    useGameStore.getState().beginSuckIn()
  } else if (next.worldX >= layout.levelEndX) {
    useGameStore.getState().completeLevel()
  }
}

export function updateSuckedIn(world: GameWorld, dt: number): void {
  world.suckInElapsed += dt
  if (world.suckInElapsed >= SUCK_IN_SECONDS) {
    useGameStore.getState().loseLife('blackhole')
    world.invulnerableTimer = INVULNERABLE_SECONDS
  }
}
