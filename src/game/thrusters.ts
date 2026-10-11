import type { LevelPhase } from '../levels/worldConfig'
import { PC } from './particles'
import type { ShipControls, ShipKinematics } from './shipStep'
import type { GameWorld } from './world'

// Exhaust particles streaming off the ship's tail. The ship is drawn at a
// fixed screen size whatever the zoom, so its tail offset and the exhaust
// speed are authored in screen pixels and converted through the view scale.
const TAIL_OFFSET_PX = 17
const EXHAUST_SPEED_PX = 220
const BASE_RATE = 55
const BOOST_RATE = 150

export function emitThrusters(
  world: GameWorld,
  ship: ShipKinematics,
  controls: ShipControls,
  phase: LevelPhase,
  dt: number,
): void {
  const boosted = controls.boosting || controls.pickupBoosting || (controls.extraSpeed ?? 0) > 0
  const thrusting = controls.throttle > 0 || boosted || phase === 'clear'
  if (!thrusting || dt <= 0) return

  const scale = Math.max(world.viewScale, 0.02)
  world.thrusterCarry += (boosted ? BOOST_RATE : BASE_RATE) * dt
  const tailX = ship.worldX - TAIL_OFFSET_PX / scale
  const exhaust = EXHAUST_SPEED_PX / scale
  while (world.thrusterCarry >= 1) {
    world.thrusterCarry -= 1
    const spread = (Math.random() - 0.5) * (boosted ? 90 : 50)
    world.particles.spawn(
      tailX,
      ship.lateral + (Math.random() - 0.5) * (5 / scale),
      // trails behind: slower than the ship by the exhaust speed
      ship.forwardSpeed - exhaust * (0.7 + Math.random() * 0.6),
      ship.lateralVelocity * 0.4 + spread / scale,
      0.22 + Math.random() * 0.18,
      boosted ? 2.6 + Math.random() * 1.6 : 1.6 + Math.random() * 1.2,
      boosted && Math.random() < 0.5 ? PC.booster : PC.thruster,
      2.5,
    )
  }
}

// A wounded hull trails smoke (and, on its last life, the odd spark), so
// the damage reads at a glance without looking at the HUD.
const SMOKE_RATE_BY_LIVES = [0, 22, 9]

export function emitDamageSmoke(
  world: GameWorld,
  ship: ShipKinematics,
  lives: number,
  dt: number,
): void {
  const rate = lives >= 0 && lives < SMOKE_RATE_BY_LIVES.length ? SMOKE_RATE_BY_LIVES[lives] : 0
  if (rate <= 0 || dt <= 0) return
  const scale = Math.max(world.viewScale, 0.02)
  world.visuals.smokeCarry += rate * dt
  while (world.visuals.smokeCarry >= 1) {
    world.visuals.smokeCarry -= 1
    const x = ship.worldX - (6 + Math.random() * 8) / scale
    const y = ship.lateral + (Math.random() - 0.5) * (10 / scale)
    world.particles.spawn(
      x,
      y,
      ship.forwardSpeed - (60 + Math.random() * 60) / scale,
      ship.lateralVelocity * 0.3 + ((Math.random() - 0.5) * 50) / scale,
      0.5 + Math.random() * 0.5,
      2.6 + Math.random() * 2.6,
      PC.smoke,
      1.2,
      false,
    )
    if (lives === 1 && Math.random() < 0.18) {
      world.particles.spawn(
        x,
        y,
        ship.forwardSpeed + ((Math.random() - 0.5) * 300) / scale,
        ((Math.random() - 0.5) * 300) / scale,
        0.25,
        1.8,
        PC.spark,
        2,
      )
    }
  }
}
