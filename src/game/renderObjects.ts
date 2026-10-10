import { FUEL_CACHE_RADIUS } from '../levels/worldConfig'
import { FLYBY_TRIGGER_RANGE } from '../levels/planets'
import { planetWorldY } from '../levels/planetMotion'
import type { HoleSegment, LevelDefinition } from '../levels/levels'
import { planetInfluenceRadius } from '../physics/gravity'
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
import { drawDerelict } from '../render/drawDerelict'
import { drawComet } from '../render/drawComet'
import {
  pickAsteroidSprite,
  pickMoonSprite,
  pickPlanetSprite,
  type Sprites,
} from '../render/loadSprites'
import { toScreenX, toScreenY, type CameraFrame } from './camera'
import { SLINGSHOT_RADII } from './planetSystem'
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
  shipLateral: number,
): void {
  for (const planet of level.planets) {
    const dx = frame.shipWorldX - planet.worldX
    if (Math.abs(dx) > PLANET_DRAW_RANGE) continue
    const worldY = planetWorldY(planet, layout.blackHoleX, time)
    const influence = planetInfluenceRadius(planet.radius, planet.influenceRadius)
    const distance = Math.hypot(dx, shipLateral - worldY)
    const proximity = Math.max(0, 1 - distance / influence)
    const px = toScreenX(frame, planet.worldX)
    const py = toScreenY(frame, worldY)
    const pr = planet.radius * frame.scale
    drawPlanet(ctx, px, py, pr, influence * frame.scale, pickPlanetSprite(sprites, planet.spriteIndex), {
      time,
      proximity,
      slingshotRadius: planet.radius * SLINGSHOT_RADII * frame.scale,
      rogue: planet.wander !== undefined,
    })

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
  frame: CameraFrame,
  obstacle: Obstacle,
  sx: number,
  sy: number,
  sprites: Sprites,
  time: number,
): void {
  const r = obstacle.radius * frame.scale
  switch (obstacle.type) {
    case 'asteroid':
      drawAsteroid(
        ctx,
        sx,
        sy,
        r,
        obstacle.angle,
        pickAsteroidSprite(sprites, obstacle.seed / 10),
        obstacle.reinforced,
        obstacle.hitsRemaining,
        obstacle.maxHits,
        obstacle.hitFlash,
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
    case 'derelict':
      drawDerelict(ctx, sx, sy, obstacle.angle, (obstacle.halfLength ?? 50) * frame.scale, r, time, obstacle.hitFlash)
      return
    case 'comet':
      drawComet(ctx, sx, sy, r, obstacle.vx - frame.shipSpeed, obstacle.vy, time)
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
    const margin = 120 + (obstacle.halfLength ?? 0) * frame.scale
    if (sx < -margin || sx > frame.width + margin + 200) continue
    const sy = toScreenY(frame, obstacle.worldY)
    if (sy < -margin - 200 || sy > frame.height + margin + 200) continue
    renderObstacle(ctx, frame, obstacle, sx, sy, sprites, time)
  }
}

export function renderProjectiles(
  ctx: CanvasRenderingContext2D,
  frame: CameraFrame,
  world: GameWorld,
  sprites: Sprites,
): void {
  for (const projectile of world.projectiles) {
    const sx = toScreenX(frame, projectile.worldX)
    if (sx < -80 || sx > frame.width + 80) continue
    const wobble = Math.sin(projectile.age * 40) * 0.04
    drawRocketProjectile(ctx, sx, toScreenY(frame, projectile.worldY), sprites.rocket, Math.max(frame.scale, 0.45), wobble)
  }
}
