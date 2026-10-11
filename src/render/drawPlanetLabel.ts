import { FONT_DISPLAY } from '../ui/fonts'
import type { PlanetDefinition } from '../levels/planets'

// Small technical readout beside a planet as the ship passes it — deliberately
// understated so it reads as instrumentation, not a UI popup.
export function drawPlanetLabel(
  ctx: CanvasRenderingContext2D,
  planet: PlanetDefinition,
  screenX: number,
  screenY: number,
  screenRadius: number,
  opacity: number,
) {
  if (opacity <= 0.01) return

  const anchorX = screenX + screenRadius + 12
  const anchorY = screenY

  ctx.save()
  ctx.globalAlpha = opacity

  // leader line from the planet edge
  ctx.strokeStyle = 'rgba(222, 227, 235,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(screenX + screenRadius + 2, anchorY)
  ctx.lineTo(anchorX - 4, anchorY)
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `500 12px ${FONT_DISPLAY}`
  ctx.letterSpacing = '2.5px'
  ctx.fillText(planet.name.toUpperCase(), anchorX, anchorY - 14)

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.letterSpacing = '0.5px'
  ctx.font = `400 10px ${FONT_DISPLAY}`
  ctx.fillText(planet.designation, anchorX, anchorY - 1)

  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = `400 10px ${FONT_DISPLAY}`
  ctx.fillText(`GRAVITY ${planet.gravity}`, anchorX, anchorY + 11)
  ctx.fillText(planet.note, anchorX, anchorY + 23)

  ctx.letterSpacing = '0px'
  ctx.restore()
  ctx.globalAlpha = 1
}
