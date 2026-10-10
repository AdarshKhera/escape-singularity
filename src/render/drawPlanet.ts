import { cachedGradient } from './gradientCache'

const TAU = Math.PI * 2

export interface PlanetDrawOptions {
  time: number
  /** 0..1, how deep the ship is in this planet's field */
  proximity: number
  /** inner slingshot ring radius, screen px */
  slingshotRadius: number
  /** rogue worlds get a hostile red rim */
  rogue: boolean
}

// A planet and its readable gravity well: a soft field glow out to the edge
// of its influence, a dashed ring at that edge whose dashes creep inward
// (the pull, made visible), and a faint inner ring marking the slingshot
// zone. Everything brightens as the ship enters the field.
export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  influenceRadius: number,
  sprite: HTMLImageElement,
  { time, proximity, slingshotRadius, rogue }: PlanetDrawOptions,
) {
  if (influenceRadius > 1) {
    const ratio = Math.round((radius / influenceRadius) * 100) / 100
    ctx.save()
    ctx.globalAlpha = 0.7 + proximity * 0.6
    ctx.translate(x, y)
    ctx.scale(influenceRadius, influenceRadius)
    ctx.fillStyle = cachedGradient(ctx, `planet-field:${ratio}:${rogue}`, (c) => {
      const g = c.createRadialGradient(0, 0, ratio, 0, 0, 1)
      g.addColorStop(0, rogue ? 'rgba(255, 110, 90, 0.16)' : 'rgba(120, 200, 160, 0.16)')
      g.addColorStop(1, rogue ? 'rgba(255, 110, 90, 0)' : 'rgba(120, 200, 160, 0)')
      return g
    })
    ctx.beginPath()
    ctx.arc(0, 0, 1, 0, TAU)
    ctx.fill()
    ctx.restore()

    ctx.save()
    const rgb = rogue ? '255, 140, 120' : '150, 230, 190'
    ctx.strokeStyle = `rgba(${rgb}, ${0.12 + proximity * 0.3})`
    ctx.lineWidth = 1.2
    ctx.setLineDash([3, 9])
    ctx.lineDashOffset = time * 14
    ctx.beginPath()
    ctx.arc(x, y, influenceRadius, 0, TAU)
    ctx.stroke()
    ctx.strokeStyle = `rgba(${rgb}, ${0.1 + proximity * 0.45})`
    ctx.setLineDash([2, 6])
    ctx.lineDashOffset = -time * 20
    ctx.beginPath()
    ctx.arc(x, y, slingshotRadius, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  if (!sprite.complete || sprite.naturalWidth === 0) return

  const size = radius * 2
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)

  if (rogue) {
    ctx.save()
    ctx.strokeStyle = `rgba(255, 90, 70, ${0.55 + 0.3 * Math.sin(time * 4)})`
    ctx.lineWidth = Math.max(radius * 0.05, 1.5)
    ctx.beginPath()
    ctx.arc(x, y, radius * 1.04, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }
}
