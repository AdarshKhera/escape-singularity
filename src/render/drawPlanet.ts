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
  drawAtmosphere(ctx, x, y, radius)
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size)
  drawLighting(ctx, x, y, radius)

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

// A thin atmospheric halo just outside the limb.
function drawAtmosphere(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  if (radius < 4) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  ctx.fillStyle = cachedGradient(ctx, 'planet:atmosphere', (c) => {
    const g = c.createRadialGradient(0, 0, 0.92, 0, 0, 1.14)
    g.addColorStop(0, 'rgba(170, 210, 255, 0)')
    g.addColorStop(0.35, 'rgba(170, 210, 255, 0.22)')
    g.addColorStop(1, 'rgba(170, 210, 255, 0)')
    return g
  })
  ctx.beginPath()
  ctx.arc(0, 0, 1.14, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// Every world is lit by the hole's accretion disk, which always lies ahead
// (to the right): a warm rim on that limb and the night side falling away
// into shadow behind it.
function drawLighting(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  if (radius < 4) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(radius, radius)
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, TAU)
  ctx.clip()
  ctx.fillStyle = cachedGradient(ctx, 'planet:night', (c) => {
    const g = c.createRadialGradient(0.75, -0.15, 0.5, 0.75, -0.15, 2.05)
    g.addColorStop(0, 'rgba(0, 0, 0, 0)')
    g.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)')
    g.addColorStop(1, 'rgba(0, 0, 0, 0.55)')
    return g
  })
  ctx.fillRect(-1, -1, 2, 2)
  ctx.globalCompositeOperation = 'lighter'
  ctx.strokeStyle = cachedGradient(ctx, 'planet:rim', (c) => {
    const g = c.createLinearGradient(0.2, 0, 1, 0)
    g.addColorStop(0, 'rgba(255, 214, 170, 0)')
    g.addColorStop(1, 'rgba(255, 224, 190, 0.75)')
    return g
  })
  ctx.lineWidth = 0.09
  ctx.beginPath()
  ctx.arc(0, 0, 0.97, -1.15, 1.15)
  ctx.stroke()
  ctx.restore()
}
