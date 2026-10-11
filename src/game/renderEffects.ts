import type { LevelDefinition } from '../levels/levels'
import { WELL_CORE_RADIUS, WELL_FIELD_RADIUS, ionCloudContains, wellActivation } from '../physics/hazardFields'
import { drawGravityWell } from '../render/drawGravityWell'
import { drawIonCloud } from '../render/drawIonCloud'
import { drawEdgeWarning } from '../render/drawEdgeWarning'
import { computeTopUiMargin } from '../render/cameraScale'
import { cachedGradient } from '../render/gradientCache'
import { PARTICLE_COLORS } from './particles'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import type { GameWorld } from './world'

const PARTICLE_FILLS = PARTICLE_COLORS.map((rgb) => `rgb(${rgb})`)
const POPUP_SECONDS = 1.1
const TAU = Math.PI * 2

// Particle sizes are screen pixels; positions are world space. Fast movers
// are drawn as short streaks along their on-screen velocity (motion blur),
// which is what sells an explosion's debris; slow ones as squares.
const STREAK_SECONDS = 0.035
const MAX_STREAK_PX = 26

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  streaks: boolean,
): void {
  const p = world.particles
  if (p.count === 0) return
  ctx.save()
  ctx.lineCap = 'round'
  for (let pass = 0; pass < 2; pass++) {
    const glowPass = pass === 1
    ctx.globalCompositeOperation = glowPass ? 'lighter' : 'source-over'
    let lastColor = -1
    for (let i = 0; i < p.count; i++) {
      if ((p.glow[i] === 1) !== glowPass) continue
      const sx = toScreenX(frame, p.x[i])
      const sy = toScreenY(frame, p.y[i])
      if (sx < -20 || sx > frame.width + 20 || sy < -20 || sy > frame.height + 20) continue
      const t = p.life[i] / p.maxLife[i]
      const size = p.size[i] * (glowPass ? 0.5 + t * 0.5 : 1)
      if (p.color[i] !== lastColor) {
        lastColor = p.color[i]
        ctx.fillStyle = PARTICLE_FILLS[lastColor]
        ctx.strokeStyle = PARTICLE_FILLS[lastColor]
      }
      ctx.globalAlpha = glowPass ? t : Math.min(1, t * 1.6)
      // only hot, glowing particles smear; smoke and rock keep their shape
      if (streaks && glowPass) {
        // velocity relative to the moving camera, in screen px
        const vx = (p.vx[i] - frame.cameraVx) * frame.scale * STREAK_SECONDS
        const vy = p.vy[i] * frame.scale * STREAK_SECONDS
        const length = Math.hypot(vx, vy)
        if (length > size * 1.5) {
          const k = length > MAX_STREAK_PX ? MAX_STREAK_PX / length : 1
          ctx.lineWidth = size
          ctx.beginPath()
          ctx.moveTo(sx - vx * k, sy - vy * k)
          ctx.lineTo(sx, sy)
          ctx.stroke()
          continue
        }
      }
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
    }
  }
  ctx.restore()
}

// Shockwave rings stroke an expanding circle; flares are the bright flash at
// the heart of an explosion, a filled glow that swells and dies fast.
export function renderRings(ctx: CanvasRenderingContext2D, frame: CameraFrame, world: GameWorld): void {
  if (world.rings.length === 0) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const ring of world.rings) {
    const t = (world.simTime - ring.start) / ring.duration
    if (t < 0 || t > 1) continue
    const eased = 1 - (1 - t) * (1 - t)
    const r = Math.max(ring.maxRadius * eased * frame.scale, 1)
    const x = toScreenX(frame, ring.worldX)
    const y = toScreenY(frame, ring.worldY)
    if (ring.flare) {
      drawFlare(ctx, x, y, Math.max(ring.maxRadius * (0.4 + 0.6 * eased) * frame.scale, 2), ring.rgb, (1 - t) * (1 - t))
      continue
    }
    ctx.strokeStyle = `rgba(${ring.rgb}, ${(1 - t) * 0.8})`
    ctx.lineWidth = Math.max(4 * (1 - t), 1)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

function drawFlare(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.scale(r, r)
  ctx.fillStyle = cachedGradient(ctx, `flare:${rgb}`, (c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    g.addColorStop(0.25, `rgba(${rgb}, 0.6)`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()
  ctx.restore()
}

export function renderPopups(ctx: CanvasRenderingContext2D, frame: CameraFrame, world: GameWorld): void {
  if (world.popups.length === 0) return
  ctx.save()
  ctx.font = "700 12px 'JetBrains Mono', ui-monospace, monospace"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const popup of world.popups) {
    const t = (world.simTime - popup.start) / POPUP_SECONDS
    if (t < 0 || t > 1) continue
    const sx = toScreenX(frame, popup.worldX)
    const sy = toScreenY(frame, popup.worldY) - 14 - t * 34
    ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.6) / 0.4)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillText(popup.text, sx + 1, sy + 1)
    ctx.fillStyle = `rgb(${popup.rgb})`
    ctx.fillText(popup.text, sx, sy)
  }
  ctx.restore()
}

// rings and popups expire on game time
export function ageEffects(world: GameWorld): void {
  let keep = 0
  for (const ring of world.rings) {
    if (world.simTime - ring.start < ring.duration) world.rings[keep++] = ring
  }
  world.rings.length = keep
  keep = 0
  for (const popup of world.popups) {
    if (world.simTime - popup.start < POPUP_SECONDS) world.popups[keep++] = popup
  }
  world.popups.length = keep
}

export function renderFields(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  level: LevelDefinition,
  time: number,
  shipLateral: number,
): void {
  const hazards = level.hazards
  if (!hazards) return
  for (const cloud of hazards.ionClouds ?? []) {
    const sx = toScreenX(frame, cloud.worldX)
    const rx = (cloud.length / 2) * frame.scale
    if (sx + rx < -50 || sx - rx > frame.width + 50) continue
    const inside = ionCloudContains(cloud, frame.shipWorldX, shipLateral)
    drawIonCloud(ctx, sx, toScreenY(frame, cloud.worldY), rx, cloud.halfHeight * frame.scale, cloud.worldX * 0.001, time, inside)
  }
  for (const well of hazards.gravityWells ?? []) {
    const sx = toScreenX(frame, well.worldX)
    const fieldPx = WELL_FIELD_RADIUS * frame.scale
    if (sx + fieldPx < -50 || sx - fieldPx > frame.width + 50) continue
    drawGravityWell(
      ctx,
      sx,
      toScreenY(frame, well.worldY),
      WELL_CORE_RADIUS * frame.scale,
      fieldPx,
      wellActivation(well, time),
      time,
    )
  }
}

export function renderWarnings(ctx: CanvasRenderingContext2D, frame: CameraFrame, world: GameWorld, time: number): void {
  for (const warning of world.warnings) {
    drawEdgeWarning(
      ctx,
      warning.side,
      frame.width,
      frame.height,
      computeTopUiMargin(frame.height),
      time,
      warning.kind === 'comet' ? '150, 210, 255' : '255, 110, 90',
    )
  }
}

export function renderFlash(ctx: CanvasRenderingContext2D, frame: CameraFrame, world: GameWorld): void {
  const fb = world.feedback
  if (fb.flash <= 0.01) return
  ctx.save()
  ctx.fillStyle = `rgba(${fb.flashColor}, ${fb.flash * 0.6})`
  ctx.fillRect(0, 0, frame.width, frame.height)
  ctx.restore()
}
