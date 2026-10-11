import { computeHorizonScale, computeRevealT } from '../levels/worldConfig'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import type { useGameStore } from '../state/gameStore'
import { drawBlackHole } from '../render/drawBlackHole'
import { drawBlackHoleLabel } from '../render/drawBlackHoleLabel'
import { drawSpeedLines } from '../render/drawSpeedLines'
import type { Star } from '../render/drawStarfield'
import type { Sprites } from '../render/loadSprites'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import { qualitySettings } from './quality'
import { renderBackground, type HoleScreen } from './renderBackground'
import { renderShipLayer } from './renderShip'
import { renderGhost, renderIncomingHazards } from './renderTelegraph'
import type { GameWorld } from './world'
import { renderFuelCache, renderObstacles, renderPlanets, renderProjectiles } from './renderObjects'
import {
  renderFields,
  renderFlash,
  renderParticles,
  renderPopups,
  renderRings,
  renderWarnings,
} from './renderEffects'

type StoreSnapshot = ReturnType<typeof useGameStore.getState>

export interface RenderInputs {
  ctx: CanvasRenderingContext2D
  frame: CameraFrame
  world: GameWorld
  level: LevelDefinition
  layout: HoleSegment
  store: StoreSnapshot
  sprites: Sprites
  stars: Star[]
  /** game seconds (slows with slow-mo, freezes on hit-stop) */
  time: number
  /** simulation seconds this frame; 0 when repainting a paused frame */
  dt: number
}

// the hole's name sits just above it, which is exactly the line a ship
// escaping over the top flies; it steps aside (fades) when the ship is near
function labelOpacity(input: RenderInputs, hole: HoleScreen, revealT: number): number {
  const { frame, store } = input
  const labelY = hole.y - hole.radius - 34
  const shipY = toScreenY(frame, store.shipLateral)
  const near = Math.abs(frame.shipScreenX - hole.x) < 260 ? Math.abs(shipY - labelY) / 70 : 1
  return Math.min(revealT, 1) * Math.min(Math.max(near, 0.15), 1)
}

function renderHole(input: RenderInputs, hole: HoleScreen, revealT: number): void {
  const { ctx, layout, time, world } = input
  drawBlackHole(ctx, {
    x: hole.x,
    y: hole.y,
    radius: hole.radius,
    time,
    disk: 1,
    streams: qualitySettings(world.quality).matterStreams,
  })
  drawBlackHoleLabel(
    ctx,
    layout.holeName,
    layout.holeDescription,
    hole.x,
    hole.y,
    hole.radius,
    labelOpacity(input, hole, revealT),
  )
}

export function renderFrame(input: RenderInputs): void {
  const { ctx, frame, world, level, layout, store, sprites, stars, time, dt } = input
  const revealT = computeRevealT(store.shipWorldX, layout)
  const hole: HoleScreen = {
    x: toScreenX(frame, layout.blackHoleX),
    y: toScreenY(frame, 0),
    // grows as the ship closes in, on top of the camera pull-back
    radius: layout.holeRadius * frame.scale * computeHorizonScale(store.shipWorldX, layout),
  }

  renderBackground(ctx, frame, world, store, layout, stars, hole, revealT, time)

  // the world layer shakes; full-screen overlays below do not
  ctx.save()
  ctx.translate(world.feedback.shakeX, world.feedback.shakeY)
  // the hole (and its bright disk) sits behind everything solid, so no
  // hazard can ever hide in its glow
  renderHole(input, hole, revealT)
  renderFields(ctx, frame, level, time, store.shipLateral)
  renderGhost(ctx, frame, world)
  renderPlanets(ctx, frame, level, layout, sprites, time, store.shipLateral)
  renderFuelCache(ctx, frame, world, layout, time)
  renderObstacles(ctx, frame, world, sprites, time)
  renderProjectiles(ctx, frame, world, sprites)
  renderParticles(ctx, frame, world, qualitySettings(world.quality).particleStreaks)
  renderShipLayer({ ctx, frame, world, store, layout, sprites, hole, time, dt })
  renderRings(ctx, frame, world)
  renderPopups(ctx, frame, world)
  ctx.restore()

  drawSpeedLines(ctx, frame.width, frame.height, time, frame.boostIntensity)
  if (store.status === 'playing') renderIncomingHazards(ctx, frame, world, store.shipLateral, time)
  renderWarnings(ctx, frame, world, time)
  renderFlash(ctx, frame, world)
}
