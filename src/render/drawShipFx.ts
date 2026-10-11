import { cachedGradient } from './gradientCache'

const TAU = Math.PI * 2

// The engine ribbon: a tapered glowing band through the ribbon points,
// newest (at the nozzle) widest. Drawn additively as one stroke per segment
// so the taper and the fade come for free without building a polygon.
export function drawEngineRibbon(
  ctx: CanvasRenderingContext2D,
  xs: Float32Array,
  ys: Float32Array,
  count: number,
  width: number,
  rgb: string,
  alpha: number,
): void {
  if (count < 2 || alpha <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.strokeStyle = `rgb(${rgb})`
  for (let i = 0; i < count - 1; i++) {
    const t = 1 - i / (count - 1)
    ctx.globalAlpha = alpha * t * t * 0.7
    ctx.lineWidth = Math.max(width * t, 0.6)
    ctx.beginPath()
    ctx.moveTo(xs[i], ys[i])
    ctx.lineTo(xs[i + 1], ys[i + 1])
    ctx.stroke()
  }
  // a hot white core along the first few segments
  ctx.strokeStyle = 'rgb(255, 255, 255)'
  const core = Math.min(count - 1, 6)
  for (let i = 0; i < core; i++) {
    const t = 1 - i / core
    ctx.globalAlpha = alpha * t * 0.5
    ctx.lineWidth = Math.max(width * 0.35 * t, 0.5)
    ctx.beginPath()
    ctx.moveTo(xs[i], ys[i])
    ctx.lineTo(xs[i + 1], ys[i + 1])
    ctx.stroke()
  }
  ctx.restore()
}

// Afterburner: a flickering cone of fire off the nozzle while boosting.
export function drawAfterburner(
  ctx: CanvasRenderingContext2D,
  tailX: number,
  tailY: number,
  tilt: number,
  scale: number,
  intensity: number,
  time: number,
): void {
  if (intensity <= 0.02) return
  const flicker = 0.8 + 0.2 * Math.sin(time * 47) * Math.sin(time * 23)
  const length = (26 + 18 * intensity) * scale * flicker
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(intensity, 1)
  ctx.translate(tailX, tailY)
  ctx.rotate(tilt)
  ctx.translate(-length * 0.55, 0)
  ctx.scale(length, 7 * scale * (0.8 + 0.4 * intensity))
  ctx.fillStyle = cachedGradient(ctx, 'ship:afterburner', (c) => {
    const g = c.createRadialGradient(0.45, 0, 0, 0.45, 0, 1)
    g.addColorStop(0, 'rgba(255, 250, 235, 0.95)')
    g.addColorStop(0.25, 'rgba(255, 200, 110, 0.7)')
    g.addColorStop(0.6, 'rgba(255, 110, 50, 0.25)')
    g.addColorStop(1, 'rgba(255, 80, 30, 0)')
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// Shield bubble: a faint sphere with two highlights sliding round its rim
// and a slow shimmer, layered over the animated shield sprite.
export function drawShieldBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
): void {
  const shimmer = 0.75 + 0.25 * Math.sin(time * 3.1)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(x, y)
  ctx.save()
  ctx.scale(radius, radius)
  ctx.globalAlpha = 0.55 * shimmer
  ctx.fillStyle = cachedGradient(ctx, 'ship:shield', (c) => {
    const g = c.createRadialGradient(0, 0, 0.55, 0, 0, 1)
    g.addColorStop(0, 'rgba(120, 200, 255, 0)')
    g.addColorStop(0.8, 'rgba(140, 210, 255, 0.18)')
    g.addColorStop(1, 'rgba(190, 235, 255, 0.5)')
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(210, 240, 255, 0.9)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 2; i++) {
    const start = time * (1.6 + i * 0.7) + i * Math.PI
    ctx.globalAlpha = 0.5 * shimmer
    ctx.beginPath()
    ctx.arc(0, 0, radius * 0.97, start, start + 0.9)
    ctx.stroke()
  }
  ctx.restore()
}
