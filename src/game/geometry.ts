import type { Obstacle } from './world'

// Distance from point (px, py) to segment a-b.
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax
  const aby = by - ay
  const lengthSq = abx * abx + aby * aby
  const t = lengthSq > 0 ? Math.min(Math.max(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0), 1) : 0
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t))
}

// Distance from a point to an obstacle's surface (negative = inside).
// Derelicts are spinning capsules; everything else is a circle.
export function obstacleSurfaceDistance(obstacle: Obstacle, x: number, y: number): number {
  if (obstacle.type === 'derelict' && obstacle.halfLength) {
    const cx = Math.cos(obstacle.angle) * obstacle.halfLength
    const cy = Math.sin(obstacle.angle) * obstacle.halfLength
    const d = distanceToSegment(
      x,
      y,
      obstacle.worldX - cx,
      obstacle.worldY - cy,
      obstacle.worldX + cx,
      obstacle.worldY + cy,
    )
    return d - obstacle.radius
  }
  return Math.hypot(x - obstacle.worldX, y - obstacle.worldY) - obstacle.radius
}

// the furthest any part of an obstacle reaches from its centre
export function obstacleExtent(obstacle: Obstacle): number {
  return obstacle.radius + (obstacle.halfLength ?? 0)
}
