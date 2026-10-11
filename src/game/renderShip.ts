import {
  GUIDE_FLASH_SECONDS,
  STRUGGLE_SHIP_SHRINK,
  SUCK_IN_SECONDS,
  computeApproachT,
  computeStruggleT,
} from '../levels/worldConfig'
import type { HoleSegment } from '../levels/levels'
import { drawGuidePath } from '../render/drawGuidePath'
import { drawShip } from '../render/drawShip'
import { drawShipShield } from '../render/drawShipShield'
import { drawAfterburner, drawEngineRibbon, drawShieldBubble } from '../render/drawShipFx'
import { getShipSpriteSet, type Sprites } from '../render/loadSprites'
import { damageTierForLives } from '../render/shipSkins'
import type { useGameStore } from '../state/gameStore'
import { toScreenY, type CameraFrame } from './camera'
import { flourishShipOffset } from './flourish'
import type { HoleScreen } from './renderBackground'
import { clearRibbon, stepRibbon } from './visualState'
import type { GameWorld } from './world'

type StoreSnapshot = ReturnType<typeof useGameStore.getState>

// the sprite's nozzle sits this far behind its centre, screen px at scale 1
const TAIL_OFFSET_PX = 17
const RIBBON_DRIFT_PX = 320
const RIBBON_BOOST_DRIFT_PX = 620
const RIBBON_RGB = '150, 205, 255'
const RIBBON_BOOST_RGB = '255, 170, 90'
const SHIELD_RADIUS_PX = 19

export interface ShipLayerInputs {
  ctx: CanvasRenderingContext2D
  frame: CameraFrame
  world: GameWorld
  store: StoreSnapshot
  layout: HoleSegment
  sprites: Sprites
  hole: HoleScreen
  time: number
  /** real seconds this frame (0 when repainting a paused frame) */
  dt: number
}

function drawGuide(input: ShipLayerInputs, x: number, y: number): void {
  const { ctx, world, store, layout, hole, time } = input
  // brief hint at the warning only, never a permanent racing line
  if (store.status !== 'playing' || world.guideFlash <= 0 || hole.radius <= 4) return
  ctx.save()
  ctx.globalAlpha = Math.min(world.guideFlash / GUIDE_FLASH_SECONDS, 1)
  drawGuidePath(ctx, {
    shipScreenX: x,
    shipScreenY: y,
    blackHoleScreenX: hole.x,
    blackHoleScreenY: hole.y,
    blackHoleScreenRadius: hole.radius,
    escapeSide: world.escapeSide,
    urgency: computeApproachT(store.shipWorldX, layout),
    time,
  })
  ctx.restore()
}

function drawEngine(input: ShipLayerInputs, x: number, y: number, scale: number, thrusting: boolean): void {
  const { ctx, world, store, frame, time, dt } = input
  const v = world.visuals
  const tilt = store.bankInput * 0.3
  const tailX = x - Math.cos(tilt) * TAIL_OFFSET_PX * scale
  const tailY = y - Math.sin(tilt) * TAIL_OFFSET_PX * scale
  const boost = frame.boostIntensity
  stepRibbon(v, tailX, tailY, boost > 0.1 ? RIBBON_BOOST_DRIFT_PX : RIBBON_DRIFT_PX, dt)
  const width = (thrusting ? 5 : 3) * scale * (1 + boost * 0.6)
  drawEngineRibbon(ctx, v.ribbonX, v.ribbonY, v.ribbonCount, width, boost > 0.1 ? RIBBON_BOOST_RGB : RIBBON_RGB, thrusting ? 1 : 0.45)
  drawAfterburner(ctx, tailX, tailY, tilt, scale, boost, time)
}

export function renderShipLayer(input: ShipLayerInputs): void {
  const { ctx, frame, world, store, layout, sprites, hole, time } = input
  const struggleT = computeStruggleT(store.shipWorldX, layout)
  let x = frame.shipScreenX + flourishShipOffset(world, frame.shipScreenX, frame.width)
  let y = toScreenY(frame, store.shipLateral)
  // reads smaller against the hole at the peak of the struggle, selling
  // its true scale, without ever losing the ship
  let scale = 1 - (1 - STRUGGLE_SHIP_SHRINK) * struggleT

  if (store.status === 'sucked-in') {
    const t = Math.min(world.suckInElapsed / SUCK_IN_SECONDS, 1)
    const eased = t * t
    const spiral = t * Math.PI * 3
    const radiusNow = Math.hypot(hole.x - x, hole.y - y) * (1 - eased)
    const baseAngle = Math.atan2(y - hole.y, x - hole.x)
    x = hole.x + Math.cos(baseAngle + spiral) * radiusNow
    y = hole.y + Math.sin(baseAngle + spiral) * radiusNow
    scale = 1 - eased
  }

  drawGuide(input, x, y)

  // a ship destroyed by a collision has already gone up in the explosion
  const destroyed =
    world.deathBeat > 0 ||
    ((store.status === 'life-lost' || store.status === 'game-over') && store.deathCause === 'collision')
  if (scale <= 0.02 || destroyed || store.status === 'sucked-in') clearRibbon(world.visuals)
  if (scale <= 0.02 || destroyed) return

  const thrusting =
    store.throttleInput > 0 ||
    world.boostTimer > 0 ||
    world.pickupBoostTimer > 0 ||
    store.phase === 'clear' ||
    store.status === 'level-complete'
  if (store.status !== 'sucked-in') drawEngine(input, x, y, scale, thrusting)

  const shipSet = getShipSpriteSet(sprites, store.shipSkinId, damageTierForLives(store.lives))
  drawShip(ctx, {
    x,
    y,
    bankInput: store.bankInput,
    invulnerable: store.invulnerable,
    thrusting,
    time,
    thrustFrames: shipSet.thrustFrames,
    idleFrame: shipSet.idleFrame,
    scale,
    shake: frame.holeShake,
  })

  if (store.shieldCharges > 0) {
    drawShieldBubble(ctx, x, y, SHIELD_RADIUS_PX * 1.25 * scale, time)
    drawShipShield(ctx, x, y, SHIELD_RADIUS_PX * scale, sprites.shieldFrames, time)
  }
}
