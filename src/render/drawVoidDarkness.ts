import { cachedGradient } from './gradientCache'

interface VoidDarknessOptions {
  x: number
  y: number
  radius: number
  revealT: number
  width: number
  height: number
}

const REACH = 3.2

// The hole swallows light rather than emitting it: space around it drains to
// black, deepening as the ship closes in. The falloff is a cached unit-space
// gradient; its strength rides on globalAlpha.
export function drawVoidDarkness(
  ctx: CanvasRenderingContext2D,
  { x, y, radius, revealT, width, height }: VoidDarknessOptions,
) {
  if (revealT <= 0.001 || radius <= 0.5) return

  ctx.save()
  ctx.globalAlpha = Math.min(revealT, 1)
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  ctx.fillStyle = cachedGradient(ctx, 'void', (c) => {
    const g = c.createRadialGradient(0, 0, 0.95, 0, 0, REACH)
    g.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
    g.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)')
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

  // overall dimming of the whole field late in the approach
  const globalDim = Math.max(revealT - 0.35, 0) * 0.55
  if (globalDim > 0.005) {
    ctx.fillStyle = `rgba(0, 0, 0, ${globalDim})`
    ctx.fillRect(0, 0, width, height)
  }
}
