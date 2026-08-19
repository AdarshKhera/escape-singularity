interface VoidDarknessOptions {
  x: number
  y: number
  radius: number
  revealT: number
  width: number
  height: number
}

// The hole swallows light rather than emitting it: space around it drains to
// black, deepening as the ship closes in.
export function drawVoidDarkness(
  ctx: CanvasRenderingContext2D,
  { x, y, radius, revealT, width, height }: VoidDarknessOptions,
) {
  if (revealT <= 0.001 || radius <= 0.5) return

  const reach = radius * 3.2
  const gradient = ctx.createRadialGradient(x, y, radius * 0.95, x, y, reach)
  gradient.addColorStop(0, `rgba(0, 0, 0, ${0.85 * revealT})`)
  gradient.addColorStop(0.45, `rgba(0, 0, 0, ${0.45 * revealT})`)
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // overall dimming of the whole field late in the approach
  const globalDim = Math.max(revealT - 0.35, 0) * 0.55
  if (globalDim > 0.005) {
    ctx.fillStyle = `rgba(0, 0, 0, ${globalDim})`
    ctx.fillRect(0, 0, width, height)
  }
}
