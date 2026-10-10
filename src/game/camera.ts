import {
  BOOST_SECONDS,
  PICKUP_BOOST_SECONDS,
  SUCK_IN_SECONDS,
  computeShakeAmount,
} from '../levels/worldConfig'
import {
  applySuckInZoomOut,
  computeCameraScale,
  computeCameraWorldY,
  computeScreenCentreY,
} from '../render/cameraScale'
import type { HoleSegment } from '../levels/levels'
import type { GameWorld } from './world'

export const SHIP_SCREEN_X_RATIO = 0.16
// how far the camera pulls back at full boost, for a sense of speed
const BOOST_ZOOM_OUT = 0.1

// Everything the render pass needs to map world space onto the screen for
// one frame. Reused across frames (mutated in place) to avoid allocating.
export interface CameraFrame {
  width: number
  height: number
  scale: number
  shipWorldX: number
  cameraWorldY: number
  screenCentreY: number
  shipScreenX: number
  /** 0..1 hull vibration from the hole */
  holeShake: number
  /** 0..1 either boost source, whichever is stronger */
  boostIntensity: number
}

export function createCameraFrame(): CameraFrame {
  return {
    width: 0,
    height: 0,
    scale: 1,
    shipWorldX: 0,
    cameraWorldY: 0,
    screenCentreY: 0,
    shipScreenX: 0,
    holeShake: 0,
    boostIntensity: 0,
  }
}

export interface CameraInputs {
  shipWorldX: number
  shipLateral: number
  suckedIn: boolean
}

export function updateCameraFrame(
  frame: CameraFrame,
  world: GameWorld,
  layout: HoleSegment,
  ship: CameraInputs,
  width: number,
  height: number,
  dt: number,
): void {
  let scale = computeCameraScale(ship.shipWorldX, width, height, layout, layout.holeRadius)
  if (ship.suckedIn) {
    scale = applySuckInZoomOut(scale, world.suckInElapsed / SUCK_IN_SECONDS)
  }

  const boostIntensity = Math.max(
    Math.min(world.boostTimer / BOOST_SECONDS, 1),
    Math.min(world.pickupBoostTimer / PICKUP_BOOST_SECONDS, 1),
  )
  // eased both ways so the double-tap doesn't snap the zoom
  world.smoothedBoost += (boostIntensity - world.smoothedBoost) * Math.min(dt * 5, 1)
  scale *= 1 - BOOST_ZOOM_OUT * world.smoothedBoost

  frame.width = width
  frame.height = height
  frame.scale = scale
  frame.shipWorldX = ship.shipWorldX
  frame.cameraWorldY = computeCameraWorldY(ship.shipWorldX, ship.shipLateral, layout)
  frame.screenCentreY = computeScreenCentreY(height)
  frame.shipScreenX = width * SHIP_SCREEN_X_RATIO
  frame.holeShake = ship.suckedIn
    ? 1
    : computeShakeAmount(ship.shipWorldX, ship.shipLateral, layout)
  frame.boostIntensity = boostIntensity
}

export function toScreenX(frame: CameraFrame, worldX: number): number {
  return frame.shipScreenX + (worldX - frame.shipWorldX) * frame.scale
}

export function toScreenY(frame: CameraFrame, worldY: number): number {
  return frame.screenCentreY + (worldY - frame.cameraWorldY) * frame.scale
}
