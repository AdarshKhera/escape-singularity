export interface Star {
  x: number
  y: number
  size: number
  twinklePhase: number
  rank: number // 0..1, stable ordering used to thin the field out
  /** parallax depth: fraction of the camera's motion this star follows */
  depth: number
}

/** A gravitational lens: the hole bends starlight around itself. */
export interface Lens {
  x: number
  y: number
  /** horizon radius on screen, px */
  radius: number
  /** 0..1, how strongly the lens bends (grows as the hole looms) */
  strength: number
}

// three layers, far to near: far stars are small, dim and nearly still
const LAYER_DEPTHS = [0.012, 0.03, 0.065]
const LAYER_SIZE = [0.5, 0.9, 1.5]
// stars wrap inside a field a little wider than the screen
const WRAP_PAD = 200
// Einstein radius as a multiple of the horizon: light from directly behind
// the hole piles up into a ring just outside the photon ring
const EINSTEIN_RATIO = 1.45
// beyond this many horizon radii the bend is under a pixel; skip the maths
const LENS_REACH = 7

export function generateStars(count: number, width: number, height: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    const layer = i % 3
    stars.push({
      x: Math.random() * (width + WRAP_PAD),
      y: Math.random() * (height + WRAP_PAD),
      size: LAYER_SIZE[layer] * (0.6 + Math.random() * 0.8),
      twinklePhase: Math.random() * Math.PI * 2,
      rank: Math.random(),
      depth: LAYER_DEPTHS[layer],
    })
  }
  return stars
}

interface StarfieldOptions {
  time: number
  visibleFraction: number // 1 = full field, 0 = empty sky
  lens?: Lens
  /** 0 = still points, 1 = full warp streaks */
  streak?: number
  /** accumulated camera scroll at depth 1, screen px */
  offsetX?: number
  offsetY?: number
  /** skip clearing, when something has already painted the backdrop */
  skipClear?: boolean
  /** logical (CSS px) viewport size; the backing store may be DPR-scaled */
  width?: number
  height?: number
}

function wrap(value: number, span: number): number {
  return ((value % span) + span) % span - WRAP_PAD / 2
}

// Scratch output for applyLens, reused to avoid per-star allocation.
const lensed = { x: 0, y: 0, stretch: 1 }

// Thin-lens mapping: a star at distance d from the hole appears at
// (d + sqrt(d^2 + 4E^2)) / 2, so light from just behind the hole wraps into
// a ring at E and everything nearby is pushed outward and arced.
function applyLens(lens: Lens, x: number, y: number): boolean {
  const dx = x - lens.x
  const dy = y - lens.y
  const d = Math.hypot(dx, dy)
  if (d > lens.radius * LENS_REACH || d < 0.001) return false
  const e = lens.radius * EINSTEIN_RATIO * lens.strength
  const bent = (d + Math.sqrt(d * d + 4 * e * e)) / 2
  lensed.x = lens.x + (dx / d) * bent
  lensed.y = lens.y + (dy / d) * bent
  lensed.stretch = bent / d
  return true
}

function drawStreak(ctx: CanvasRenderingContext2D, x: number, y: number, star: Star, streak: number) {
  const length = streak * 160 * (0.3 + star.depth * 10)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(star.size * 0.9, 0.7)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + length, y)
  ctx.stroke()
}

// a lensed star smears along the ring it is bent around
function drawArc(ctx: CanvasRenderingContext2D, lens: Lens, x: number, y: number, star: Star, stretch: number) {
  const angle = Math.atan2(y - lens.y, x - lens.x)
  const r = Math.hypot(x - lens.x, y - lens.y)
  const sweep = Math.min((star.size * Math.min(stretch, 6)) / Math.max(r, 1), 0.6)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(star.size * 0.8, 0.6)
  ctx.beginPath()
  ctx.arc(lens.x, lens.y, r, angle - sweep, angle + sweep)
  ctx.stroke()
}

function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff'
  // tiny stars read identically as squares and skip the path work
  if (size < 1.3) {
    ctx.fillRect(x - size, y - size, size * 2, size * 2)
  } else {
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  {
    time,
    visibleFraction,
    lens,
    streak = 0,
    offsetX = 0,
    offsetY = 0,
    skipClear = false,
    width = ctx.canvas.width,
    height = ctx.canvas.height,
  }: StarfieldOptions,
) {
  if (!skipClear) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  }
  const spanX = width + WRAP_PAD
  const spanY = height + WRAP_PAD
  const lensing = lens && lens.strength > 0.01 && streak <= 0.02 ? lens : null

  for (const star of stars) {
    if (star.rank > visibleFraction) continue

    let x = wrap(star.x - offsetX * star.depth, spanX)
    let y = wrap(star.y - offsetY * star.depth, spanY)
    let alpha = (0.6 + 0.4 * Math.sin(time * 1.5 + star.twinklePhase)) * (0.45 + star.depth * 9)

    // fade each star out as it nears the thinning threshold
    const headroom = visibleFraction - star.rank
    if (headroom < 0.12) alpha *= headroom / 0.12
    if (alpha <= 0.01) continue

    let stretch = 1
    if (lensing && applyLens(lensing, x, y)) {
      x = lensed.x
      y = lensed.y
      stretch = lensed.stretch
      // the horizon swallows whatever lands on it
      if (Math.hypot(x - lensing.x, y - lensing.y) < lensing.radius * 1.02) continue
    }
    ctx.globalAlpha = Math.min(alpha * Math.min(stretch, 2.2), 1)

    if (streak > 0.02) drawStreak(ctx, x, y, star, streak)
    else if (lensing && stretch > 1.25) drawArc(ctx, lensing, x, y, star, stretch)
    else drawPoint(ctx, x, y, star.size)
  }
  ctx.globalAlpha = 1
}
