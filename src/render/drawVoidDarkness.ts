import { cachedGradient } from './gradientCache'

interface VoidDarknessOptions {
  x: number
  y: number
  radius: number
  revealT: number
  width: number
  height: number
}

const REACH = 3.6

// The hole swallows light rather than emitting it: space around it drains to
// black, deepening as the ship closes in. The falloff is a cached unit-space
// gradient; its strength rides on globalAlpha.
export function drawVoidDarkness(
  ctx: CanvasRenderingContext2D,
  { x, y, radius, revealT, width, height }: VoidDarknessOptions,
) {
  if (revealT <= 0.001 || radius <= 0.5) return

  ctx.save()
  ctx.globalAlpha = Math.min(revealT * 1.1, 1)
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  ctx.fillStyle = cachedGradient(ctx, 'void', (c) => {
    const g = c.createRadialGradient(0, 0, 0.95, 0, 0, REACH)
    g.addColorStop(0, 'rgba(0, 0, 0, 0.9)')
    g.addColorStop(0.4, 'rgba(0, 0, 0, 0.55)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    return g
  })
  // only the part of the screen the falloff can actually reach
  const left = Math.max(-x / radius, -REACH)
  const top = Math.max(-y / radius, -REACH)
  const right = Math.min((width - x) / radius, REACH)
  const bottom = Math.min((height - y) / radius, REACH)
  if (right > left && bottom > top) ctx.fillRect(left, top, right - left, bottom - top)
  ctx.restore()

  drawCreepingVignette(ctx, revealT, width, height)

  // overall dimming of the whole field late in the approach
  const globalDim = Math.max(revealT - 0.35, 0) * 0.55
  if (globalDim > 0.005) {
    ctx.fillStyle = `rgba(0, 0, 0, ${globalDim})`
    ctx.fillRect(0, 0, width, height)
  }
}

// Darkness creeping in from the edges of vision as the pull builds: the
// frame closes like a tunnel rather than anything getting brighter.
function drawCreepingVignette(ctx: CanvasRenderingContext2D, revealT: number, width: number, height: number) {
  const strength = Math.min(revealT * 1.25, 1)
  if (strength <= 0.01) return
  const cx = width / 2
  const cy = height / 2
  const reach = Math.hypot(cx, cy)
  ctx.save()
  ctx.globalAlpha = strength
  ctx.translate(cx, cy)
  ctx.scale(reach, reach * (height / width) * 1.35)
  ctx.fillStyle = cachedGradient(ctx, 'void:vignette', (c) => {
    const g = c.createRadialGradient(0, 0, 0.35, 0, 0, 1)
    g.addColorStop(0, 'rgba(0, 0, 0, 0)')
    g.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0.85)')
    return g
  })
  const sy = reach * (height / width) * 1.35
  ctx.fillRect(-cx / reach, -cy / sy, width / reach, height / sy)
  ctx.restore()
}
