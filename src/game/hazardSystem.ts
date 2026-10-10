import { CRUISE_LANE_BOUND, SHIP_RADIUS } from '../levels/worldConfig'
import type { LevelDefinition } from '../levels/levels'
import { WELL_CORE_RADIUS } from '../physics/hazardFields'
import { seededRandom } from './spawnSystem'
import { onWarning } from './gameEvents'
import { damageShip } from './damage'
import { addObstacle, type GameWorld } from './world'

// ---- meteor showers ----
// Telegraphed: a warning banner and edge chevrons, then a few waves of small
// fast rocks sweep down the lane. Every wave leaves one gap wide enough to
// fly through, and consecutive gaps sit within a reachable distance of each
// other, so a shower is always survivable by steering alone.
const SHOWER_WARN_LEAD = 3800
const SHOWER_DELAY_SECONDS = 1.5
const SHOWER_WAVES = 3
const SHOWER_WAVE_SPACING = 620
const SHOWER_SPEED = 300
const SHOWER_SPAWN_AHEAD = 2500
export const SHOWER_GAP_HALF_WIDTH = 100
export const SHOWER_ROCK_SPACING = 74
export const SHOWER_MAX_GAP_SHIFT = 230
const SHOWER_SPAN = CRUISE_LANE_BOUND + 80
const SHOWER_ROCK_RADIUS_MIN = 13
const SHOWER_ROCK_RADIUS_MAX = 20

// Lateral centres of the open gap in each wave. Pure, so tests can check
// every gap is flyable and reachable from the last.
export function computeShowerGaps(seed: number, waves: number = SHOWER_WAVES): number[] {
  const limit = CRUISE_LANE_BOUND - SHOWER_GAP_HALF_WIDTH
  const gaps: number[] = []
  let centre = (seededRandom(seed) * 2 - 1) * limit
  for (let i = 0; i < waves; i++) {
    gaps.push(Math.round(centre))
    const shift = (seededRandom(seed + i * 7.3 + 1) * 2 - 1) * SHOWER_MAX_GAP_SHIFT
    centre = Math.max(-limit, Math.min(limit, centre + shift))
  }
  return gaps
}

// lateral positions of the rocks in one wave, leaving the gap clear
export function computeShowerWaveRocks(gapCentre: number): number[] {
  const rocks: number[] = []
  for (let y = -SHOWER_SPAN; y <= SHOWER_SPAN; y += SHOWER_ROCK_SPACING) {
    if (Math.abs(y - gapCentre) < SHOWER_GAP_HALF_WIDTH + SHOWER_ROCK_RADIUS_MAX) continue
    rocks.push(y)
  }
  return rocks
}

function spawnShower(world: GameWorld, shipWorldX: number, index: number): void {
  const seed = shipWorldX * 0.001 + index * 13.7 + world.nextId * 0.01
  const gaps = computeShowerGaps(seed)
  gaps.forEach((gap, wave) => {
    const waveX = shipWorldX + SHOWER_SPAWN_AHEAD + wave * SHOWER_WAVE_SPACING
    for (const y of computeShowerWaveRocks(gap)) {
      const r = SHOWER_ROCK_RADIUS_MIN + Math.random() * (SHOWER_ROCK_RADIUS_MAX - SHOWER_ROCK_RADIUS_MIN)
      addObstacle(world, {
        type: 'asteroid',
        worldX: waveX + (Math.random() - 0.5) * 70,
        worldY: y + (Math.random() - 0.5) * 16,
        radius: r,
        seed: Math.random() * 10,
        vx: -SHOWER_SPEED,
        spin: (Math.random() - 0.5) * 4,
      })
    }
  })
}

function updateShowers(world: GameWorld, level: LevelDefinition, shipWorldX: number, dt: number) {
  const showers = level.hazards?.showers
  if (!showers) return
  showers.forEach((showerX, index) => {
    if (world.spawnedShowers.has(index) || shipWorldX < showerX - SHOWER_WARN_LEAD) return
    world.spawnedShowers.add(index)
    world.pendingShowers.push({ timer: SHOWER_DELAY_SECONDS, index })
    world.warnings.push({ kind: 'shower', side: 0, timer: SHOWER_DELAY_SECONDS + 0.8 })
    onWarning(world, 'METEOR SHOWER INBOUND')
  })
  let keep = 0
  for (const pending of world.pendingShowers) {
    pending.timer -= dt
    if (pending.timer <= 0) spawnShower(world, shipWorldX, pending.index)
    else world.pendingShowers[keep++] = pending
  }
  world.pendingShowers.length = keep
}

// ---- comets ----
// A fast, bright body that cuts across the whole lane on a diagonal. It is
// launched from off-lane so its edge chevron shows before it's in view, and
// timed to cross the centreline roughly as the ship arrives.
const COMET_SPAWN_AHEAD = 2400
const COMET_LATERAL_SPEED = 340
const COMET_FORWARD_SPEED = -240
const COMET_START_OFFSET = CRUISE_LANE_BOUND + 480
export const COMET_RADIUS = 30

function updateComets(world: GameWorld, level: LevelDefinition, shipWorldX: number) {
  const comets = level.hazards?.comets
  if (!comets) return
  comets.forEach((cometX, index) => {
    if (world.spawnedComets.has(index) || shipWorldX < cometX - COMET_SPAWN_AHEAD) return
    world.spawnedComets.add(index)
    const side: -1 | 1 = seededRandom(cometX * 0.37 + index) < 0.5 ? -1 : 1
    addObstacle(world, {
      type: 'comet',
      worldX: shipWorldX + COMET_SPAWN_AHEAD,
      worldY: side * COMET_START_OFFSET,
      radius: COMET_RADIUS,
      seed: Math.random() * 10,
      vx: COMET_FORWARD_SPEED,
      vy: -side * COMET_LATERAL_SPEED,
    })
    world.warnings.push({ kind: 'comet', side, timer: 1.3 })
    onWarning(world, 'COMET INBOUND')
  })
}

// ---- gravity wells: lethal cores ----
function updateWellCores(world: GameWorld, level: LevelDefinition, shipWorldX: number, lateral: number) {
  const wells = level.hazards?.gravityWells
  if (!wells) return
  for (const well of wells) {
    const d = Math.hypot(shipWorldX - well.worldX, lateral - well.worldY)
    if (d < WELL_CORE_RADIUS + SHIP_RADIUS * 0.6) damageShip(world, shipWorldX, lateral)
  }
}

// own motion for every obstacle that has any, plus hit-flash decay
function moveObstacles(world: GameWorld, dt: number) {
  for (const o of world.obstacles) {
    if (o.vx !== 0) o.worldX += o.vx * dt
    if (o.vy !== 0) o.worldY += o.vy * dt
    if (o.spin !== 0) o.angle += o.spin * dt
    if (o.hitFlash > 0) o.hitFlash -= dt
  }
}

function tickWarnings(world: GameWorld, dt: number) {
  let keep = 0
  for (const w of world.warnings) {
    w.timer -= dt
    if (w.timer > 0) world.warnings[keep++] = w
  }
  world.warnings.length = keep
}

export function updateHazards(
  world: GameWorld,
  level: LevelDefinition,
  shipWorldX: number,
  lateral: number,
  dt: number,
): void {
  moveObstacles(world, dt)
  updateShowers(world, level, shipWorldX, dt)
  updateComets(world, level, shipWorldX)
  updateWellCores(world, level, shipWorldX, lateral)
  tickWarnings(world, dt)
}

