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
import { computeFuelDrainRate, stepShip, type ShipControls } from './shipStep'
import { runSpawners } from './spawnSystem'
import { resolveObstacleCollisions } from './collisionSystem'
import { handleFireRequest, stepProjectiles } from './combatSystem'
import { updateHazards } from './hazardSystem'
import { SLINGSHOT_SPEED, updatePlanets } from './planetSystem'
import { INVULNERABLE_SECONDS } from './damage'
import { computeSkimBonus } from './scoring'
import { onBoost, onEscape, onFuelCache, showEventBanner } from './gameEvents'
import { emitThrusters } from './thrusters'

// the approach warning fires this far ahead of the pull window opening
const EARLY_WARNING_LEAD = 2600
const REFUEL_MESSAGE_SECONDS = 1.6
const INTRO_BANNER_SECONDS = 4
const ESCAPE_BANNER_SECONDS = 1.8
// how often the attempt clock is pushed to the store (ms of game time)
const RUN_TIME_PUSH_MS = 250

export interface FrameContext {
  level: LevelDefinition
  layout: HoleSegment
  /** every hole passage in the level, in order */
  segments: HoleSegment[]
  /** end of the whole level: the LAST hole segment's levelEndX */
  levelEndX: number
  /** simulation seconds this frame (already time-scaled) */
  dt: number
}

function resolveBanner(world: GameWorld, phase: LevelPhase): string | null {
  if (world.eventBannerTimer > 0 && world.eventBanner) return world.eventBanner
  if (world.guideFlash > 0) return 'BLACK HOLE APPROACHING'
  if (world.refuelMessageTimer > 0) return 'FUEL CACHE COLLECTED'
  if (phase === 'escape') return 'ESCAPING'
  if (phase === 'clear') return 'COURSE CORRECTED'
  return null
}

function updateTimers(world: GameWorld, shipWorldX: number, layout: HoleSegment, dt: number) {
  // warn well before the pull window actually opens, so the player has
  // time to read it and choose a line rather than react to it
  if (!world.approachArmed && shipWorldX >= layout.approachStartX - EARLY_WARNING_LEAD) {
    world.approachArmed = true
    world.guideFlash = GUIDE_FLASH_SECONDS
  }
  if (world.guideFlash > 0) world.guideFlash -= dt
  if (world.refuelMessageTimer > 0) world.refuelMessageTimer -= dt
  if (world.eventBannerTimer > 0) world.eventBannerTimer -= dt
  if (world.slingshotTimer > 0) world.slingshotTimer -= dt
  if (world.pickupBoostTimer > 0) world.pickupBoostTimer -= dt
}

// the single pre-approach fuel cache — must actually be flown through
function checkFuelCache(world: GameWorld, shipWorldX: number, lateral: number, layout: HoleSegment) {
  if (world.fuelCacheTaken) return
  if (Math.hypot(layout.fuelCacheX - shipWorldX, lateral) < FUEL_CACHE_RADIUS + SHIP_RADIUS) {
    world.fuelCacheTaken = true
    useGameStore.getState().addFuel(FUEL_MAX)
    world.refuelMessageTimer = REFUEL_MESSAGE_SECONDS
    onFuelCache(world, layout.fuelCacheX, 0)
  }
}

