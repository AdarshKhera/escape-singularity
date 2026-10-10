const TAU = Math.PI * 2

// A comet: a white-hot icy head with a long tail streaming away from its
// direction of travel. (vx, vy) is its screen-space velocity direction.
export function drawComet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  vx: number,
  vy: number,
  time: number,
) {
  const speed = Math.hypot(vx, vy) || 1
  const ux = -vx / speed
  const uy = -vy / speed
  const tail = radius * 9
  const flicker = 0.85 + 0.15 * Math.sin(time * 23)

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const gradient = ctx.createLinearGradient(x, y, x + ux * tail, y + uy * tail)
  gradient.addColorStop(0, `rgba(170, 225, 255, ${0.75 * flicker})`)
  gradient.addColorStop(0.35, 'rgba(110, 170, 255, 0.28)')
  gradient.addColorStop(1, 'rgba(80, 120, 255, 0)')
  ctx.fillStyle = gradient
  // tail: a tapered wedge
  const nx = -uy
  const ny = ux
  ctx.beginPath()
  ctx.moveTo(x + nx * radius * 1.1, y + ny * radius * 1.1)
  ctx.lineTo(x + ux * tail + nx * radius * 0.2, y + uy * tail + ny * radius * 0.2)
  ctx.lineTo(x + ux * tail - nx * radius * 0.2, y + uy * tail - ny * radius * 0.2)
  ctx.lineTo(x - nx * radius * 1.1, y - ny * radius * 1.1)
  ctx.closePath()
  ctx.fill()

  const halo = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4)
  halo.addColorStop(0, 'rgba(230, 248, 255, 0.9)')
  halo.addColorStop(0.4, 'rgba(150, 210, 255, 0.35)')
  halo.addColorStop(1, 'rgba(120, 180, 255, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, radius * 2.4, 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#f4fbff'
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.75, 0, TAU)
  ctx.fill()
}
