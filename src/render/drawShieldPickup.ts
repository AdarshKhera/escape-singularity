export function drawShieldPickup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sprite: HTMLImageElement,
  time: number,
) {
  if (!sprite.complete || sprite.naturalWidth === 0) return
  const pulse = 0.75 + 0.25 * Math.sin(time * 3)

  ctx.save()
  ctx.translate(x, y)

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.6)
  glow.addColorStop(0, `rgba(140, 240, 255, ${0.3 * pulse})`)
  glow.addColorStop(1, 'rgba(140, 240, 255, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.6, 0, Math.PI * 2)
  ctx.fill()

  const size = radius * 2
  ctx.globalAlpha = pulse
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
  ctx.globalAlpha = 1

  ctx.restore()
}