// double-tap boost: a burst, then a cooldown that starts once it ends
function updateBoost(world: GameWorld, boostRequestId: number, dt: number, x: number, y: number) {
  if (
    boostRequestId !== world.lastBoostRequestId &&
    world.boostTimer <= 0 &&
    world.boostCooldown <= 0
  ) {
    world.boostTimer = BOOST_SECONDS
    onBoost(world, x, y)
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

function updateRunClock(world: GameWorld, dt: number) {
  world.runTimeMs += dt * 1000
  if (world.runTimeMs - world.runTimePushedMs >= RUN_TIME_PUSH_MS) {
    world.runTimePushedMs = world.runTimeMs
    useGameStore.getState().setRunTime(Math.round(world.runTimeMs))
  }
}

// horizon bookkeeping: closest approach while the pull is live, then the
// escape beat (slow-mo, flash, skim bonus) the moment the hole is cleared
function updateHorizon(world: GameWorld, layout: HoleSegment, shipWorldX: number, lateral: number) {
  if (shipWorldX >= layout.approachStartX && shipWorldX < layout.escapeClearX) {
    const gap = Math.hypot(layout.blackHoleX - shipWorldX, lateral) - layout.holeRadius
    if (gap < world.segmentMinGap) {
      world.segmentMinGap = gap
      useGameStore.getState().recordHorizonGap(gap, layout.holeRadius)
    }
  }
  if (shipWorldX >= layout.escapeClearX && !world.escapedHoles.has(layout.blackHoleX)) {
    world.escapedHoles.add(layout.blackHoleX)
    showEventBanner(world, 'ESCAPED', ESCAPE_BANNER_SECONDS)
    onEscape(world, shipWorldX, lateral, computeSkimBonus(world.segmentMinGap, layout.holeRadius))
  }
}

function showIntro(world: GameWorld, level: LevelDefinition) {
  if (world.introShown) return
  world.introShown = true
  if (level.intro) showEventBanner(world, level.intro, INTRO_BANNER_SECONDS)
}

export function updatePlaying(world: GameWorld, frame: FrameContext): void {
  const { level, layout, dt } = frame
  const store = useGameStore.getState()
  const shipWorldX = store.shipWorldX
  const phase = resolvePhase(shipWorldX, layout)
  if (phase !== store.phase) store.setPhase(phase)

  showIntro(world, level)
  updateTimers(world, shipWorldX, layout, dt)

  // lock in which way the player committed, for the guide path
  if (phase === 'approach' && store.shipLateral !== 0) {
    world.escapeSide = store.shipLateral < 0 ? -1 : 1
  }

  checkFuelCache(world, shipWorldX, store.shipLateral, layout)
  updateBoost(world, store.boostRequestId, dt, shipWorldX, store.shipLateral)

  const time = world.simTime
  const ship = {
    worldX: shipWorldX,
    lateral: store.shipLateral,
    lateralVelocity: store.shipLateralVelocity,
    forwardSpeed: store.shipForwardSpeed,
  }
  const controls: ShipControls = {
    bank: store.bankInput,
    throttle: store.throttleInput,
    hasFuel: store.fuel > 0,
    boosting: world.boostTimer > 0,
    pickupBoosting: world.pickupBoostTimer > 0,
    extraSpeed: world.slingshotTimer > 0 ? SLINGSHOT_SPEED : 0,
  }
  const env = { level, layout, phase, time }
  const drainRate = computeFuelDrainRate(controls, env, ship)
  if (drainRate > 0 && store.fuel > 0) store.drainFuel(drainRate * dt)

  const next = stepShip(ship, controls, env, dt)
  store.tickShip(next.worldX, next.lateral, next.lateralVelocity, next.forwardSpeed)

  const banner = resolveBanner(world, phase)
  if (banner !== store.bannerMessage) store.setBannerMessage(banner)

  updateInvulnerability(world, dt)
  updateRunClock(world, dt)
  emitThrusters(world, next, controls, phase, dt)
  runSpawners(world, level, frame.segments, next.worldX, useGameStore.getState().fuel / FUEL_MAX)
  updateHazards(world, level, next.worldX, next.lateral, dt)
  updatePlanets(world, level, layout.blackHoleX, next.worldX, next.lateral, time)
  resolveObstacleCollisions(world, next.worldX, next.lateral)
  handleFireRequest(world, next.worldX, next.lateral, next.forwardSpeed)
  stepProjectiles(world, next.worldX, dt)
  updateHorizon(world, layout, next.worldX, next.lateral)

  if (useGameStore.getState().status !== 'playing') return
  // caught by the horizon
  const distanceToCentre = Math.hypot(layout.blackHoleX - next.worldX, next.lateral)
  if (distanceToCentre <= layout.holeRadius) {
    world.suckInElapsed = 0
    useGameStore.getState().beginSuckIn()
  } else if (next.worldX >= frame.levelEndX) {
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
