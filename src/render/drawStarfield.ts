export interface Star {
  x: number
  y: number
  size: number
  twinklePhase: number
  rank: number // 0..1, stable ordering used to thin the field out
}

export interface LensWarp {
  x: number
  y: number
  radius: number
  strength: number
}

export function generateStars(count: number, width: number, height: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.6 + 0.4,
      twinklePhase: Math.random() * Math.PI * 2,
      rank: Math.random(),
    })
  }
  return stars
}

interface StarfieldOptions {
  time: number
  visibleFraction: number // 1 = full field, 0 = empty sky
  warp?: LensWarp
  /** 0 = still points, 1 = full warp streaks on the victory burn */
  streak?: number
  /** how fast the field scrolls past, in px/sec */
  scrollSpeed?: number
  /** skip clearing, when something has already painted the backdrop */
  skipClear?: boolean
  /** logical (CSS px) viewport size; the backing store may be DPR-scaled */
  width?: number
  height?: number
}

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  {
    time,
    visibleFraction,
    warp,
    streak = 0,
    scrollSpeed = 0,
    skipClear = false,
    width = ctx.canvas.width,
    height = ctx.canvas.height,
  }: StarfieldOptions,
) {
  if (!skipClear) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  }

  const scrollOffset = scrollSpeed > 0 ? (time * scrollSpeed) % (width + 400) : 0

  for (const star of stars) {
    if (star.rank > visibleFraction) continue

    const twinkle = 0.6 + 0.4 * Math.sin(time * 1.5 + star.twinklePhase)
    // during the burn the field rushes past from right to left
    let drawX = scrollOffset > 0 ? ((star.x - scrollOffset) % (width + 400) + width + 400) % (width + 400) - 200 : star.x
    let drawY = star.y
    let alpha = twinkle

    // fade each star out as it nears the thinning threshold
    const headroom = visibleFraction - star.rank
    if (headroom < 0.12) alpha *= headroom / 0.12

    // lensing only makes sense near the hole; never let it fight the scroll
    if (warp && streak <= 0.02) {
      const dx = star.x - warp.x
      const dy = star.y - warp.y
      const dist = Math.hypot(dx, dy)
      if (dist < warp.radius && dist > 0.001) {
        const t = 1 - dist / warp.radius
        const swirl = t * t * warp.strength
        const angle = Math.atan2(dy, dx) + swirl
        const stretch = 1 + t * 0.6
        drawX = warp.x + Math.cos(angle) * dist * stretch
        drawY = warp.y + Math.sin(angle) * dist * (1 - t * 0.45)
        alpha *= 0.35 + 0.65 * (1 - t)
      }
    }

    if (alpha <= 0.01) continue
    ctx.globalAlpha = alpha

    if (streak > 0.02) {
      // stars elongate into white lines, longer ones further from centre
      const depth = 0.35 + star.rank * 0.65
      const length = streak * 140 * depth
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(star.size * 0.9, 0.7)
      ctx.beginPath()
      ctx.moveTo(drawX, drawY)
      ctx.lineTo(drawX + length, drawY)
      ctx.stroke()
    } else {
      // tiny stars read identically as squares and skip the path work
      ctx.fillStyle = '#ffffff'
      if (star.size < 1.3) {
        ctx.fillRect(drawX - star.size, drawY - star.size, star.size * 2, star.size * 2)
      } else {
        ctx.beginPath()
        ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.globalAlpha = 1
}
