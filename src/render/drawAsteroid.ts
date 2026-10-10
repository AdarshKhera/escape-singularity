export function drawAsteroid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  seed: number,
  sprite: HTMLImageElement,
  reinforced = false,
  hitsRemaining = 1,
  maxHits = 1,
  flash = 0,
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

  if (reinforced && hitsRemaining < maxHits) drawCracks(ctx, x, y, radius, seed, maxHits - hitsRemaining)
  if (flash > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(flash / 0.15, 1) * 0.7
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// Jagged glowing fractures, deterministic per rock, one set per hit taken:
// a reinforced rock that's been hit once visibly has one hit left in it.
function drawCracks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  seed: number,
  damage: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = 'rgba(255, 190, 110, 0.95)'
  ctx.shadowColor = 'rgba(255, 120, 40, 0.9)'
  ctx.shadowBlur = Math.max(radius * 0.15, 3)
  ctx.lineWidth = Math.max(radius * 0.05, 1.4)
  ctx.lineJoin = 'round'
  const cracks = 3 + damage * 2
  for (let i = 0; i < cracks; i++) {
    const angle = seed * 2.3 + (i / cracks) * Math.PI * 2
    let px = Math.cos(angle) * radius * 0.12
    let py = Math.sin(angle) * radius * 0.12
    ctx.beginPath()
    ctx.moveTo(px, py)
    for (let k = 1; k <= 3; k++) {
      const jitter = Math.sin(seed * 7.1 + i * 3.3 + k * 1.7) * 0.45
      const r = radius * (0.12 + k * 0.26)
      px = Math.cos(angle + jitter) * r
      py = Math.sin(angle + jitter) * r
      ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}
