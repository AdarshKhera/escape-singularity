// Flashing chevrons at the screen edge for something incoming that isn't on
// screen yet. side: -1 top, 1 bottom, 0 the right-hand (forward) edge.
export function drawEdgeWarning(
  ctx: CanvasRenderingContext2D,
  side: -1 | 0 | 1,
  width: number,
  height: number,
  topInset: number,
  time: number,
  rgb: string,
) {
  const blink = 0.45 + 0.55 * Math.abs(Math.sin(time * 9))
  ctx.save()
  ctx.strokeStyle = `rgba(${rgb}, ${blink})`
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  const size = 14
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    if (side === 0) {
      const x = width - 28 - i * 16
      const y = topInset + (height - topInset) / 2
      ctx.moveTo(x + size * 0.5, y - size)
      ctx.lineTo(x - size * 0.5, y)
      ctx.lineTo(x + size * 0.5, y + size)
    } else {
      const x = width * 0.55
      const y = side < 0 ? topInset + 18 + i * 12 : height - 18 - i * 12
      const dir = side < 0 ? 1 : -1
      ctx.moveTo(x - size, y - (dir * size) / 2)
      ctx.lineTo(x, y + (dir * size) / 2)
      ctx.lineTo(x + size, y - (dir * size) / 2)
    }
    ctx.stroke()
  }
  ctx.restore()
}
