import { audioEngine } from '../audio/AudioEngine'
import { addTrauma, triggerFlash } from './feedback'
import { PC } from './particles'
import type { GameWorld } from './world'

// The two bookends of every attempt, tunable here:
//  - warp-in: the ship drops out of warp from off-screen left, stars
//    collapsing from streaks back to points, with a soft flash on arrival;
//  - exit: on reaching the end of the level the ship punches out to the
//    right in a burst of streaks and a white flash, and only then does the
//    level complete, so the end screen never hides the moment.

export const WARP_IN_SECONDS = 1.1
/** star streak length at the very start of the warp-in (1 = full warp) */
export const WARP_IN_STREAK = 1.1
export const EXIT_SECONDS = 0.7
/** real seconds into the exit before the level counts as complete (end screen) */
export const EXIT_HOLD_SECONDS = 0.85
export const EXIT_STREAK = 1.2
const ARRIVAL_FLASH = 0.16
const EXIT_FLASH = 0.42
// extra star scroll while streaking, px/s at the nearest star layer's depth 1
const STREAK_SCROLL = 12000

function easeOutCubic(t: number): number {
  const c = 1 - Math.min(Math.max(t, 0), 1)
  return 1 - c * c * c
}

// ease-in-back: the ship eases back a touch, then punches out
const PUNCH_WINDUP = 1.1
function easeInPunch(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * ((PUNCH_WINDUP + 1) * c - PUNCH_WINDUP)
}

/** 0 at the start of the warp-in, 1 once the ship has arrived */
export function warpInEase(world: GameWorld): number {
  return easeOutCubic(world.visuals.warpIn / WARP_IN_SECONDS)
}

export function exitEase(world: GameWorld): number {
  return easeInPunch(world.visuals.exit / EXIT_SECONDS)
}

/** star streak from the bookends, 0..~1.2 */
export function flourishStreak(world: GameWorld): number {
  const warp = (1 - warpInEase(world)) * WARP_IN_STREAK
  const exit = world.visuals.exiting ? Math.min(world.visuals.exit / EXIT_SECONDS, 1) * EXIT_STREAK : 0
  return Math.max(warp, exit)
}

/** horizontal offset of the ship sprite from its usual screen spot, px */
export function flourishShipOffset(world: GameWorld, shipScreenX: number, width: number): number {
  const arriving = -(1 - warpInEase(world)) * (shipScreenX + 90)
  const leaving = world.visuals.exiting ? exitEase(world) * (width - shipScreenX + 120) : 0
  return arriving + leaving
}

// Advances both timers and fires their one-off beats. Real time: the
// flourishes should never stretch under slow-mo.
export function stepFlourish(
  world: GameWorld,
  shipWorldX: number,
  lateral: number,
  realDt: number,
): number {
  const v = world.visuals
  if (v.warpIn === 0) audioEngine.playSfx('warpIn')
  v.warpIn += realDt
  if (!v.warpArrived && v.warpIn >= WARP_IN_SECONDS * 0.8) {
    v.warpArrived = true
    triggerFlash(world.feedback, ARRIVAL_FLASH, '190,225,255')
    const scale = Math.max(world.viewScale, 0.02)
    world.particles.burst(shipWorldX, lateral, 16, 260 / scale, 0.45, 2.4, PC.thruster)
  }
  if (v.exiting) {
    if (v.exit === 0) {
      audioEngine.playSfx('warpOut')
      triggerFlash(world.feedback, EXIT_FLASH, '235,245,255')
      addTrauma(world.feedback, 0.2)
    }
    v.exit += realDt
  }
  return flourishStreak(world) * STREAK_SCROLL * realDt
}
