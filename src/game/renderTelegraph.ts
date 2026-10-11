import { SHIP_RADIUS } from '../levels/worldConfig'
import { computeTopUiMargin } from '../render/cameraScale'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import { obstacleExtent } from './geometry'
import { ghostIndexAt } from './visualState'
import type { GameWorld, Obstacle } from './world'

// Fairness overlays: nothing should hit the player that they couldn't have
// seen coming, and a retry should show what happened last time.

// a hazard this many seconds out, still off-screen and on a collision
// course, gets an edge marker
const TELEGRAPH_SECONDS = 2.4
// extra lateral slack around a collision course, world units
const COURSE_SLACK = 70
const MAX_MARKERS = 4

function isHazard(o: Obstacle): boolean {
  return o.type === 'asteroid' || o.type === 'blockade' || o.type === 'derelict' || o.type === 'moon' || o.type === 'comet'
}

function chevron(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x + 8, y - 11)
  ctx.lineTo(x - 6, y)
  ctx.lineTo(x + 8, y + 11)
  ctx.stroke()
}

// a double chevron pointing back at the ship, pulsing faster as it closes
function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, urgency: number, time: number) {
  const pulse = 0.6 + 0.4 * Math.abs(Math.sin(time * (5 + urgency * 9)))
  ctx.globalAlpha = (0.6 + urgency * 0.4) * pulse
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.lineWidth = 5
  chevron(ctx, x, y)
  chevron(ctx, x + 9, y)
  ctx.strokeStyle = 'rgb(255, 120, 95)'
  ctx.lineWidth = 2.5
  chevron(ctx, x, y)
  chevron(ctx, x + 9, y)
}

// Edge chevrons for hazards still off the right of the screen whose path
// will cross the ship's current line within a couple of seconds. On narrow
// phone screens this is the difference between a dodge and a cheap hit.
export function renderIncomingHazards(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  shipLateral: number,
  time: number,
): void {
  const top = computeTopUiMargin(frame.height) + 14
  const bottom = frame.height - 14
  let drawn = 0
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const o of world.obstacles) {
    if (drawn >= MAX_MARKERS) break
    if (!isHazard(o)) continue
    const extent = obstacleExtent(o)
    if (toScreenX(frame, o.worldX - extent) <= frame.width) continue
    const closing = frame.cameraVx - o.vx
    if (closing <= 1) continue
    const seconds = (o.worldX - extent - frame.shipWorldX) / closing
    if (seconds <= 0 || seconds > TELEGRAPH_SECONDS) continue
    const arrivalY = o.worldY + o.vy * seconds
    if (Math.abs(arrivalY - shipLateral) > extent + SHIP_RADIUS + COURSE_SLACK) continue
    const y = Math.min(Math.max(toScreenY(frame, arrivalY), top), bottom)
    drawMarker(ctx, frame.width - 26, y, 1 - seconds / TELEGRAPH_SECONDS, time)
    drawn++
  }
  ctx.restore()
}

// The previous attempt on this level, as a faint dotted line, with a small
// cross where it ended if it ended badly.
export function renderGhost(ctx: CanvasRenderingContext2D, frame: CameraFrame, world: GameWorld): void {
  const v = world.visuals
  if (v.ghostCount < 2) return
  const leftWorld = frame.shipWorldX - (frame.shipScreenX + 20) / frame.scale
  const rightWorld = frame.shipWorldX + (frame.width - frame.shipScreenX + 20) / frame.scale
  const start = Math.max(ghostIndexAt(v, leftWorld) - 1, 0)
  ctx.save()
  ctx.strokeStyle = 'rgba(190, 215, 255, 0.28)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([2, 7])
  ctx.beginPath()
  let i = start
  ctx.moveTo(toScreenX(frame, v.ghostX[i]), toScreenY(frame, v.ghostY[i]))
  for (i = start + 1; i < v.ghostCount; i++) {
    ctx.lineTo(toScreenX(frame, v.ghostX[i]), toScreenY(frame, v.ghostY[i]))
    if (v.ghostX[i] > rightWorld) break
  }
  ctx.stroke()
  ctx.setLineDash([])

  const last = v.ghostCount - 1
  if (v.ghostEndedInDeath && v.ghostX[last] >= leftWorld && v.ghostX[last] <= rightWorld) {
    const x = toScreenX(frame, v.ghostX[last])
    const y = toScreenY(frame, v.ghostY[last])
    ctx.strokeStyle = 'rgba(255, 140, 120, 0.55)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - 6, y - 6)
    ctx.lineTo(x + 6, y + 6)
    ctx.moveTo(x + 6, y - 6)
    ctx.lineTo(x - 6, y + 6)
    ctx.stroke()
  }
  ctx.restore()
}
