import { useGameStore } from '../state/gameStore'
import { audioEngine } from '../audio/AudioEngine'
import { SCORE } from './scoring'
import { addTrauma, triggerFlash, triggerHitStop, triggerSlowMo } from './feedback'
import { PC, type ParticleColor } from './particles'
import type { GameWorld, Obstacle } from './world'

// Every "moment" in the game funnels through here, so feel (particles,
// shake, hit-stop, sound, haptics) and bookkeeping (stats, score) stay in
// step and each system only has to say what happened.

const POPUP_RGB = {
  score: '255,236,170',
  good: '140,255,170',
  bad: '255,120,110',
  info: '170,215,255',
} as const

// Effects are authored in screen pixels so they read the same at cruise zoom
// and at the far pulled-back approach framing; this converts to world units.
function px(world: GameWorld, pixels: number): number {
  return pixels / Math.max(world.viewScale, 0.02)
}

export function addPopup(
  world: GameWorld,
  text: string,
  worldX: number,
  worldY: number,
  rgb: string = POPUP_RGB.score,
): void {
  world.popups.push({ text, worldX, worldY, start: world.simTime, rgb })
}

export function addRing(
  world: GameWorld,
  worldX: number,
  worldY: number,
  maxRadius: number,
  duration: number,
  rgb: string,
): void {
  world.rings.push({ worldX, worldY, start: world.simTime, duration, maxRadius, rgb })
}

/** the white-hot flash at the heart of an explosion */
export function addFlare(world: GameWorld, worldX: number, worldY: number, radius: number, duration: number, rgb: string): void {
  world.rings.push({ worldX, worldY, start: world.simTime, duration, maxRadius: radius, rgb, flare: true })
}

export function showEventBanner(world: GameWorld, text: string, seconds: number): void {
  world.eventBanner = text
  world.eventBannerTimer = seconds
}

const PICKUP_COLOR: Partial<Record<Obstacle['type'], ParticleColor>> = {
  satellite: PC.fuel,
  booster: PC.booster,
  rocketPickup: PC.rocket,
  shieldPickup: PC.ice,
}

export function onPickup(world: GameWorld, obstacle: Obstacle, label: string): void {
  const color = PICKUP_COLOR[obstacle.type] ?? PC.white
  world.particles.burst(obstacle.worldX, obstacle.worldY, 22, px(world, 420), 0.6, 3.2, color)
  world.particles.burst(obstacle.worldX, obstacle.worldY, 8, px(world, 160), 0.9, 2, PC.white)
  addRing(world, obstacle.worldX, obstacle.worldY, obstacle.radius * 3.2, 0.4, '210,255,220')
  addPopup(world, label, obstacle.worldX, obstacle.worldY - obstacle.radius, POPUP_RGB.good)
  audioEngine.playSfx('pickup')
  const store = useGameStore.getState()
  store.emitHaptic('pickup')
  store.addRunStats({ pickupsCollected: 1, score: SCORE.pickup })
}

export function onFuelCache(world: GameWorld, worldX: number, worldY: number): void {
  world.particles.burst(worldX, worldY, 40, px(world, 600), 0.8, 3.6, PC.fuel)
  addRing(world, worldX, worldY, px(world, 130), 0.6, '160,255,170')
  audioEngine.playSfx('pickup', 1.2)
  const store = useGameStore.getState()
  store.emitHaptic('pickup')
  store.addRunStats({ pickupsCollected: 1, score: SCORE.pickup })
}

// a rocket broke something: size sells the impact
export function onKill(world: GameWorld, obstacle: Obstacle): void {
  const size = Math.min(obstacle.radius / 60, 2)
  const x = obstacle.worldX
  const y = obstacle.worldY
  const particles = world.particles
  particles.burst(x, y, 14 + Math.round(size * 14), px(world, 520 + size * 200), 0.45, 3.2, PC.spark, true, obstacle.vx)
  particles.burst(x, y, 10 + Math.round(size * 10), px(world, 300 + size * 120), 0.9, 4.5 + size * 2, PC.fire, true, obstacle.vx)
  particles.burst(x, y, 8 + Math.round(size * 10), px(world, 420), 1.4, 4 + size * 3, PC.rock, false, obstacle.vx)
  particles.burst(x, y, 6 + Math.round(size * 6), px(world, 140), 1.6, 5 + size * 3, PC.smoke, false, obstacle.vx)
  addFlare(world, x, y, obstacle.radius * 1.8 + px(world, 30), 0.28, '255,190,120')
  addRing(world, x, y, obstacle.radius * 2.6 + 40, 0.35, '255,200,130')
  addRing(world, x, y, obstacle.radius * 4 + px(world, 60), 0.6, '255,150,90')
  addTrauma(world.feedback, 0.18 + size * 0.14)
  triggerHitStop(world.feedback, 0.03 + size * 0.02)
  audioEngine.playSfx(size > 1 ? 'bigExplosion' : 'explosion', 0.7 + size * 0.3)
  addPopup(world, `+${SCORE.kill}`, x, y)
  const store = useGameStore.getState()
  store.emitHaptic('explosion')
  store.addRunStats({ asteroidsDestroyed: 1, score: SCORE.kill })
}

