import { cachedGradient } from './gradientCache'

interface DrawBlackHoleOptions {
  x: number
  y: number
  radius: number
  time: number
}

const TAU = Math.PI * 2

// Matches the reference photograph: a pure black core, a thin bright photon
// ring hugging it, and background starlight lensed into a smooth halo that is
// stretched horizontally and brightest at the left and right limbs.
//
// The lensing is kept tight against the horizon on purpose — the bright ring
// reads as the danger boundary, so the player can judge clearance by eye.
//
// Everything is drawn in unit space (radius 1) under a scale transform so the
// gradients are built once and reused every frame.
export function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  { x, y, radius, time }: DrawBlackHoleOptions,
) {
  if (radius <= 0.5) return

  const pulse = 0.85 + 0.15 * Math.sin(time * 0.7)

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(radius, radius)

  // smooth lensed halo, squashed vertically so light wraps the sphere
  ctx.save()
  ctx.scale(1, 0.94)
  ctx.fillStyle = cachedGradient(ctx, 'hole:halo', (c) => {
    const g = c.createRadialGradient(0, 0, 0.99, 0, 0, 1.34)
    g.addColorStop(0, 'rgba(214, 226, 245, 0.5)')
    g.addColorStop(0.25, 'rgba(186, 196, 214, 0.2)')
    g.addColorStop(0.6, 'rgba(150, 160, 185, 0.07)')
    g.addColorStop(1, 'rgba(120, 130, 160, 0)')
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1.34, 0, TAU)
  ctx.fill()
  ctx.restore()

  // lensed starlight is brightest where it wraps the limbs
  ctx.globalAlpha = pulse
  for (const side of [-1, 1]) {
    const cx = side * 1.06
    ctx.fillStyle = cachedGradient(ctx, `hole:lobe:${side}`, (c) => {
      const g = c.createRadialGradient(cx, 0, 0, cx, 0, 0.5)
      g.addColorStop(0, 'rgba(238, 240, 246, 0.42)')
      g.addColorStop(0.45, 'rgba(214, 198, 178, 0.16)')
      g.addColorStop(1, 'rgba(200, 190, 180, 0)')
      return g
    })
    ctx.beginPath()
    ctx.ellipse(cx, 0, 0.5, 0.62, 0, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // photon ring: thin, sharp, bright — this is the visible danger edge
  ctx.strokeStyle = cachedGradient(ctx, 'hole:photon', (c) => {
    const g = c.createRadialGradient(0, 0, 0.975, 0, 0, 1.045)
    g.addColorStop(0, 'rgba(255, 255, 255, 0)')
    g.addColorStop(0.5, 'rgba(248, 250, 255, 0.98)')
    g.addColorStop(1, 'rgba(248, 250, 255, 0)')
    return g
  })
  ctx.lineWidth = Math.max(0.035, 1.2 / radius)
  ctx.beginPath()
  ctx.arc(0, 0, 1.008, 0, TAU)
  ctx.stroke()

  // event horizon: absolute black, drawn last so nothing bleeds into it
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()

  ctx.restore()
}
