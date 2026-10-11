import {
  BLACK_HOLE_RADIUS,
  CRUISE_LANE_BOUND,
  SUCK_IN_ZOOM_OUT,
  type LevelLayout,
} from '../levels/worldConfig'

const CRUISE_SCALE = 0.62
// the ship's default horizontal position as a fraction of screen width
export const DEFAULT_SHIP_X_RATIO = 0.16
// where the far hole sits on the horizon, as a fraction of the screen width
export const HOLE_HORIZON_X_RATIO = 0.74
// at the committed turn the hole's rim should reach this far across the
// screen: a huge arc filling the lower (or upper) half, with the ship a speck
// beside it
const HOLE_END_RADIUS_WIDTH_RATIO = 0.62
// bigger holes read bigger, but only by the square root of their size
const HOLE_END_RADIUS_GROWTH = 0.5
// how much of the ship's lateral offset the camera takes up at the hole, so
// the hole slides away instead of the ship climbing off the screen
const APPROACH_FOLLOW = 0.85

// Reserves room at the top of the canvas for the HUD panel, which sits above
// the game canvas in the DOM and would otherwise occlude the ship whenever it
// climbs — the play area is vertically centred below this line, not on the
// literal screen centre. Short (landscape phone) screens reserve
// proportionally less, or the HUD strip would eat a third of the view.
export const TOP_UI_MARGIN_PX = 120
const TOP_UI_MARGIN_RATIO = 0.16

export function computeTopUiMargin(height: number): number {
  return Math.min(TOP_UI_MARGIN_PX, Math.round(height * TOP_UI_MARGIN_RATIO))
}

// Screen-space room kept between the ship's centre and the edge of the
// visible band: half the drawn sprite plus a little air.
export const SHIP_FRAME_MARGIN_PX = 30

function usableHeightOf(height: number): number {
  return Math.max(height - computeTopUiMargin(height), 1)
}

// The world Y = 0 screen position, accounting for the reserved HUD strip.
export function computeScreenCentreY(height: number): number {
  return computeTopUiMargin(height) + usableHeightOf(height) / 2
}

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

// The hard ceiling on zoom for a given worst-case off-centre distance: past
// this, a ship that far from the camera's centre no longer fits the visible
// band, whatever framing effect wants a tighter shot.
function fitScaleFor(height: number, maxOffset: number): number {
  const halfBand = usableHeightOf(height) / 2 - SHIP_FRAME_MARGIN_PX
  return Math.max(halfBand, 1) / Math.max(maxOffset, 1)
}

// How far off centreline the camera will follow the ship during ordinary
// cruise flight, before the approach locks in. Keeps the ship (and the
// debris around it) framed without ever fully re-centring on it — straying
// this far is already a warning, not a safe cruising lane.
const CRUISE_FOLLOW_MAX = 320
const CRUISE_FOLLOW_RATIO = 0.55

function cruiseFollow(shipLateral: number): number {
  const target = shipLateral * CRUISE_FOLLOW_RATIO
  return Math.max(-CRUISE_FOLLOW_MAX, Math.min(CRUISE_FOLLOW_MAX, target))
}

// Cruise zoom, pulled back on short screens so the full cruise lane still
// fits around the follow camera.
function computeCruiseScale(height: number): number {
  const worstOffset = CRUISE_LANE_BOUND - cruiseFollow(CRUISE_LANE_BOUND)
  return Math.min(CRUISE_SCALE, fitScaleFor(height, worstOffset))
}

// The framing the approach settles into. The world is pulled well back, so
// the hole's rim spans most of the screen while the ship stays a speck beside
// it (the ship is drawn at a fixed pixel size and shrinks further at the
// peak). Because the hole is that big on screen, the camera follows the ship
// across the turn (see computeCameraWorldY) and computeCameraView still
// guarantees the ship is in frame.
export function computeApproachScale(
  width: number,
  holeRadius: number = BLACK_HOLE_RADIUS,
): number {
  const sizeBoost = Math.pow(holeRadius / BLACK_HOLE_RADIUS, HOLE_END_RADIUS_GROWTH)
  return (HOLE_END_RADIUS_WIDTH_RATIO * width * sizeBoost) / holeRadius
}

