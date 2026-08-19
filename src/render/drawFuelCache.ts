// The one pre-approach fuel cache: the same rotating green ball as a routine
// pickup, just larger and with a pulsing halo, since missing it means
// entering the escape on whatever fuel is left.
export function drawFuelCache(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
) {
  if (radius <= 0.4) return

  const pulse = 0.65 + 0.35 * Math.sin(time * 3.4)

  ctx.save()
  ctx.translate(x, y)

  const halo = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 3)
  halo.addColorStop(0, `rgba(140, 255, 130, ${0.32 * pulse})`)
  halo.addColorStop(0.5, `rgba(90, 220, 110, ${0.12 * pulse})`)
  halo.addColorStop(1, 'rgba(90, 220, 110, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, radius * 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.rotate(time * 0.9)
  ctx.strokeStyle = `rgba(200, 255, 190, ${0.8 * pulse})`
  ctx.lineWidth = Math.max(radius * 0.09, 1)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * radius * 1.35, Math.sin(a) * radius * 1.35)
    ctx.lineTo(Math.cos(a) * radius * 1.85, Math.sin(a) * radius * 1.85)
    ctx.stroke()
  }
  ctx.rotate(-time * 0.9)

  const spin = time * 1.6
  const hx = Math.cos(spin) * radius * 0.4
  const hy = Math.sin(spin * 0.6) * radius * 0.3
  const body = ctx.createRadialGradient(hx - radius * 0.1, hy - radius * 0.1, radius * 0.05, 0, 0, radius)
  body.addColorStop(0, '#e4ffdc')
  body.addColorStop(0.35, '#78ea72')
  body.addColorStop(0.75, '#1f9e4a')
  body.addColorStop(1, '#0c5f2c')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
