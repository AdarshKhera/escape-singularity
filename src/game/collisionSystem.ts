import { useGameStore } from '../state/gameStore'
import {
  PICKUP_BOOST_SECONDS,
  SATELLITE_FUEL_REWARD,
  SHIP_RADIUS,
} from '../levels/worldConfig'
import { obstacleExtent, obstacleSurfaceDistance } from './geometry'
import { onBoost, onNearMiss, onPickup } from './gameEvents'
import { damageShip } from './damage'
import type { GameWorld, Obstacle } from './world'

// obstacles this far behind the ship are culled
const CULL_BEHIND = 1200
// anything this far off the lane (spent comets) is culled too
const CULL_LATERAL = 2600
// a hazard that passes within this hull gap without touching counts as a
// near miss
export const NEAR_MISS_GAP = 26

function isHazard(o: Obstacle): boolean {
  return (
    o.type === 'asteroid' ||
    o.type === 'blockade' ||
    o.type === 'moon' ||
    o.type === 'derelict' ||
    o.type === 'comet'
  )
}

function collectPickup(world: GameWorld, obstacle: Obstacle, shipWorldX: number, lateral: number): boolean {
  const store = useGameStore.getState()
  switch (obstacle.type) {
    case 'satellite':
      store.addFuel(SATELLITE_FUEL_REWARD)
      onPickup(world, obstacle, 'FUEL')
      return true
    case 'booster':
      world.pickupBoostTimer = PICKUP_BOOST_SECONDS
      onPickup(world, obstacle, 'SUPER FUEL')
      onBoost(world, shipWorldX, lateral)
      return true
    case 'rocketPickup':
      store.addAmmo(3)
      onPickup(world, obstacle, '+3 ROCKETS')
      return true
    case 'shieldPickup':
      store.addShield()
      onPickup(world, obstacle, 'SHIELD')
      return true
    default:
      return false
  }
}

function trackNearMiss(world: GameWorld, obstacle: Obstacle, gap: number, shipWorldX: number, lateral: number) {
  if (gap < obstacle.closestGap) obstacle.closestGap = gap
  if (obstacle.nearMissScored || obstacle.closestGap >= NEAR_MISS_GAP) return
  // only judged once it has fully slipped past the hull
  if (obstacle.worldX + obstacleExtent(obstacle) < shipWorldX - SHIP_RADIUS) {
    obstacle.nearMissScored = true
    onNearMiss(world, shipWorldX, lateral)
  }
}

function keepObstacle(world: GameWorld, obstacle: Obstacle, shipWorldX: number, lateral: number): boolean {
  if (obstacle.worldX < shipWorldX - CULL_BEHIND) return false
  if (Math.abs(obstacle.worldY) > CULL_LATERAL) return false
  // cheap reject before the exact shape test
  const reach = obstacleExtent(obstacle) + SHIP_RADIUS + NEAR_MISS_GAP
  if (Math.abs(obstacle.worldX - shipWorldX) > reach + 400) return true

  const gap = obstacleSurfaceDistance(obstacle, shipWorldX, lateral) - SHIP_RADIUS
  if (gap > 0) {
    if (isHazard(obstacle)) trackNearMiss(world, obstacle, gap, shipWorldX, lateral)
    return true
  }

  if (collectPickup(world, obstacle, shipWorldX, lateral)) return false
  // a hit consumes the obstacle; while invulnerable it passes through
  obstacle.nearMissScored = true
  return !damageShip(world, shipWorldX, lateral)
}

// Resolves ship-vs-obstacle contact and culls what's fallen behind. Compacts
// the obstacle array in place rather than allocating a new one every frame.
export function resolveObstacleCollisions(world: GameWorld, shipWorldX: number, lateral: number): void {
  const obstacles = world.obstacles
  let write = 0
  for (let read = 0; read < obstacles.length; read++) {
    const obstacle = obstacles[read]
    if (keepObstacle(world, obstacle, shipWorldX, lateral)) obstacles[write++] = obstacle
  }
  obstacles.length = write
}
