import { useGameStore } from '../state/gameStore'
import {
  PICKUP_BOOST_SECONDS,
  SATELLITE_FUEL_REWARD,
  SHIP_RADIUS,
} from '../levels/worldConfig'
import type { GameWorld, Obstacle } from './world'

export const INVULNERABLE_SECONDS = 1.4
// obstacles this far behind the ship are culled
const CULL_BEHIND = 1200

function collectPickup(world: GameWorld, obstacle: Obstacle): boolean {
  const store = useGameStore.getState()
  switch (obstacle.type) {
    case 'satellite':
      store.addFuel(SATELLITE_FUEL_REWARD)
      return true
    case 'booster':
      world.pickupBoostTimer = PICKUP_BOOST_SECONDS
      return true
    case 'rocketPickup':
      store.addAmmo(3)
      return true
    case 'shieldPickup':
      store.addShield()
      return true
    default:
      return false
  }
}

// asteroid, blockade or moon: a held shield absorbs the hit for free
function takeHit(world: GameWorld): boolean {
  const store = useGameStore.getState()
  if (store.invulnerable) return false
  if (store.shieldCharges > 0) {
    store.consumeShield()
  } else {
    store.loseLife('collision')
  }
  world.invulnerableTimer = INVULNERABLE_SECONDS
  return true
}

// Resolves ship-vs-obstacle contact and culls what's fallen behind. Compacts
// the obstacle array in place rather than allocating a new one every frame.
export function resolveObstacleCollisions(
  world: GameWorld,
  shipWorldX: number,
  lateral: number,
): void {
  const obstacles = world.obstacles
  let write = 0
  for (let read = 0; read < obstacles.length; read++) {
    const obstacle = obstacles[read]
    if (keepObstacle(world, obstacle, shipWorldX, lateral)) {
      obstacles[write++] = obstacle
    }
  }
  obstacles.length = write
}

function keepObstacle(
  world: GameWorld,
  obstacle: Obstacle,
  shipWorldX: number,
  lateral: number,
): boolean {
  if (obstacle.worldX < shipWorldX - CULL_BEHIND) return false

  const dx = obstacle.worldX - shipWorldX
  const dy = obstacle.worldY - lateral
  if (Math.hypot(dx, dy) > obstacle.radius + SHIP_RADIUS) return true

  if (collectPickup(world, obstacle)) return false
  return !takeHit(world)
}
