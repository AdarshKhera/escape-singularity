interface GuidePathOptions {
  shipScreenX: number
  shipScreenY: number
  blackHoleScreenX: number
  blackHoleScreenY: number
  blackHoleScreenRadius: number
  escapeSide: -1 | 1
  urgency: number // 0..1, drives colour and pulse
  time: number
}

// Dashed arc showing where the ship must be to clear the horizon, so the
// player can judge when to commit to the turn.
export function drawGuidePath(
  ctx: CanvasRenderingContext2D,
  {
    shipScreenX,
    shipScreenY,
    blackHoleScreenX,
    blackHoleScreenY,
    blackHoleScreenRadius,
    escapeSide,
    urgency,
    time,
  }: GuidePathOptions,
) {
  const clearance = blackHoleScreenRadius * 1.18
  const targetY = blackHoleScreenY + escapeSide * clearance

  const pulse = 0.55 + 0.45 * Math.sin(time * 4)
  const red = Math.round(120 + urgency * 135)
  const green = Math.round(220 - urgency * 130)
  const alpha = 0.35 + urgency * 0.45

  ctx.save()
  ctx.setLineDash([14, 12])
  ctx.lineDashOffset = -time * 60
  ctx.strokeStyle = `rgba(${red}, ${green}, 150, ${alpha * pulse})`
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(shipScreenX, shipScreenY)
  const midX = (shipScreenX + blackHoleScreenX) / 2
  ctx.bezierCurveTo(midX, shipScreenY, midX, targetY, blackHoleScreenX, targetY)
  ctx.lineTo(blackHoleScreenX + blackHoleScreenRadius * 1.6, targetY)
  ctx.stroke()

  // marker at the clearance altitude
  ctx.setLineDash([])
  ctx.strokeStyle = `rgba(${red}, ${green}, 150, ${alpha})`
  ctx.beginPath()
  ctx.moveTo(blackHoleScreenX - 10, targetY)
  ctx.lineTo(blackHoleScreenX + 10, targetY)
  ctx.stroke()

  ctx.restore()
}
