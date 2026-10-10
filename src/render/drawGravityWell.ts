const TAU = Math.PI * 2

// A micro-singularity. Charge (0..1) drives everything the player needs to
// read: rings contract inward and the accretion glow brightens while it
// pulls, and the field edge is always faintly marked so its reach is known.
export function drawGravityWell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coreRadius: number,
  fieldRadius: number,
  charge: number,
  time: number,
) {
  ctx.save()

  // field edge: dashed, always visible
  ctx.strokeStyle = `rgba(190, 140, 255, ${0.18 + charge * 0.25})`
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 10])
  ctx.lineDashOffset = -time * 30
  ctx.beginPath()
  ctx.arc(x, y, fieldRadius, 0, TAU)
  ctx.stroke()
  ctx.setLineDash([])

  // contracting rings while charged: pull made visible
  if (charge > 0.02) {
    for (let i = 0; i < 3; i++) {
      const t = 1 - ((time * 0.9 + i / 3) % 1)
      const r = coreRadius + (fieldRadius - coreRadius) * t
      ctx.strokeStyle = `rgba(200, 150, 255, ${charge * (1 - t) * 0.7})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, TAU)
      ctx.stroke()
    }
  }

  // accretion glow
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(x, y, coreRadius * 0.8, x, y, coreRadius * 3)
  glow.addColorStop(0, `rgba(210, 160, 255, ${0.35 + charge * 0.5})`)
  glow.addColorStop(1, 'rgba(120, 60, 200, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, coreRadius * 3, 0, TAU)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'

  // core
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.arc(x, y, coreRadius, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = `rgba(240, 220, 255, ${0.6 + charge * 0.4})`
  ctx.lineWidth = Math.max(coreRadius * 0.08, 1.2)
  ctx.beginPath()
  ctx.arc(x, y, coreRadius * 1.04, 0, TAU)
  ctx.stroke()

  ctx.restore()
}
