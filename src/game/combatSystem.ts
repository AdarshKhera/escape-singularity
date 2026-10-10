import { useGameStore } from '../state/gameStore'
import { audioEngine } from '../audio/AudioEngine'
import { ROCKET_SPEED, SHIP_RADIUS } from '../levels/worldConfig'
import { obstacleSurfaceDistance } from './geometry'
import { onArmourHit, onFire, onKill } from './gameEvents'
import { PC } from './particles'
import type { GameWorld, Obstacle, Projectile } from './world'

// rockets that miss keep flying this far ahead before they're dropped
const PROJECTILE_RANGE = 4200
const PROJECTILE_RADIUS = 6
// spamming isn't free: a short re-arm between shots
export const FIRE_COOLDOWN_SECONDS = 0.32
// rocket trail density, particles per second of flight
const TRAIL_RATE = 70

export function handleFireRequest(
  world: GameWorld,
  shipWorldX: number,
  lateral: number,
  shipSpeed: number,
): void {
  const store = useGameStore.getState()
  if (store.fireRequestId === world.lastFireRequestId) return
  world.lastFireRequestId = store.fireRequestId
  if (!store.hasWeapon || store.ammo <= 0) return
  if (world.fireCooldown > 0) {
    audioEngine.playSfx('dryFire')
    return
  }
  world.fireCooldown = FIRE_COOLDOWN_SECONDS
  store.consumeAmmo()
  const x = shipWorldX + SHIP_RADIUS
  world.projectiles.push({ id: world.nextId++, worldX: x, worldY: lateral, age: 0 })
  onFire(world, x, lateral)
  // the launch kicks back a touch against the ship's own speed
  world.particles.burst(x, lateral, 4, 120, 0.25, 2.2, PC.fire, true, shipSpeed * 0.5)
}

function isShootable(obstacle: Obstacle): boolean {
  return (
    obstacle.type === 'asteroid' ||
    obstacle.type === 'blockade' ||
    obstacle.type === 'moon' ||
    obstacle.type === 'derelict' ||
    obstacle.type === 'comet'
  )
}

function findHit(obstacles: Obstacle[], projectile: Projectile): number {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i]
    if (!isShootable(o)) continue
    if (obstacleSurfaceDistance(o, projectile.worldX, projectile.worldY) < PROJECTILE_RADIUS) return i
  }
  return -1
}

function resolveHit(world: GameWorld, hitIndex: number, projectile: Projectile): void {
  const hit = world.obstacles[hitIndex]
  if (hit.hitsRemaining && hit.hitsRemaining > 1) {
    hit.hitsRemaining -= 1
    onArmourHit(world, hit, projectile.worldX, projectile.worldY)
    return
  }
  world.obstacles.splice(hitIndex, 1)
  onKill(world, hit)
}

// projectiles: one-shot kill on the first rock, moon, blockade, derelict or
// comet they reach — reinforced rocks (belt walls) take several hits and
// show cracks in between. Misses fly on until out of range.
export function stepProjectiles(world: GameWorld, shipWorldX: number, dt: number): void {
  if (world.fireCooldown > 0) world.fireCooldown -= dt
  const projectiles = world.projectiles
  let write = 0
  for (let read = 0; read < projectiles.length; read++) {
    const p = projectiles[read]
    p.age += dt
    p.worldX += ROCKET_SPEED * dt
    if (p.worldX > shipWorldX + PROJECTILE_RANGE) continue

    const trailCount = Math.random() < TRAIL_RATE * dt ? 1 : 0
    for (let n = 0; n < trailCount + 1; n++) {
      world.particles.spawn(
        p.worldX - 14,
        p.worldY + (Math.random() - 0.5) * 4,
        ROCKET_SPEED * 0.25,
        (Math.random() - 0.5) * 40,
        0.28 + Math.random() * 0.12,
        1.6 + Math.random() * 1.6,
        n === 0 ? PC.fire : PC.spark,
        3,
      )
    }

    const hitIndex = findHit(world.obstacles, p)
    if (hitIndex >= 0) {
      resolveHit(world, hitIndex, p)
      continue
    }
    projectiles[write++] = p
  }
  projectiles.length = write
}
