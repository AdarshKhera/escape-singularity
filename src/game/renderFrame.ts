import {
  GUIDE_FLASH_SECONDS,
  STRUGGLE_SHIP_SHRINK,
  SUCK_IN_SECONDS,
  VICTORY_STREAK_RAMP,
  computeApproachT,
  computeHorizonScale,
  computeRevealT,
  computeStruggleT,
} from '../levels/worldConfig'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import type { useGameStore } from '../state/gameStore'
import { drawBackdrop, getBackdropTheme } from '../render/drawBackdrop'
import { drawStarfield, type Star } from '../render/drawStarfield'
import { drawVoidDarkness } from '../render/drawVoidDarkness'
import { drawBlackHole } from '../render/drawBlackHole'
import { drawBlackHoleLabel } from '../render/drawBlackHoleLabel'
import { drawGuidePath } from '../render/drawGuidePath'
import { drawShip } from '../render/drawShip'
import { drawShipShield } from '../render/drawShipShield'
import { drawSpeedLines } from '../render/drawSpeedLines'
import { getShipSpriteSet, type Sprites } from '../render/loadSprites'
import { damageTierForLives } from '../render/shipSkins'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import type { GameWorld } from './world'
import { renderFuelCache, renderObstacles, renderPlanets, renderProjectiles } from './renderObjects'

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
  time: number
  now: number
}

interface HoleScreen {
  x: number
  y: number
  radius: number
}

// the victory burn: once clear, open up to a hard run through the stars
function computeVictoryT(store: StoreSnapshot, layout: HoleSegment): number {
  if (store.phase !== 'clear') return 0
  const t =
    (store.shipWorldX - layout.escapeClearX) /
    (layout.levelEndX - layout.escapeClearX) /
    VICTORY_STREAK_RAMP
  return Math.min(t, 1)
}

function renderBackground(input: RenderInputs, hole: HoleScreen, revealT: number): void {
  const { ctx, frame, store, layout, stars, time } = input
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, frame.width, frame.height)
  drawBackdrop(ctx, frame.width, frame.height, getBackdropTheme(store.level), 1 - revealT * 0.8)

  const victoryT = computeVictoryT(store, layout)
  // the hole eats the starlight as it closes in
  drawStarfield(ctx, stars, {
    time,
    visibleFraction: 1 - revealT * 0.88,
    skipClear: true,
    streak: victoryT,
    scrollSpeed: victoryT * 900,
    warp: {
      x: hole.x,
      y: hole.y,
      radius: hole.radius * 3.4,
      strength: 0.4 + revealT * 1.8,
    },
  })

  drawVoidDarkness(ctx, {
    x: hole.x,
    y: hole.y,
    radius: hole.radius,
    revealT,
    width: frame.width,
    height: frame.height,
  })
}

function renderHole(input: RenderInputs, hole: HoleScreen, revealT: number): void {
  const { ctx, layout, time } = input
  drawBlackHole(ctx, { x: hole.x, y: hole.y, radius: hole.radius, time })
  drawBlackHoleLabel(
    ctx,
    layout.holeName,
    layout.holeDescription,
    hole.x,
    hole.y,
    hole.radius,
    Math.min(revealT, 1),
  )
}

function renderShipLayer(input: RenderInputs, hole: HoleScreen): void {
  const { ctx, frame, world, store, layout, sprites, time } = input
  const struggleT = computeStruggleT(store.shipWorldX, layout)
  let shipDrawX = frame.shipScreenX
  let shipDrawY = toScreenY(frame, store.shipLateral)
  // reads smaller against the hole at the peak of the struggle, selling
  // its true scale, without ever losing the ship
  let shipScaleFactor = 1 - (1 - STRUGGLE_SHIP_SHRINK) * struggleT

  if (store.status === 'sucked-in') {
    const t = Math.min(world.suckInElapsed / SUCK_IN_SECONDS, 1)
    const eased = t * t
    const spiral = t * Math.PI * 3
    const radiusNow = Math.hypot(hole.x - shipDrawX, hole.y - shipDrawY) * (1 - eased)
    const baseAngle = Math.atan2(shipDrawY - hole.y, shipDrawX - hole.x)
    shipDrawX = hole.x + Math.cos(baseAngle + spiral) * radiusNow
    shipDrawY = hole.y + Math.sin(baseAngle + spiral) * radiusNow
    shipScaleFactor = 1 - eased
  }

  // brief hint at the warning only — never a permanent racing line
  if (store.status === 'playing' && world.guideFlash > 0 && hole.radius > 4) {
    ctx.save()
    ctx.globalAlpha = Math.min(world.guideFlash / GUIDE_FLASH_SECONDS, 1)
    drawGuidePath(ctx, {
      shipScreenX: shipDrawX,
      shipScreenY: shipDrawY,
      blackHoleScreenX: hole.x,
      blackHoleScreenY: hole.y,
      blackHoleScreenRadius: hole.radius,
      escapeSide: world.escapeSide,
      urgency: computeApproachT(store.shipWorldX, layout),
      time,
    })
    ctx.restore()
  }

  if (shipScaleFactor <= 0.02) return
  const shipSet = getShipSpriteSet(sprites, store.shipSkinId, damageTierForLives(store.lives))
  const thrusting =
    store.throttleInput > 0 ||
    world.boostTimer > 0 ||
    world.pickupBoostTimer > 0 ||
    store.phase === 'clear'
  drawShip(ctx, {
    x: shipDrawX,
    y: shipDrawY,
    bankInput: store.bankInput,
    invulnerable: store.invulnerable,
    thrusting,
    time,
    thrustFrames: shipSet.thrustFrames,
    idleFrame: shipSet.idleFrame,
    scale: shipScaleFactor,
    shake: frame.holeShake,
  })

  if (store.shieldCharges > 0) {
    drawShipShield(ctx, shipDrawX, shipDrawY, 19 * shipScaleFactor, sprites.shieldFrames, time)
  }
}

export function renderFrame(input: RenderInputs): void {
  const { ctx, frame, world, level, layout, store, sprites, time, now } = input
  const revealT = computeRevealT(store.shipWorldX, layout)
  const hole: HoleScreen = {
    x: toScreenX(frame, layout.blackHoleX),
    y: toScreenY(frame, 0),
    // grows as the ship closes in, on top of the camera pull-back
    radius: layout.holeRadius * frame.scale * computeHorizonScale(store.shipWorldX, layout),
  }

  renderBackground(input, hole, revealT)
  renderPlanets(ctx, frame, level, layout, sprites, time)
  renderFuelCache(ctx, frame, world, layout, time)
  renderObstacles(ctx, frame, world, sprites, time)
  renderProjectiles(ctx, frame, world, sprites, now)
  renderHole(input, hole, revealT)
  renderShipLayer(input, hole)
  drawSpeedLines(ctx, frame.width, frame.height, time, frame.boostIntensity)
}
