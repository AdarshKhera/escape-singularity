import { SHIP_RADIUS } from '../levels/worldConfig'
import { planetWorldY } from '../levels/planetMotion'
import type { LevelDefinition } from '../levels/levels'
import type { PlanetDefinition } from '../levels/planets'
import { planetInfluenceRadius } from '../physics/gravity'
import { useGameStore } from '../state/gameStore'
import { damageShip } from './damage'
import { onSlingshot } from './gameEvents'
import type { GameWorld, PlanetPass } from './world'

// Planets are solid at the core and reward a clean skim of their gravity.
//
// Core contact (inside PLANET_CORE_FRACTION of the drawn radius — a little
// forgiving, since the sprite's atmosphere is soft) is a hit like any rock,
// and bounces the ship back out so it can't be hit twice by the same world.
// Passing through the inner field (within SLINGSHOT_RADII of the centre)
// without touching the core earns a slingshot: a short burst of extra top
// speed, plus score.
export const PLANET_CORE_FRACTION = 0.82
export const SLINGSHOT_RADII = 2.1
export const SLINGSHOT_SECONDS = 1.6
export const SLINGSHOT_SPEED = 230
// the pass is judged once the ship is this many radii beyond the centre
const PASS_SETTLE_RADII = 1.6
const BOUNCE_SPEED = 420

function passFor(world: GameWorld, planet: PlanetDefinition): PlanetPass {
  let pass = world.planetPasses.get(planet.id)
  if (!pass) {
    pass = { minRatio: Infinity, touched: false, done: false }
    world.planetPasses.set(planet.id, pass)
  }
  return pass
}

function bounceOff(planetY: number, coreRadius: number, shipWorldX: number, lateral: number) {
  const store = useGameStore.getState()
  if (store.status !== 'playing') return
  const side = lateral >= planetY ? 1 : -1
  store.tickShip(
    shipWorldX,
    planetY + side * (coreRadius + SHIP_RADIUS + 6),
    side * BOUNCE_SPEED,
    store.shipForwardSpeed * 0.6,
  )
}

export function updatePlanets(
  world: GameWorld,
  level: LevelDefinition,
  blackHoleX: number,
  shipWorldX: number,
  lateral: number,
  time: number,
): void {
  for (const planet of level.planets) {
    const dx = shipWorldX - planet.worldX
    const influence = planetInfluenceRadius(planet.radius, planet.influenceRadius)
    if (dx < -influence) continue
    const existing = world.planetPasses.get(planet.id)
    if (existing?.done) continue
    if (dx > influence && !existing) continue

    const planetY = planetWorldY(planet, blackHoleX, time)
    const distance = Math.hypot(dx, lateral - planetY)
    const pass = passFor(world, planet)
    pass.minRatio = Math.min(pass.minRatio, distance / planet.radius)

    const coreRadius = planet.radius * PLANET_CORE_FRACTION
    if (distance < coreRadius + SHIP_RADIUS * 0.5 && !pass.touched) {
      pass.touched = true
      damageShip(world, shipWorldX, lateral)
      bounceOff(planetY, coreRadius, shipWorldX, lateral)
    }

    if (dx > planet.radius * PASS_SETTLE_RADII) {
      pass.done = true
      if (!pass.touched && pass.minRatio <= SLINGSHOT_RADII) {
        world.slingshotTimer = SLINGSHOT_SECONDS
        onSlingshot(world, planet.worldX, planetY, planet.radius, shipWorldX, lateral)
      }
    }
  }
}
