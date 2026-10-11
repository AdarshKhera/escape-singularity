import type { LevelLayout } from '../levels/worldConfig'
import { computeApproachScale, HOLE_HORIZON_X_RATIO } from './cameraScale'

// Where and how big the black hole is drawn.
//
// Far away it is a small, dim disc on the horizon, as if seen across a great
// distance. It then grows by true perspective (apparent size goes as 1 over
// the remaining distance), swelling faster and faster until it is a vast arc
// filling the lower or upper half of the screen, with the ship a speck beside
// it. Collisions are in world space and untouched: the perspective only
// governs the drawing, and by the time the hole is within one radius of the
// ship the drawing is exactly the world mapping, so what you see is where
// the capture boundary really is.

// beyond this distance (in hole radii) the hole fades out of view entirely
const FADE_START_RADII = 8
const FADE_END_RADII = 12

export interface HoleViewInput {
  shipWorldX: number
  holeRadius: number
  blackHoleX: number
  width: number
  /** camera: pixels per world unit, ship column, vertical centre and target */
  scale: number
  shipScreenX: number
  screenCentreY: number
  cameraWorldY: number
}

export interface HoleView {
  x: number
  y: number
  radius: number
  opacity: number
  /**
   * 0..1 how present the hole is. A distant hole is a dim, soft backdrop that
   * must not pull the eye off the path; it comes into focus, and starts to
   * bend the sky around it, only once it really looms.
   */
  focus: number
}

// in hole radii of remaining distance: fully quiet beyond FAR, full presence
// inside NEAR
const FOCUS_FAR_RADII = 9
const FOCUS_NEAR_RADII = 2.5

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

export function computeHoleView(input: HoleViewInput, layout: Pick<LevelLayout, 'blackHoleX'>): HoleView {
  const { shipWorldX, holeRadius: R, width, scale, shipScreenX, screenCentreY, cameraWorldY } = input
  const distance = layout.blackHoleX - shipWorldX

  // inside two radii the drawing converges on the true world mapping
  const near = distance <= R ? 1 : 1 - smoothstep((distance - R) / R)
  const endScale = computeApproachScale(width, R)
  const beyondCapture = Math.max(distance - R, 0)
  const perspective = (endScale * R) / (R + beyondCapture)
  const holeScale = perspective + (scale - perspective) * near

  // far centres bunch up toward the horizon instead of marching off-screen
  const xRoom = Math.max(HOLE_HORIZON_X_RATIO * width - shipScreenX, 1)
  const trueOffset = distance * holeScale
  const farOffset = xRoom * Math.tanh(trueOffset / xRoom)
  const offset = farOffset + (trueOffset - farOffset) * near

  const opacity = 1 - smoothstep((distance / R - FADE_START_RADII) / (FADE_END_RADII - FADE_START_RADII))

  const focus = 1 - smoothstep((distance / R - FOCUS_NEAR_RADII) / (FOCUS_FAR_RADII - FOCUS_NEAR_RADII))

  return {
    x: shipScreenX + offset,
    y: screenCentreY + (0 - cameraWorldY) * holeScale,
    radius: R * holeScale,
    opacity,
    focus,
  }
}
