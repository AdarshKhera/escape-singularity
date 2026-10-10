const TAU = Math.PI * 2

// A dead satellite tumbling end over end: a boxy bus with two long solar
// wings. The wings are the danger, so they get the brightest edge.
export function drawDerelict(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  halfLength: number,
  thickness: number,
  time: number,
  flash: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  const wingLength = halfLength - thickness * 0.4
  const wingWidth = Math.max(thickness * 1.5, 2)
  const bodySize = Math.max(thickness * 1.4, 3)

  // solar wings: blue panels with a grid, warm warning edge
  for (const side of [-1, 1]) {
    const start = side * bodySize * 0.5
    const end = side * wingLength
    const left = Math.min(start, end)
    const width = Math.abs(end - start)
    ctx.fillStyle = '#1d3f7a'
    ctx.fillRect(left, -wingWidth / 2, width, wingWidth)
    ctx.strokeStyle = 'rgba(140, 190, 255, 0.55)'
    ctx.lineWidth = Math.max(wingWidth * 0.08, 0.6)
    const cells = 4
    ctx.beginPath()
    for (let i = 1; i < cells; i++) {
      const cx = left + (width * i) / cells
      ctx.moveTo(cx, -wingWidth / 2)
      ctx.lineTo(cx, wingWidth / 2)
    }
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255, 170, 110, 0.85)'
    ctx.lineWidth = Math.max(wingWidth * 0.12, 0.8)
    ctx.strokeRect(left, -wingWidth / 2, width, wingWidth)
  }

  // bus
  ctx.fillStyle = flash > 0 ? '#ffffff' : '#9aa0a8'
  ctx.fillRect(-bodySize / 2, -bodySize / 2, bodySize, bodySize)
  ctx.fillStyle = '#5b6068'
  ctx.fillRect(-bodySize / 2, bodySize * 0.1, bodySize, bodySize * 0.4)

  // a dying status light
  if (Math.sin(time * 5 + x) > 0.2) {
    ctx.fillStyle = 'rgba(255, 80, 70, 0.95)'
    ctx.beginPath()
    ctx.arc(0, -bodySize * 0.15, Math.max(bodySize * 0.14, 1), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}
