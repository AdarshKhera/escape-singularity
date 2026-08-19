import { drawAsteroid } from './drawAsteroid'

// A scripted, dead-centre hazard: the same asteroid art, but ringed with a
// pulsing warning glow so it reads as deliberate, not random debris.
export function drawBlockade(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  seed: number,
  sprite: HTMLImageElement,
  time: number,
) {
  const pulse = 0.55 + 0.45 * Math.sin(time * 6)

  ctx.save()
  ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 * pulse})`
  ctx.lineWidth = Math.max(radius * 0.12, 1.5)
  ctx.beginPath()
  ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  drawAsteroid(ctx, x, y, radius, seed, sprite)
}