// Pull back across the reveal, hold that framing through the pass, then ease
// back in over an identical span so the recovery is as gradual as the reveal.
export function computeCameraScale(
  shipWorldX: number,
  width: number,
  height: number,
  layout: LevelLayout,
  holeRadius: number = BLACK_HOLE_RADIUS,
): number {
  const approachScale = Math.min(computeApproachScale(width, holeRadius), computeCruiseScale(height))
  const cruiseScale = computeCruiseScale(height)

  if (shipWorldX <= layout.revealStartX) return cruiseScale

  if (shipWorldX < layout.approachStartX) {
    const t = smoothstep(
      (shipWorldX - layout.revealStartX) / (layout.approachStartX - layout.revealStartX),
    )
    return cruiseScale + (approachScale - cruiseScale) * t
  }

  if (shipWorldX < layout.escapeClearX) return approachScale

  const t = smoothstep(
    (shipWorldX - layout.escapeClearX) / (layout.levelEndX - layout.escapeClearX),
  )
  return approachScale + (cruiseScale - approachScale) * t
}

// Being swallowed pulls the camera back out instead of in, revealing the
// hole's true scale at the moment it wins. suckInT is elapsed/duration, 0..1.
export function applySuckInZoomOut(scale: number, suckInT: number): number {
  const eased = suckInT * suckInT
  return scale * (1 - eased * (1 - SUCK_IN_ZOOM_OUT))
}

// World Y the camera centres on.
//
// During ordinary cruise flight the camera drifts a little to keep the ship
// in view, easing back to the centreline across the reveal so the hole sits
// dead ahead while it is still a distant disc. Through the final approach the
// camera follows the ship's turn (most of the way), so the huge hole slides
// below or above the frame instead of the ship leaving it. Once past, the
// camera hands fully over to the ship as the zoom eases back in.
export function computeCameraWorldY(
  shipWorldX: number,
  shipLateral: number,
  layout: LevelLayout,
): number {
  if (shipWorldX <= layout.revealStartX) return cruiseFollow(shipLateral)
  if (shipWorldX <= layout.approachStartX) {
    const t = smoothstep(
      (shipWorldX - layout.revealStartX) / (layout.approachStartX - layout.revealStartX),
    )
    return cruiseFollow(shipLateral) * (1 - t)
  }
  if (shipWorldX <= layout.blackHoleX) {
    const closing = smoothstep(
      (shipWorldX - layout.approachStartX) / (layout.blackHoleX - layout.approachStartX),
    )
    return shipLateral * APPROACH_FOLLOW * closing
  }
  const handover = smoothstep(
    (shipWorldX - layout.blackHoleX) / (layout.escapeClearX - layout.blackHoleX),
  )
  return shipLateral * (APPROACH_FOLLOW + (1 - APPROACH_FOLLOW) * handover)
}

export interface CameraView {
  scale: number
  cameraWorldY: number
}

// The camera for one frame: the framing curve above, then the one rule that
// overrides every other effect — the ship stays inside the visible band. If
// the ship has strayed further off-centre than the curve allows for (only
// possible mid-reveal, while the zoom is still easing out), the zoom gives
// way rather than the ship leaving the frame.
export function computeCameraView(
  shipWorldX: number,
  shipLateral: number,
  width: number,
  height: number,
  layout: LevelLayout,
  holeRadius: number = BLACK_HOLE_RADIUS,
): CameraView {
  const cameraWorldY = computeCameraWorldY(shipWorldX, shipLateral, layout)
  const curve = computeCameraScale(shipWorldX, width, height, layout, holeRadius)
  const shipFit = fitScaleFor(height, Math.abs(shipLateral - cameraWorldY))
  return { scale: Math.min(curve, shipFit), cameraWorldY }
}
