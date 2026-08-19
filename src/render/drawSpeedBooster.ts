// An orange forward chevron: a speed booster found in the world. Free of
// fuel cost, distinct from the player-triggered double-tap boost.
export function drawSpeedBooster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
) {
  const pulse = 0.7 + 0.3 * Math.sin(time * 5)

  ctx.save()
  ctx.translate(x, y)

  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.2)
  halo.addColorStop(0, `rgba(255, 160, 60, ${0.3 * pulse})`)
  halo.addColorStop(1, 'rgba(255, 160, 60, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(255, 150, 40, ${0.95 * pulse})`
  ctx.strokeStyle = 'rgba(255, 210, 160, 0.9)'
  ctx.lineWidth = Math.max(radius * 0.08, 1)

  // three stacked forward chevrons, offset in time to read as motion
  for (let i = 0; i < 3; i++) {
    const offset = ((time * 90 + i * 40) % 120) / 120
    const cx = -radius * 0.8 + offset * radius * 1.6
    const alpha = Math.sin(offset * Math.PI)
    ctx.globalAlpha = 0.4 + alpha * 0.6
    ctx.beginPath()
    ctx.moveTo(cx - radius * 0.35, -radius * 0.55)
    ctx.lineTo(cx + radius * 0.35, 0)
    ctx.lineTo(cx - radius * 0.35, radius * 0.55)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  ctx.restore()
}
