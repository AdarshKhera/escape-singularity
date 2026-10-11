import { cachedGradient } from './gradientCache'
import { EMBER, rgba, type HolePalette } from './holePalette'

// The accretion disk: a flat ring of superheated matter seen almost edge-on.
// Its texture is painted once into an offscreen canvas (streaky arcs, hot
// white inside, ember red outside) and then only rotated and squashed each
// frame, so the per-frame cost is a couple of drawImage calls.
//
// Everything is authored in the hole's unit space (horizon radius 1). The
// caller has already translated to the hole and scaled by its radius.

export const DISK_INNER = 1.22
export const DISK_OUTER = 2.7
/** vertical squash of the disk plane: how edge-on we see it */
export const DISK_TILT = 0.2
const TEXTURE_SIZE = 768
const SPIN_RADIANS_PER_SECOND = 0.22
const TAU = Math.PI * 2

const textures = new Map<string, HTMLCanvasElement>()

function seeded(seed: number): number {
  const x = Math.sin(seed * 91.17) * 43758.5453
  return x - Math.floor(x)
}

// hot (inner) to cool (outer)
function diskColour(palette: HolePalette, t: number): HolePalette['hot'] {
  if (t < 0.25) return palette.hot
  if (t < 0.55) return palette.mid
  return palette.cool
}

function paintTexture(palette: HolePalette): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const c = TEXTURE_SIZE / 2
  const unit = c / DISK_OUTER

  // soft base glow, brightest at the inner edge
  const base = ctx.createRadialGradient(c, c, DISK_INNER * unit, c, c, DISK_OUTER * unit)
  base.addColorStop(0, rgba(palette.hot, 0.55))
  base.addColorStop(0.2, rgba(palette.mid, 0.32))
  base.addColorStop(0.6, rgba(palette.cool, 0.12))
  base.addColorStop(1, rgba(palette.cool, 0))
  ctx.fillStyle = base
  ctx.beginPath()
  ctx.arc(c, c, DISK_OUTER * unit, 0, TAU)
  ctx.arc(c, c, DISK_INNER * unit, 0, TAU, true)
  ctx.fill()

  // streaky arcs: what makes the rotation readable
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (let i = 0; i < 420; i++) {
    const t = Math.pow(seeded(i + 1), 1.6)
    const r = (DISK_INNER + t * (DISK_OUTER - DISK_INNER)) * unit
    const start = seeded(i * 3.1 + 7) * TAU
    const length = 0.2 + seeded(i * 5.7 + 2) * 1.1
    const alpha = (0.05 + seeded(i * 1.9 + 4) * 0.16) * (1 - t * 0.7)
    ctx.strokeStyle = rgba(diskColour(palette, t), alpha)
    ctx.lineWidth = 0.6 + seeded(i * 2.3 + 9) * 2.6
    ctx.beginPath()
    ctx.arc(c, c, r, start, start + length)
    ctx.stroke()
  }
  return canvas
}

function diskTexture(palette: HolePalette): HTMLCanvasElement | null {
  let texture = textures.get(palette.id)
  if (!texture) {
    texture = paintTexture(palette) ?? undefined
    if (texture) textures.set(palette.id, texture)
  }
  return texture ?? null
}

/** current disk rotation, radians */
export function diskAngle(time: number): number {
  return time * SPIN_RADIANS_PER_SECOND
}

