interface SpeedLine {
  y: number
  length: number
  offset: number
  speed: number
}

let cachedLines: SpeedLine[] | null = null

function getLines(height: number): SpeedLine[] {
  if (cachedLines) return cachedLines
  const lines: SpeedLine[] = []
  for (let i = 0; i < 22; i++) {
    lines.push({
      y: Math.random() * height,
      length: 60 + Math.random() * 140,
      offset: Math.random(),
      speed: 900 + Math.random() * 700,
    })
  }
  cachedLines = lines
  return lines
}

// A very light streak effect for the boost — subtle horizontal motion lines,
// not a full screen-filling flash.
export function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intensity: number, // 0..1
) {
  if (intensity <= 0.01) return
  const lines = getLines(height)

  ctx.save()
  ctx.globalAlpha = intensity * 0.16
  ctx.strokeStyle = '#bfe3ff'
  ctx.lineWidth = 1

  for (const line of lines) {
    const travel = (time * line.speed + line.offset * width) % (width + line.length)
    const x = width - travel
    ctx.beginPath()
    ctx.moveTo(x, line.y)
    ctx.lineTo(x + line.length, line.y)
    ctx.stroke()
  }

  ctx.restore()
}
