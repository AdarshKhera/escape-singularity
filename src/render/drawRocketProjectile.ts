// A rocket in flight: the sprite plus a hot exhaust glow at its tail. Drawn
// with a slight wobble so it reads as propelled, not sliding.
export function drawRocketProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: HTMLImageElement,
  scale: number,
  wobble = 0,
) {
  const width = 34 * scale
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(wobble)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = 'rgba(255, 150, 70, 0.55)'
  ctx.beginPath()
  ctx.ellipse(-width * 0.55, 0, width * 0.35, width * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  if (sprite.complete && sprite.naturalWidth > 0) {
    const height = width * (sprite.naturalHeight / sprite.naturalWidth)
    ctx.drawImage(sprite, -width / 2, -height / 2, width, height)
  }
  ctx.restore()
}
