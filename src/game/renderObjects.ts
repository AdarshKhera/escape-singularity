import { FUEL_CACHE_RADIUS, computeOrbitOffset } from '../levels/worldConfig'
import { FLYBY_TRIGGER_RANGE } from '../levels/planets'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import { drawPlanet } from '../render/drawPlanet'
import { drawPlanetLabel } from '../render/drawPlanetLabel'
import { drawFuelCache } from '../render/drawFuelCache'
import { drawAsteroid } from '../render/drawAsteroid'
import { drawBlockade } from '../render/drawBlockade'
import { drawSpeedBooster } from '../render/drawSpeedBooster'
import { drawPickupLabel } from '../render/drawPickupLabel'
import { drawRocketPickup } from '../render/drawRocketPickup'
import { drawShieldPickup } from '../render/drawShieldPickup'
import { drawMoon } from '../render/drawMoon'
import { drawSatellite } from '../render/drawSatellite'
import { drawRocketProjectile } from '../render/drawRocketProjectile'
import { drawExplosion } from '../render/drawExplosion'
import {
  pickAsteroidSprite,
  pickMoonSprite,
  pickPlanetSprite,
  type Sprites,
} from '../render/loadSprites'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import { EXPLOSION_MS } from './combatSystem'
import type { GameWorld, Obstacle } from './world'

// planets further than this along the path are skipped entirely
const PLANET_DRAW_RANGE = 12000

export function renderPlanets(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  level: LevelDefinition,
  layout: HoleSegment,
  sprites: Sprites,
  time: number,
): void {
  for (const planet of level.planets) {
    const dx = frame.shipWorldX - planet.worldX
    if (Math.abs(dx) > PLANET_DRAW_RANGE) continue
    const orbitY =
      planet.worldY + computeOrbitOffset(planet.worldX, layout.blackHoleX, time, planet.worldX)
    const px = toScreenX(frame, planet.worldX)
    const py = toScreenY(frame, orbitY)
    const pr = planet.radius * frame.scale
    drawPlanet(
      ctx,
      px,
      py,
      pr,
      (planet.influenceRadius ?? planet.radius * 6) * frame.scale,
      pickPlanetSprite(sprites, planet.spriteIndex),
    )

    // flyby readout fades in as the ship draws level with the world
    const labelOpacity = 1 - Math.min(Math.abs(dx) / FLYBY_TRIGGER_RANGE, 1)
    drawPlanetLabel(ctx, planet, px, py, pr, labelOpacity)
  }
}

export function renderFuelCache(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  layout: HoleSegment,
  time: number,
): void {
  if (world.fuelCacheTaken) return
  const cx = toScreenX(frame, layout.fuelCacheX)
  if (cx < -200 || cx > frame.width + 200) return
  drawFuelCache(ctx, cx, toScreenY(frame, 0), FUEL_CACHE_RADIUS * frame.scale, time)
}

function renderObstacle(
  ctx: CanvasRenderingContext2D,
  obstacle: Obstacle,
  sx: number,
  sy: number,
  r: number,
  sprites: Sprites,
  time: number,
): void {
  switch (obstacle.type) {
    case 'asteroid':
      drawAsteroid(
        ctx,
        sx,
        sy,
        r,
        obstacle.seed,
        pickAsteroidSprite(sprites, obstacle.seed / 10),
        obstacle.reinforced,
        obstacle.hitsRemaining,
      )
      return
    case 'blockade':
      drawBlockade(ctx, sx, sy, r, obstacle.seed, pickAsteroidSprite(sprites, obstacle.seed / 10), time)
      return
    case 'booster':
      drawSpeedBooster(ctx, sx, sy, r, time)
      drawPickupLabel(ctx, 'SUPER FUEL', sx, sy, r + 12)
      return
    case 'rocketPickup':
      drawRocketPickup(ctx, sx, sy, r, sprites.rocket, time)
      drawPickupLabel(ctx, 'ROCKETS', sx, sy, r + 12)
      return
    case 'shieldPickup':
      drawShieldPickup(ctx, sx, sy, r, sprites.shieldIcon, time)
      drawPickupLabel(ctx, 'SHIELD', sx, sy, r + 12)
      return
    case 'moon':
      drawMoon(ctx, sx, sy, r, pickMoonSprite(sprites, obstacle.seed))
      return
    case 'satellite':
      drawSatellite(ctx, sx, sy, r, time)
      drawPickupLabel(ctx, 'FUEL', sx, sy, r + 12)
  }
}

export function renderObstacles(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  sprites: Sprites,
  time: number,
): void {
  for (const obstacle of world.obstacles) {
    const sx = toScreenX(frame, obstacle.worldX)
    if (sx < -120 || sx > frame.width + 120) continue
    const sy = toScreenY(frame, obstacle.worldY)
    renderObstacle(ctx, obstacle, sx, sy, obstacle.radius * frame.scale, sprites, time)
  }
}

export function renderProjectiles(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  sprites: Sprites,
  now: number,
): void {
  for (const projectile of world.projectiles) {
    const sx = toScreenX(frame, projectile.worldX)
    if (sx < -80 || sx > frame.width + 80) continue
    drawRocketProjectile(ctx, sx, toScreenY(frame, projectile.worldY), sprites.rocket, frame.scale)
  }

  for (const explosion of world.explosions) {
    const sx = toScreenX(frame, explosion.worldX)
    if (sx < -160 || sx > frame.width + 160) continue
    const sy = toScreenY(frame, explosion.worldY)
    const t = Math.min((now - explosion.startTime) / EXPLOSION_MS, 1)
    drawExplosion(ctx, sx, sy, frame.scale, t)
  }
}
