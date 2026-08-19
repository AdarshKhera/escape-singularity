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
  ctx.strokeStyle = 'rgba(191,227,255,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(screenX + screenRadius + 2, anchorY)
  ctx.lineTo(anchorX - 4, anchorY)
  ctx.stroke()

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  ctx.fillStyle = 'rgba(232,236,245,0.92)'
  ctx.font = '600 12px monospace'
  ctx.fillText(planet.name.toUpperCase(), anchorX, anchorY - 14)

  ctx.fillStyle = 'rgba(63,214,255,0.75)'
  ctx.font = '9px monospace'
  ctx.fillText(planet.designation, anchorX, anchorY - 1)

  ctx.fillStyle = 'rgba(191,227,255,0.6)'
  ctx.font = '9px monospace'
  ctx.fillText(`GRAVITY ${planet.gravity}`, anchorX, anchorY + 11)
  ctx.fillText(planet.note, anchorX, anchorY + 23)

  ctx.restore()
  ctx.globalAlpha = 1
}
