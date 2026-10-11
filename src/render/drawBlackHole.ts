import { cachedGradient } from './gradientCache'
import { drawDiskBack, drawDiskFront, drawLensedArcs, drawMatterStreams } from './accretionDisk'
import { EMBER, rgba, type HolePalette } from './holePalette'

interface DrawBlackHoleOptions {
  x: number
  y: number
  radius: number
  time: number
  /** 0..1 accretion disk strength; 0 (default) is the bare lensed ring */
  disk?: number
  /** how many infalling matter streams to draw with the disk */
  streams?: number
  /** the hole's own colour; defaults to ember */
  palette?: HolePalette
  /**
   * 0..1 how sharply the hole is drawn. Far away it is dimmed and softened so
   * it sits quietly in the background; it comes into focus as it looms.
   */
  focus?: number
}

// the largest horizon (px) worth softening with a blur filter
const BLUR_MAX_RADIUS = 260
const FAR_BLUR_PX = 2.2

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
  { x, y, radius, time, disk = 0, streams = 0, palette = EMBER, focus = 1 }: DrawBlackHoleOptions,
) {
  if (radius <= 0.5) return
  const sharp = Math.min(Math.max(focus, 0), 1)
  // a distant hole is a faint backdrop (about a seventh strength), easing up slowly and
  // only reaching full strength as it truly looms
  const strength = 0.14 + 0.86 * sharp * sharp * sharp
  const diskStrength = disk * strength

  const pulse = 0.85 + 0.15 * Math.sin(time * 0.7)

  ctx.save()
  // a soft focus while distant (browsers without canvas filters just skip it)
  if (sharp < 0.97 && radius < BLUR_MAX_RADIUS && 'filter' in ctx) {
    ctx.filter = `blur(${((1 - sharp) * FAR_BLUR_PX).toFixed(2)}px)`
  }
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
  ctx.globalAlpha = strength
  ctx.beginPath()
  ctx.arc(0, 0, 1.34, 0, TAU)
  ctx.fill()
  ctx.restore()

  if (diskStrength > 0.01) {
    drawLensedArcs(ctx, diskStrength * (0.85 + 0.15 * Math.sin(time * 1.3)), palette)
    drawDiskBack(ctx, time, diskStrength, palette)
  }

  // lensed starlight is brightest where it wraps the limbs
  ctx.globalAlpha = pulse * (1 - disk * 0.75) * strength
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
  ctx.globalAlpha = strength
  ctx.beginPath()
  ctx.arc(0, 0, 1.008, 0, TAU)
  ctx.stroke()
  ctx.globalAlpha = 1

  if (diskStrength > 0.01) {
    // with a disk feeding it, the photon ring burns hotter: a soft bloom
    // under a razor-thin core line that shimmers as the disk turns
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = diskStrength * 0.55
    ctx.strokeStyle = cachedGradient(ctx, `hole:photon-bloom:${palette.id}`, (c) => {
      const g = c.createRadialGradient(0, 0, 0.98, 0, 0, 1.11)
      g.addColorStop(0, rgba(palette.hot, 0))
      g.addColorStop(0.3, rgba(palette.hot, 0.7))
      g.addColorStop(1, rgba(palette.mid, 0))
      return g
    })
    ctx.lineWidth = 0.12
    ctx.beginPath()
    ctx.arc(0, 0, 1.04, 0, TAU)
    ctx.stroke()
    ctx.globalAlpha = diskStrength * (0.75 + 0.25 * Math.sin(time * 5.3))
    ctx.strokeStyle = 'rgba(255, 252, 245, 1)'
    ctx.lineWidth = Math.max(0.006, 0.9 / radius)
    ctx.beginPath()
    ctx.arc(0, 0, 1.012, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  // event horizon: absolute black, drawn last so nothing bleeds into it
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()

  if (diskStrength > 0.01) {
    drawDiskFront(ctx, time, diskStrength, palette)
    drawMatterStreams(ctx, time, streams, diskStrength, 1 / radius, palette)
  }

  ctx.restore()
}
