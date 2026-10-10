import type {
  GravityWellDefinition,
  IonCloudDefinition,
  LevelDefinition,
} from '../levels/levelTypes'

// ---- gravity wells ----
//
// A micro-singularity that charges and discharges on a cycle. While charged
// it drags the ship toward its core; the core itself is lethal. Peak pull is
// authored per well but always kept under the ship's steering authority, so
// a charged well is a hazard to steer against, never a trap.
export const WELL_CORE_RADIUS = 48
export const WELL_FIELD_RADIUS = 1150
const WELL_MAX_STRENGTH = 1900

// 0..1: how charged the well is right now. A sharpened sine, so it spends a
// clear stretch fully off (safe to cross) and ramps visibly before biting.
export function wellActivation(well: GravityWellDefinition, time: number): number {
  const s = Math.sin((time * Math.PI * 2) / well.period + (well.phase ?? 0))
  const t = Math.min(Math.max((s + 0.15) / 0.75, 0), 1)
  return t * t * (3 - 2 * t)
}

// Lateral acceleration toward the well. dx/dy are ship minus well centre.
export function computeWellAccelY(
  dx: number,
  dy: number,
  strength: number,
  activation: number,
): number {
  if (activation <= 0) return 0
  const distance = Math.hypot(dx, dy)
  if (distance >= WELL_FIELD_RADIUS || distance < 1e-6) return 0
  const reach = 1 - Math.max(distance - WELL_CORE_RADIUS, 0) / (WELL_FIELD_RADIUS - WELL_CORE_RADIUS)
  const magnitude = Math.min(strength, WELL_MAX_STRENGTH) * activation * reach * reach
  return (-dy / distance) * magnitude
}

export function computeWellsAccelY(
  level: LevelDefinition,
  shipWorldX: number,
  lateral: number,
  time: number,
): number {
  const wells = level.hazards?.gravityWells
  if (!wells) return 0
  let accel = 0
  for (const well of wells) {
    const dx = shipWorldX - well.worldX
    if (Math.abs(dx) >= WELL_FIELD_RADIUS) continue
    accel += computeWellAccelY(dx, lateral - well.worldY, well.strength, wellActivation(well, time))
  }
  return accel
}

// ---- ion clouds ----
//
// Not lethal: inside one, the thrusters lose bite and the tank bleeds. Clouds
// are elliptical so their edge reads cleanly against the starfield.
export const ION_STEER_SCALE = 0.55
export const ION_FUEL_DRAIN_PER_SECOND = 14

export function ionCloudContains(
  cloud: IonCloudDefinition,
  shipWorldX: number,
  lateral: number,
): boolean {
  const nx = (shipWorldX - cloud.worldX) / (cloud.length / 2)
  const ny = (lateral - cloud.worldY) / cloud.halfHeight
  return nx * nx + ny * ny <= 1
}

export function isInIonCloud(level: LevelDefinition, shipWorldX: number, lateral: number): boolean {
  const clouds = level.hazards?.ionClouds
  if (!clouds) return false
  for (const cloud of clouds) {
    if (ionCloudContains(cloud, shipWorldX, lateral)) return true
  }
  return false
}
