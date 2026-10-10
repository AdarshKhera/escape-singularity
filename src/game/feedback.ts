// Game-feel state: screen shake, hit-stop, slow motion and screen flashes.
// Everything here runs on REAL time (so a hit-stop can end while the world
// is frozen) and hands back a time scale for the simulation.

export interface Feedback {
  /** 0..1; shake is trauma squared, so small knocks stay subtle */
  trauma: number
  /** real seconds the simulation stays frozen */
  hitStop: number
  /** real seconds of slow motion left, and how long it started at */
  slowMo: number
  slowMoDuration: number
  /** 0..1 full-screen flash */
  flash: number
  flashColor: string
  /** current shake offset in screen px, written by stepFeedback */
  shakeX: number
  shakeY: number
}

export function createFeedback(): Feedback {
  return {
    trauma: 0,
    hitStop: 0,
    slowMo: 0,
    slowMoDuration: 1,
    flash: 0,
    flashColor: '255,255,255',
    shakeX: 0,
    shakeY: 0,
  }
}

const MAX_SHAKE_PX = 16
const TRAUMA_DECAY_PER_SECOND = 1.6
const FLASH_DECAY_PER_SECOND = 3.2
// the slowest the world runs at the start of a slow-mo beat
const SLOW_MO_FLOOR = 0.22

export function addTrauma(fb: Feedback, amount: number): void {
  fb.trauma = Math.min(1, fb.trauma + amount)
}

export function triggerHitStop(fb: Feedback, seconds: number): void {
  fb.hitStop = Math.max(fb.hitStop, seconds)
}

export function triggerSlowMo(fb: Feedback, seconds: number): void {
  fb.slowMo = seconds
  fb.slowMoDuration = seconds
}

export function triggerFlash(fb: Feedback, alpha: number, rgb: string): void {
  if (alpha < fb.flash) return
  fb.flash = Math.min(alpha, 1)
  fb.flashColor = rgb
}

export function resetFeedback(fb: Feedback): void {
  Object.assign(fb, createFeedback())
}

// Advances the effects by real time and returns the simulation time scale:
// 0 during hit-stop, easing from SLOW_MO_FLOOR back to 1 across a slow-mo.
export function stepFeedback(fb: Feedback, realDt: number, time: number): number {
  fb.trauma = Math.max(0, fb.trauma - TRAUMA_DECAY_PER_SECOND * realDt)
  fb.flash = Math.max(0, fb.flash - FLASH_DECAY_PER_SECOND * realDt)

  const shake = fb.trauma * fb.trauma * MAX_SHAKE_PX
  // layered sines read as noise without a noise table
  fb.shakeX = shake * (Math.sin(time * 71) * 0.6 + Math.sin(time * 43.7) * 0.4)
  fb.shakeY = shake * (Math.cos(time * 63.1) * 0.6 + Math.sin(time * 37.3) * 0.4)

  if (fb.hitStop > 0) {
    fb.hitStop -= realDt
    return 0
  }
  if (fb.slowMo > 0) {
    fb.slowMo = Math.max(0, fb.slowMo - realDt)
    const t = 1 - fb.slowMo / fb.slowMoDuration
    return SLOW_MO_FLOOR + (1 - SLOW_MO_FLOOR) * t * t
  }
  return 1
}
