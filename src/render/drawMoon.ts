export function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  sprite: HTMLImageElement,
) {
  if (!sprite.complete || sprite.naturalWidth === 0) return
  const size = radius * 2
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
}
