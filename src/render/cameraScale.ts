import {
  BLACK_HOLE_RADIUS,
  REFERENCE_SPEED,
  LANE_BOUND,
  STRUGGLE_ZOOM_IN,
  SUCK_IN_ZOOM_OUT,
  computeStruggleT,
  type LevelLayout,
} from '../levels/worldConfig'

const CRUISE_SCALE = 0.62

// Reserves room at the top of the canvas for the HUD panel, which sits above
// the game canvas in the DOM and would otherwise occlude the ship whenever it
// climbs — the play area is vertically centred below this line, not on the
// literal screen centre.
export const TOP_UI_MARGIN_PX = 120

// The world Y = 0 screen position, accounting for the reserved HUD strip.
export function computeScreenCentreY(height: number): number {
  const usableHeight = Math.max(height - TOP_UI_MARGIN_PX, 1)
  return TOP_UI_MARGIN_PX + usableHeight / 2
}

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

// The framing the approach settles into: both escape lanes must fit vertically
// and the whole hole must sit on screen when the player has to commit. Takes
// the hole's actual radius so a bigger-than-usual hole (a level's second,
// larger pass) still gets pulled back far enough to fit.
export function computeApproachScale(
  width: number,
  height: number,
  holeRadius: number = BLACK_HOLE_RADIUS,
): number {
  const usableHeight = Math.max(height - TOP_UI_MARGIN_PX, 1)
  const verticalFit = (usableHeight * 0.46) / LANE_BOUND
  const horizontalFit = (width * 0.52) / (REFERENCE_SPEED * 10)
  const holeFit = (width * 0.44) / holeRadius
  return Math.min(verticalFit, horizontalFit, holeFit)
}

// Pull back across the reveal, hold that framing through the pass (with the
// struggle push-in layered on top, peaking exactly at the hole), then ease
// back in over an identical span so the recovery is as gradual as the reveal.
export function computeCameraScale(
  shipWorldX: number,
  width: number,
  height: number,
  layout: LevelLayout,
  holeRadius: number = BLACK_HOLE_RADIUS,
): number {
  const approachScale = computeApproachScale(width, height, holeRadius)
  const struggleMultiplier = 1 + (STRUGGLE_ZOOM_IN - 1) * computeStruggleT(shipWorldX, layout)

  if (shipWorldX <= layout.revealStartX) return CRUISE_SCALE

  if (shipWorldX < layout.approachStartX) {
    const t = smoothstep(
      (shipWorldX - layout.revealStartX) / (layout.approachStartX - layout.revealStartX),
    )
    return CRUISE_SCALE + (approachScale - CRUISE_SCALE) * t
  }

  if (shipWorldX < layout.escapeClearX) return approachScale * struggleMultiplier

  const t = smoothstep(
    (shipWorldX - layout.escapeClearX) / (layout.levelEndX - layout.escapeClearX),
  )
  return approachScale + (CRUISE_SCALE - approachScale) * t
}

// Being swallowed pulls the camera back out instead of in, revealing the
// hole's true scale at the moment it wins. suckInT is elapsed/duration, 0..1.
export function applySuckInZoomOut(scale: number, suckInT: number): number {
  const eased = suckInT * suckInT
  return scale * (1 - eased * (1 - SUCK_IN_ZOOM_OUT))
}

// How far off centreline the camera will follow the ship during ordinary
// cruise flight, before the approach locks in. Keeps the ship (and the
// debris around it) framed without ever fully re-centring on it — straying
// this far is already a warning, not a safe cruising lane.
const CRUISE_FOLLOW_MAX = 320
const CRUISE_FOLLOW_RATIO = 0.55

// World Y the camera centres on.
//
// During ordinary cruise flight the camera drifts a little to keep the ship
// in view. Through the approach it locks back to the centreline so the hole
// holds its place in frame. Once past it, the camera hands back over to the
// ship — otherwise a ship that climbed thousands of units off-axis would
// slide out of view as the camera zooms back in.
export function computeCameraWorldY(
  shipWorldX: number,
  shipLateral: number,
  layout: LevelLayout,
): number {
  if (shipWorldX <= layout.revealStartX) {
    const target = shipLateral * CRUISE_FOLLOW_RATIO
    return Math.max(-CRUISE_FOLLOW_MAX, Math.min(CRUISE_FOLLOW_MAX, target))
  }
  if (shipWorldX <= layout.blackHoleX) return 0
  const follow = smoothstep(
    (shipWorldX - layout.blackHoleX) / (layout.escapeClearX - layout.blackHoleX),
  )
  return shipLateral * follow
}