// a rocket cracked armour without breaking through
export function onArmourHit(world: GameWorld, obstacle: Obstacle, impactX: number, impactY: number): void {
  obstacle.hitFlash = 0.15
  world.particles.burst(impactX, impactY, 16, px(world, 460), 0.35, 2.6, PC.spark)
  world.particles.burst(impactX, impactY, 6, px(world, 200), 1, 3.5, PC.rock, false)
  addTrauma(world.feedback, 0.14)
  audioEngine.playSfx('explosion', 0.5)
}

export function onFire(world: GameWorld, x: number, y: number): void {
  world.particles.burst(x + px(world, 14), y, 8, px(world, 260), 0.18, 2.6, PC.spark, true, px(world, 600))
  addTrauma(world.feedback, 0.05)
  audioEngine.playSfx('fire')
}

// severity: the ship's hitFeedback (armour), 1 for the Scout
export function onShipHit(world: GameWorld, x: number, y: number, shieldAbsorbed: boolean, severity = 1): void {
  world.particles.burst(x, y, 26, px(world, 520), 0.5, 3, shieldAbsorbed ? PC.ice : PC.spark)
  world.particles.burst(x, y, 10, px(world, 260), 1, 3.6, PC.rock, false)
  addTrauma(world.feedback, (shieldAbsorbed ? 0.45 : 0.7) * severity)
  triggerHitStop(world.feedback, (shieldAbsorbed ? 0.06 : 0.1) * severity)
  triggerFlash(world.feedback, (shieldAbsorbed ? 0.35 : 0.5) * severity, shieldAbsorbed ? '150,210,255' : '255,60,50')
  audioEngine.playSfx(shieldAbsorbed ? 'shieldBreak' : 'hit')
  if (shieldAbsorbed) {
    addPopup(world, 'SHIELD DOWN', x, y - px(world, 30), POPUP_RGB.info)
    useGameStore.getState().emitHaptic('hit')
  } else {
    // the ship itself goes up; loseLife already fires the death haptic.
    // A beat of slow motion lets the player see exactly what got them.
    world.particles.burst(x, y, 40, px(world, 700), 0.9, 4, PC.fire)
    world.particles.burst(x, y, 14, px(world, 160), 1.4, 6, PC.smoke, false)
    addFlare(world, x, y, px(world, 70), 0.35, '255,170,110')
    addRing(world, x, y, px(world, 90), 0.5, '255,150,90')
    addRing(world, x, y, px(world, 170), 0.8, '255,110,80')
    triggerSlowMo(world.feedback, 0.7)
  }
}

export function onNearMiss(world: GameWorld, x: number, y: number): void {
  audioEngine.playSfx('nearMiss')
  addPopup(world, `CLOSE +${SCORE.nearMiss}`, x, y, POPUP_RGB.info)
  useGameStore.getState().addRunStats({ nearMisses: 1, score: SCORE.nearMiss })
}

export function onBoost(world: GameWorld, x: number, y: number): void {
  world.particles.burst(x - px(world, 16), y, 18, px(world, 380), 0.4, 3, PC.thruster, true, px(world, -300))
  addTrauma(world.feedback, 0.12)
  audioEngine.playSfx('boost')
  useGameStore.getState().emitHaptic('boost')
}

export function onSlingshot(world: GameWorld, planetX: number, planetY: number, radius: number, shipX: number, shipY: number): void {
  addRing(world, planetX, planetY, radius * 3, 0.7, '140,255,200')
  world.particles.burst(shipX, shipY, 20, px(world, 400), 0.5, 2.8, PC.fuel, true, px(world, 400))
  addPopup(world, `SLINGSHOT +${SCORE.slingshot}`, shipX, shipY - px(world, 40), POPUP_RGB.good)
  audioEngine.playSfx('slingshot')
  const store = useGameStore.getState()
  store.emitHaptic('boost')
  store.addRunStats({ slingshots: 1, score: SCORE.slingshot })
}

// clearing a hole: the beat the whole level builds to
export function onEscape(world: GameWorld, x: number, y: number, skimBonus: number): void {
  triggerSlowMo(world.feedback, 1.1)
  triggerFlash(world.feedback, 0.55, '235,245,255')
  addTrauma(world.feedback, 0.3)
  addRing(world, x, y, px(world, 460), 1.1, '220,235,255')
  addFlare(world, x, y, px(world, 120), 0.5, '220,235,255')
  world.particles.burst(x, y, 60, px(world, 900), 1.2, 3, PC.white, true, px(world, 600))
  audioEngine.playSfx('escape')
  const store = useGameStore.getState()
  store.emitHaptic('escape')
  if (skimBonus > 0) {
    addPopup(world, `HORIZON SKIM +${skimBonus}`, x, y - px(world, 60), POPUP_RGB.score)
    store.addRunStats({ score: skimBonus })
  }
}

export function onWarning(world: GameWorld, text: string): void {
  showEventBanner(world, text, 2)
  audioEngine.playSfx('warning')
}
