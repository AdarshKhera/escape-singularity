import { pickReadyFrame } from './gradientCache'

interface DrawShipOptions {
  x: number
  y: number
  bankInput: -1 | 0 | 1
  invulnerable: boolean
  thrusting: boolean
  time: number
  thrustFrames: HTMLImageElement[]
  idleFrame: HTMLImageElement
  scale?: number
  shake?: number // 0..1, hull vibration near the hole
}

const FRAME_RATE = 14

// Drawn at a fixed screen size regardless of camera zoom, so the ship stays
// readable even when the camera pulls back far enough to frame the hole.
export function drawShip(
  ctx: CanvasRenderingContext2D,
  {
    x,
    y,
    bankInput,
    invulnerable,
    thrusting,
    time,
    thrustFrames,
    idleFrame,
    scale = 1,
    shake = 0,
  }: DrawShipOptions,
) {
  const sprite = thrusting
    ? pickReadyFrame(thrustFrames, Math.floor(time * FRAME_RATE))
    : idleFrame.complete && idleFrame.naturalWidth > 0
      ? idleFrame
      : null
  if (!sprite) return

  const flicker = invulnerable ? 0.4 + 0.6 * Math.abs(Math.sin(time * 12)) : 1
  const tilt = bankInput * 0.3

  // high frequency judder, biting harder the closer the hole gets
  const amplitude = shake * 5
  const jitterX = amplitude * Math.sin(time * 61) * Math.sin(time * 23.7)
  const jitterY = amplitude * Math.cos(time * 47.3) * Math.sin(time * 31.1)

  ctx.save()
  // fade out alongside the shrink when being swallowed
  ctx.globalAlpha = flicker * Math.min(scale, 1)
  ctx.translate(x + jitterX, y + jitterY)
  ctx.rotate(tilt + shake * 0.05 * Math.sin(time * 37))

  const size = 38 * scale
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size)

  ctx.restore()
  ctx.globalAlpha = 1
}
