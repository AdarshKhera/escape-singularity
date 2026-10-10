const TAU = Math.PI * 2

// An ion storm: overlapping violet puffs inside an elliptical boundary, with
// the odd crackle of lightning. Drawn in screen space; rx/ry are the
// ellipse's screen radii.
export function drawIonCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  seed: number,
  time: number,
  shipInside: boolean,
) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const puffs = 9
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * TAU + seed
    const wobble = Math.sin(time * 0.7 + i * 1.7 + seed)
    const px = x + Math.cos(a) * rx * 0.55 + wobble * rx * 0.08
    const py = y + Math.sin(a * 1.3) * ry * 0.45
    const pr = Math.min(rx, ry) * (0.55 + 0.15 * Math.sin(i * 2.1 + seed))
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr)
    g.addColorStop(0, `rgba(170, 100, 255, ${shipInside ? 0.2 : 0.14})`)
    g.addColorStop(1, 'rgba(90, 40, 180, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, TAU)
    ctx.fill()
  }
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = 'rgba(190, 140, 255, 0.35)'
  ctx.setLineDash([4, 8])
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  ctx.stroke()
  ctx.setLineDash([])

  // lightning: a short jagged bolt, a few frames at a time
  const strike = Math.sin(time * 3.1 + seed * 5) > 0.93
  if (strike) {
    ctx.strokeStyle = 'rgba(235, 215, 255, 0.9)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    let bx = x + Math.sin(seed + time) * rx * 0.4
    let by = y - ry * 0.5
    ctx.moveTo(bx, by)
    for (let i = 0; i < 5; i++) {
      bx += Math.sin(time * 40 + i * 3 + seed) * rx * 0.08
      by += ry * 0.2
      ctx.lineTo(bx, by)
    }
    ctx.stroke()
  }
  ctx.restore()
}
