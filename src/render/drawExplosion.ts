// A rocket hit: an expanding, fading ring plus a scatter of flying embers.
// t is elapsed/duration, 0..1.
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  t: number,
) {
  const alpha = 1 - t
  const ringRadius = (10 + t * 46) * scale

  ctx.save()
  ctx.translate(x, y)

  ctx.strokeStyle = `rgba(255, 200, 120, ${alpha * 0.8})`
  ctx.lineWidth = Math.max(3 * (1 - t) * scale, 1)
  ctx.beginPath()
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2)
  ctx.stroke()

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, ringRadius * 0.6)
  core.addColorStop(0, `rgba(255, 240, 200, ${alpha * 0.9})`)
  core.addColorStop(1, 'rgba(255, 140, 60, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, ringRadius * 0.6, 0, Math.PI * 2)
  ctx.fill()

  const emberCount = 8
  for (let i = 0; i < emberCount; i++) {
    const angle = (i / emberCount) * Math.PI * 2
    const dist = ringRadius * (0.7 + 0.3 * Math.sin(i * 7.3))
    ctx.fillStyle = `rgba(255, 190, 110, ${alpha * 0.85})`
    ctx.beginPath()
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, Math.max(2 * scale, 0.6), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
