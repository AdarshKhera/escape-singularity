export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  influenceRadius: number,
  sprite: HTMLImageElement,
) {
  const field = ctx.createRadialGradient(x, y, radius, x, y, influenceRadius)
  field.addColorStop(0, 'rgba(120, 200, 160, 0.16)')
  field.addColorStop(1, 'rgba(120, 200, 160, 0)')
  ctx.fillStyle = field
  ctx.beginPath()
  ctx.arc(x, y, influenceRadius, 0, Math.PI * 2)
  ctx.fill()

  if (!sprite.complete || sprite.naturalWidth === 0) return

  const size = radius * 2
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
}
