import { FONT_DISPLAY } from '../ui/fonts'

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

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = `500 12px ${FONT_DISPLAY}`
  ctx.letterSpacing = '3px'
  ctx.fillText(name.toUpperCase(), anchorX, anchorY)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.letterSpacing = '0.5px'
  ctx.font = `400 10px ${FONT_DISPLAY}`
  ctx.fillText(description, anchorX, anchorY + 14)

  ctx.restore()
  ctx.globalAlpha = 1
}
