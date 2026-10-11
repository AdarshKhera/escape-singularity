import { computeRevealT } from '../levels/worldConfig'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import type { useGameStore } from '../state/gameStore'
import { drawBlackHole } from '../render/drawBlackHole'
import { drawBlackHoleLabel } from '../render/drawBlackHoleLabel'
import { drawSpeedLines } from '../render/drawSpeedLines'
import { computeHoleView } from '../render/holeView'
import { paletteForHole } from '../render/holePalette'
import type { Star } from '../render/drawStarfield'
import type { Sprites } from '../render/loadSprites'
import { toScreenY, type CameraFrame } from './camera'
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

function renderHole(input: RenderInputs, hole: HoleScreen, opacity: number, revealT: number): void {
  const { ctx, layout, time, world } = input
  if (opacity <= 0.01) return
  ctx.save()
  ctx.globalAlpha = opacity
  drawBlackHole(ctx, {
    x: hole.x,
    y: hole.y,
    radius: hole.radius,
    time,
    disk: 1,
    streams: qualitySettings(world.quality).matterStreams,
    palette: paletteForHole(layout.holeName),
    focus: hole.focus,
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
  ctx.restore()
}

export function renderFrame(input: RenderInputs): void {
  const { ctx, frame, world, level, layout, store, sprites, stars, time, dt } = input
  const revealT = computeRevealT(store.shipWorldX, layout)
  // a distant disc on the horizon that swells by perspective as the ship
  // closes in (see holeView.ts)
  const view = computeHoleView(
    {
      shipWorldX: store.shipWorldX,
      holeRadius: layout.holeRadius,
      blackHoleX: layout.blackHoleX,
      width: frame.width,
      scale: frame.scale,
      shipScreenX: frame.shipScreenX,
      screenCentreY: frame.screenCentreY,
      cameraWorldY: frame.cameraWorldY,
    },
    layout,
  )
  const hole: HoleScreen = { x: view.x, y: view.y, radius: view.radius, focus: view.focus }
  // lensing and darkness follow the hole in as it fades into view
  const faded: HoleScreen = { x: view.x, y: view.y, radius: view.radius * view.opacity, focus: view.focus }

  renderBackground(ctx, frame, world, store, layout, stars, faded, revealT, time)

  // the world layer shakes; full-screen overlays below do not
  ctx.save()
  ctx.translate(world.feedback.shakeX, world.feedback.shakeY)
  // the hole (and its bright disk) sits behind everything solid, so no
  // hazard can ever hide in its glow
  renderHole(input, hole, view.opacity, revealT)
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
