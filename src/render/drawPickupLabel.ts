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
  ctx.font = '600 8px monospace'
  ctx.fillStyle = 'rgba(232,236,245,0.65)'
  ctx.fillText(text, x, y + belowOffset)
  ctx.restore()
}
