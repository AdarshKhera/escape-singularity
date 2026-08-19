// A small rotating green sphere marks every routine fuel pickup: a shaded
// ball with a highlight that turns, not a flat glowing disc.
export function drawSatellite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
) {
  ctx.save()
  ctx.translate(x, y)

  const spin = time * 1.6
  const hx = Math.cos(spin) * radius * 0.4
  const hy = Math.sin(spin * 0.6) * radius * 0.3

  const body = ctx.createRadialGradient(hx - radius * 0.1, hy - radius * 0.1, radius * 0.05, 0, 0, radius)
  body.addColorStop(0, '#d6ffcf')
  body.addColorStop(0.35, '#6fe36a')
  body.addColorStop(0.75, '#1f9e4a')
  body.addColorStop(1, '#0c5f2c')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(180, 255, 170, 0.5)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}
