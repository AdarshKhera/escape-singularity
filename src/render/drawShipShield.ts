// The active shield bubble drawn over the ship while a charge is held.
export function drawShipShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  frames: HTMLImageElement[],
  time: number,
) {
  const ready = frames.filter((f) => f.complete && f.naturalWidth > 0)
  if (ready.length === 0) return
  const sprite = ready[Math.floor(time * 12) % ready.length]

  const size = radius * 2.6
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  ctx.restore()
}
