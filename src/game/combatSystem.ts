import { useGameStore } from '../state/gameStore'
import { ROCKET_SPEED, SHIP_RADIUS } from '../levels/worldConfig'
import type { GameWorld, Obstacle, Projectile } from './world'

export const EXPLOSION_MS = 350
// rockets that miss keep flying this far ahead before they're dropped
const PROJECTILE_RANGE = 4000

export function handleFireRequest(world: GameWorld, shipWorldX: number, lateral: number): void {
  const store = useGameStore.getState()
  if (store.fireRequestId === world.lastFireRequestId) return
  world.lastFireRequestId = store.fireRequestId
  if (!store.hasWeapon || store.ammo <= 0) return
  store.consumeAmmo()
  world.projectiles.push({
    id: world.nextId++,
    worldX: shipWorldX + SHIP_RADIUS,
    worldY: lateral,
  })
}

function isShootable(obstacle: Obstacle): boolean {
  return obstacle.type === 'asteroid' || obstacle.type === 'blockade' || obstacle.type === 'moon'
}

function findHit(obstacles: Obstacle[], projectile: Projectile): number {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i]
    if (!isShootable(o)) continue
    if (Math.hypot(o.worldX - projectile.worldX, o.worldY - projectile.worldY) < o.radius + 6) {
      return i
    }
  }
  return -1
}

// projectiles: one-shot kill on the first asteroid, moon, or blockade they
// reach — reinforced rocks (belt walls) take several hits before they
// actually break — with a blast left behind on every hit
export function stepProjectiles(
  world: GameWorld,
  shipWorldX: number,
  dt: number,
  now: number,
): void {
  const projectiles = world.projectiles
  let write = 0
  for (let read = 0; read < projectiles.length; read++) {
    const p = projectiles[read]
    p.worldX += ROCKET_SPEED * dt
    if (p.worldX > shipWorldX + PROJECTILE_RANGE) continue

    const hitIndex = findHit(world.obstacles, p)
    if (hitIndex >= 0) {
      const hit = world.obstacles[hitIndex]
      world.explosions.push({
        id: world.nextId++,
        worldX: hit.worldX,
        worldY: hit.worldY,
        startTime: now,
      })
      if (hit.hitsRemaining && hit.hitsRemaining > 1) {
        hit.hitsRemaining -= 1
      } else {
        world.obstacles.splice(hitIndex, 1)
      }
      continue
    }
    projectiles[write++] = p
  }
  projectiles.length = write

  // explosions burn out after a third of a second
  let keep = 0
  for (let i = 0; i < world.explosions.length; i++) {
    const e = world.explosions[i]
    if (now - e.startTime < EXPLOSION_MS) world.explosions[keep++] = e
  }
  world.explosions.length = keep
}
