import { FONT_DISPLAY } from '../ui/fonts'

// A tiny caption under a world pickup, naming what it is — the entities
// themselves are labelled, not the HUD.
export function drawPickupLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  belowOffset: number,
) {
  if (belowOffset < 4) return
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `500 9px ${FONT_DISPLAY}`
  ctx.letterSpacing = '1.5px'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(text, x, y + belowOffset)
  ctx.restore()
}
