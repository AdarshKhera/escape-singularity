// The rocket pickup: three rockets stacked vertically, overlapping, gently
// bobbing in place — reads as ordnance, not another glowing orb.
export function drawRocketPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sprite: HTMLImageElement,
  time: number,
) {
  if (!sprite.complete || sprite.naturalWidth === 0) return

  const bob = Math.sin(time * 2.4) * radius * 0.15
  const width = radius * 1.7
  const height = width * (sprite.naturalHeight / sprite.naturalWidth)
  const spacing = height * 0.55

  ctx.save()
  ctx.translate(x, y + bob)

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8)
  glow.addColorStop(0, 'rgba(255, 140, 90, 0.22)')
  glow.addColorStop(1, 'rgba(255, 140, 90, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2)
  ctx.fill()

  for (let i = -1; i <= 1; i++) {
    ctx.drawImage(sprite, -width / 2, i * spacing - height / 2, width, height)
  }

  ctx.restore()
}