// The approaching (left) limb is Doppler-boosted, the receding one dimmed.
function drawDoppler(ctx: CanvasRenderingContext2D, alpha: number, palette: HolePalette): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(-1.75, 0)
  ctx.scale(1.15, 0.38)
  ctx.fillStyle = cachedGradient(ctx, `disk:boost:${palette.id}`, (c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, rgba(palette.hot, 0.5))
    g.addColorStop(0.5, rgba(palette.mid, 0.18))
    g.addColorStop(1, rgba(palette.mid, 0))
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(1.75, 0)
  ctx.scale(1.15, 0.38)
  ctx.fillStyle = cachedGradient(ctx, 'disk:dim', (c) => {
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, 'rgba(0, 0, 0, 0.5)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.fill()
  ctx.restore()
}

function drawTexture(ctx: CanvasRenderingContext2D, angle: number, alpha: number, palette: HolePalette): void {
  const tex = diskTexture(palette)
  if (!tex) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.scale(1, DISK_TILT)
  ctx.rotate(angle)
  ctx.drawImage(tex, -DISK_OUTER, -DISK_OUTER, DISK_OUTER * 2, DISK_OUTER * 2)
  ctx.restore()
}

/** The whole disk, drawn before the horizon so the far half sits behind it. */
export function drawDiskBack(
  ctx: CanvasRenderingContext2D,
  time: number,
  alpha: number,
  palette: HolePalette = EMBER,
): void {
  drawTexture(ctx, diskAngle(time), alpha, palette)
  drawDoppler(ctx, alpha, palette)
}

// The near half of the disk passes in front of the horizon. Only the strip
// actually over the black disc needs redrawing; the rest is already there.
export function drawDiskFront(
  ctx: CanvasRenderingContext2D,
  time: number,
  alpha: number,
  palette: HolePalette = EMBER,
): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, 1.001, 0, Math.PI)
  ctx.closePath()
  ctx.clip()
  drawTexture(ctx, diskAngle(time), alpha, palette)
  drawDoppler(ctx, alpha, palette)
  ctx.restore()
}

// Light from the far side of the disk, bent up over the top of the hole and
// under its bottom: the signature silhouette of a lensed disk.
export function drawLensedArcs(ctx: CanvasRenderingContext2D, alpha: number, palette: HolePalette = EMBER): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = cachedGradient(ctx, `disk:arc:${palette.id}`, (c) => {
    const g = c.createLinearGradient(-1.3, 0, 1.3, 0)
    g.addColorStop(0, rgba(palette.hot, 0.75))
    g.addColorStop(0.5, rgba(palette.mid, 0.45))
    g.addColorStop(1, rgba(palette.cool, 0.22))
    return g
  })
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.1
  ctx.beginPath()
  ctx.ellipse(0, 0.02, 1.13, 1.1, 0, Math.PI * 1.04, Math.PI * 1.96)
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.45
  ctx.lineWidth = 0.05
  ctx.beginPath()
  ctx.ellipse(0, -0.02, 1.08, 1.06, 0, Math.PI * 0.1, Math.PI * 0.9)
  ctx.stroke()
  ctx.restore()
}

// Matter spiralling in: a handful of glowing motes on inward spirals,
// computed analytically from time so they need no state. Each one speeds up
// and brightens as it falls (angular speed climbs as the orbit tightens),
// trailing a short curved tail; anything behind the horizon is skipped.
const STREAM_TAIL_SECONDS = 0.16
const STREAM_TAIL_POINTS = 4

function streamPoint(i: number, t: number, out: { x: number; y: number; p: number }): void {
  const speed = 0.08 + seeded(i + 40) * 0.07
  const p = (t * speed + seeded(i + 80)) % 1
  const r = DISK_OUTER - p * p * (DISK_OUTER - 1.02)
  const theta = seeded(i + 120) * TAU + t * 0.2 + 3.4 * p * p
  out.x = r * Math.cos(theta)
  out.y = r * Math.sin(theta) * DISK_TILT
  out.p = p
}

const head = { x: 0, y: 0, p: 0 }
const tail = { x: 0, y: 0, p: 0 }

export function drawMatterStreams(
  ctx: CanvasRenderingContext2D,
  time: number,
  count: number,
  alpha: number,
  pixel: number,
  palette: HolePalette = EMBER,
): void {
  if (count <= 0 || alpha <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = rgba(palette.hot, 1)
  for (let i = 0; i < count; i++) {
    streamPoint(i, time, head)
    // behind the horizon: hidden
    if (head.y < 0 && Math.abs(head.x) < 1) continue
    const p = head.p
    const fade = Math.min(p / 0.2, 1) * Math.min((1 - p) / 0.08, 1)
    const doppler = head.x < 0 ? 1 : 0.5
    ctx.globalAlpha = alpha * fade * doppler * (0.2 + 0.6 * p)
    ctx.lineWidth = Math.max(0.012 * (0.5 + p), pixel)
    ctx.beginPath()
    ctx.moveTo(head.x, head.y)
    for (let k = 1; k <= STREAM_TAIL_POINTS; k++) {
      streamPoint(i, time - (STREAM_TAIL_SECONDS * k) / STREAM_TAIL_POINTS, tail)
      if (tail.p > p) break
      ctx.lineTo(tail.x, tail.y)
    }
    ctx.stroke()
  }
  ctx.restore()
}
