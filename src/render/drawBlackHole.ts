interface DrawBlackHoleOptions {
  x: number
  y: number
  radius: number
  time: number
}

// Matches the reference photograph: a pure black core, a thin bright photon
// ring hugging it, and background starlight lensed into a smooth halo that is
// stretched horizontally and brightest at the left and right limbs.
//
// The lensing is kept tight against the horizon on purpose — the bright ring
// reads as the danger boundary, so the player can judge clearance by eye.
export function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  { x, y, radius, time }: DrawBlackHoleOptions,
) {
  if (radius <= 0.5) return

  const pulse = 0.85 + 0.15 * Math.sin(time * 0.7)

  ctx.save()
  ctx.translate(x, y)

  // smooth lensed halo, squashed vertically so light wraps the sphere
  ctx.save()
  ctx.scale(1, 0.94)
  const halo = ctx.createRadialGradient(0, 0, radius * 0.99, 0, 0, radius * 1.34)
  halo.addColorStop(0, 'rgba(214, 226, 245, 0.5)')
  halo.addColorStop(0.25, 'rgba(186, 196, 214, 0.2)')
  halo.addColorStop(0.6, 'rgba(150, 160, 185, 0.07)')
  halo.addColorStop(1, 'rgba(120, 130, 160, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // lensed starlight is brightest where it wraps the limbs
  for (const side of [-1, 1]) {
    const cx = side * radius * 1.06
    const lobe = ctx.createRadialGradient(cx, 0, 0, cx, 0, radius * 0.5)
    lobe.addColorStop(0, `rgba(238, 240, 246, ${0.42 * pulse})`)
    lobe.addColorStop(0.45, `rgba(214, 198, 178, ${0.16 * pulse})`)
    lobe.addColorStop(1, 'rgba(200, 190, 180, 0)')
    ctx.fillStyle = lobe
    ctx.beginPath()
    ctx.ellipse(cx, 0, radius * 0.5, radius * 0.62, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // photon ring: thin, sharp, bright — this is the visible danger edge
  const photon = ctx.createRadialGradient(0, 0, radius * 0.975, 0, 0, radius * 1.045)
  photon.addColorStop(0, 'rgba(255, 255, 255, 0)')
  photon.addColorStop(0.5, 'rgba(248, 250, 255, 0.98)')
  photon.addColorStop(1, 'rgba(248, 250, 255, 0)')
  ctx.strokeStyle = photon
  ctx.lineWidth = Math.max(radius * 0.035, 1.2)
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.008, 0, Math.PI * 2)
  ctx.stroke()

  // event horizon: absolute black, drawn last so nothing bleeds into it
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
