export function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  seed: number,
  sprite: HTMLImageElement,
  reinforced = false,
  hitsRemaining = 1,
) {
  if (!sprite.complete || sprite.naturalWidth === 0) return

  const size = radius * 2.4
  const aspect = sprite.naturalHeight / sprite.naturalWidth

  // reinforced rocks (belt walls) read as dangerous before you're close
  // enough to see the sprite: a red glow, brighter while it still needs more
  // than one hit to break
  if (reinforced) {
    ctx.save()
    ctx.translate(x, y)
    const glow = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.5)
    const glowAlpha = hitsRemaining > 1 ? 0.4 : 0.22
    glow.addColorStop(0, `rgba(255, 60, 60, ${glowAlpha})`)
    glow.addColorStop(1, 'rgba(255, 60, 60, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = hitsRemaining > 1 ? 'rgba(255, 70, 70, 0.9)' : 'rgba(255, 150, 90, 0.9)'
    ctx.lineWidth = Math.max(radius * 0.06, 2)
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.02, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(seed * 0.6)
  ctx.drawImage(sprite, -size / 2, (-size * aspect) / 2, size, size * aspect)
  ctx.restore()
}
