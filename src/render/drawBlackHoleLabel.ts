// Names the hole, once, as it comes into view — the same instrumentation
// treatment as a planet flyby readout, anchored above it instead of beside it.
export function drawBlackHoleLabel(
  ctx: CanvasRenderingContext2D,
  name: string,
  description: string,
  screenX: number,
  screenY: number,
  screenRadius: number,
  opacity: number,
) {
  if (opacity <= 0.01) return

  const anchorX = screenX
  const anchorY = screenY - screenRadius - 34

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = 'rgba(255,179,122,0.95)'
  ctx.font = '600 13px monospace'
  ctx.fillText(name.toUpperCase(), anchorX, anchorY)

  ctx.fillStyle = 'rgba(232,236,245,0.6)'
  ctx.font = '9px monospace'
  ctx.fillText(description, anchorX, anchorY + 14)

  ctx.restore()
  ctx.globalAlpha = 1
}
