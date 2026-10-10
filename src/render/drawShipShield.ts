import { pickReadyFrame } from './gradientCache'

// The active shield bubble drawn over the ship while a charge is held.
export function drawShipShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  frames: HTMLImageElement[],
  time: number,
) {
  const sprite = pickReadyFrame(frames, Math.floor(time * 12))
  if (!sprite) return

  const size = radius * 2.6
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  ctx.restore()
}
