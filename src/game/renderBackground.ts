import { VICTORY_STREAK_RAMP } from '../levels/worldConfig'
import type { HoleSegment } from '../levels/levels'
import { drawBackdrop, getBackdropTheme, getNebulaPalette } from '../render/drawBackdrop'
import { drawNebula } from '../render/nebulaBackdrop'
import { drawStarfield, type Star } from '../render/drawStarfield'
import { drawVoidDarkness } from '../render/drawVoidDarkness'
import type { useGameStore } from '../state/gameStore'
import type { CameraFrame } from './camera'
import { flourishStreak } from './flourish'
import { qualitySettings } from './quality'
import type { GameWorld } from './world'

type StoreSnapshot = ReturnType<typeof useGameStore.getState>

export interface HoleScreen {
  x: number
  y: number
  radius: number
}

// the victory burn: once clear, open up to a hard run through the stars
export function computeVictoryT(store: StoreSnapshot, layout: HoleSegment): number {
  if (store.phase !== 'clear') return 0
  const t =
    (store.shipWorldX - layout.escapeClearX) /
    (layout.levelEndX - layout.escapeClearX) /
    VICTORY_STREAK_RAMP
  return Math.min(t, 1)
}

// Depth, back to front: black, the level's nebula (furthest parallax
// layer), its colour wash, three star layers bent by the hole's lens, then
// the darkness the hole pulls in around itself.
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  store: StoreSnapshot,
  layout: HoleSegment,
  stars: Star[],
  hole: HoleScreen,
  revealT: number,
  time: number,
): void {
  const quality = qualitySettings(world.quality)
  const v = world.visuals
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, frame.width, frame.height)

  // space drains of colour as the hole closes in
  const fade = 1 - revealT * 0.85
  if (quality.nebula) {
    drawNebula(ctx, store.level, getNebulaPalette(store.level), frame.width, frame.height, v.parallaxX, v.parallaxY, fade)
  }
  drawBackdrop(ctx, frame.width, frame.height, getBackdropTheme(store.level), fade)

  drawStarfield(ctx, stars, {
    time,
    visibleFraction: (1 - revealT * 0.88) * quality.starFraction,
    skipClear: true,
    width: frame.width,
    height: frame.height,
    streak: Math.max(computeVictoryT(store, layout), flourishStreak(world)),
    offsetX: v.parallaxX,
    offsetY: v.parallaxY,
    // the bend only starts once the hole is actually looming
    lens: { x: hole.x, y: hole.y, radius: hole.radius, strength: revealT > 0 ? 0.25 + revealT * 0.75 : 0 },
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
