import { noiseBurst, tone, type SfxContext } from './sfx'

// Interface sounds: short, soft and pitched in the same world as the game's
// effects (sine and triangle, a touch of filtered air), so menus feel like
// part of the ship's instruments rather than a different app.

/** The menu actions that make a sound. */
export type UiSoundKind = 'tap' | 'back' | 'toggle' | 'unlock' | 'star' | 'denied'

const VOICES: Record<UiSoundKind, (s: SfxContext) => void> = {
  // a light, bright tick: every confirming press
  tap: (s) => {
    tone(s, { type: 'triangle', freq: 1320, endFreq: 1180, peak: 0.07, attack: 0.002, decay: 0.06 })
    noiseBurst(s, { type: 'highpass', freq: 5200, peak: 0.025, attack: 0.001, decay: 0.03 })
  },
  // the same tick falling away: closing, cancelling, going back
  back: (s) => {
    tone(s, { type: 'triangle', freq: 980, endFreq: 640, peak: 0.065, attack: 0.002, decay: 0.09 })
  },
  // a two-step switch click
  toggle: (s) => {
    tone(s, { type: 'sine', freq: 880, peak: 0.06, attack: 0.002, decay: 0.04 })
    tone(s, { type: 'sine', freq: 1175, peak: 0.05, attack: 0.002, decay: 0.05, delay: 0.045 })
  },
  // something new opens up: a rising arpeggio with a shimmer on top
  unlock: (s) => {
    const notes = [523.3, 659.3, 784, 1046.5]
    notes.forEach((freq, i) => {
      tone(s, { type: 'triangle', freq, peak: 0.08, attack: 0.01, decay: 0.42, delay: i * 0.075 })
    })
    noiseBurst(s, { type: 'highpass', freq: 6000, peak: 0.04, attack: 0.08, decay: 0.5, delay: 0.2 })
  },
  // one star awarded: a glassy chime (call once per star, staggered)
  star: (s) => {
    tone(s, { type: 'sine', freq: 1568, peak: 0.08, attack: 0.003, decay: 0.5 })
    tone(s, { type: 'sine', freq: 2349, peak: 0.035, attack: 0.003, decay: 0.35 })
  },
  // not allowed: a low, short double buzz, never harsh
  denied: (s) => {
    tone(s, { type: 'square', freq: 196, peak: 0.035, attack: 0.003, decay: 0.07 })
    tone(s, { type: 'square', freq: 165, peak: 0.035, attack: 0.003, decay: 0.09, delay: 0.09 })
  },
}

export function playUiVoice(s: SfxContext, kind: UiSoundKind): void {
  VOICES[kind](s)
}
