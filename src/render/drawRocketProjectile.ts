export function drawRocketProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: HTMLImageElement,
  scale: number,
) {
  if (!sprite.complete || sprite.naturalWidth === 0) return
  const width = 34 * scale
  const height = width * (sprite.naturalHeight / sprite.naturalWidth)
  ctx.drawImage(sprite, x - width / 2, y - height / 2, width, height)
}
