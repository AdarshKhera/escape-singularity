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
