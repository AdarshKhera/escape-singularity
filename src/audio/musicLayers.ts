import { noiseBurst, tone, type SfxContext } from './sfx'

// The music that reacts to play. Two pieces:
//  - the tension drone: detuned saws and a sub under a lowpass, silent in
//    cruise, swelling, opening up and beating harder as the hole's pull
//    grows, so the danger is heard before it is understood;
//  - short stingers for the big moments (level complete, a life lost, game
//    over), played on the music bus so the music toggle silences them too.

export interface TensionDrone {
  oscillators: OscillatorNode[]
  filter: BiquadFilterNode
  gain: GainNode
}

// A over the tracks' low register, so it sits under any of them
const DRONE_ROOT = 55
const DRONE_PEAK_GAIN = 0.2
// cents of detune at full tension: a slow beat becomes a queasy wobble
const DRONE_MAX_DETUNE = 32

export function createTensionDrone(ctx: AudioContext, out: AudioNode): TensionDrone {
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 120
  filter.Q.value = 3
  const gain = ctx.createGain()
  gain.gain.value = 0
  filter.connect(gain).connect(out)

  const voices: [OscillatorType, number][] = [
    ['sawtooth', DRONE_ROOT],
    ['sawtooth', DRONE_ROOT],
    ['sine', DRONE_ROOT / 2],
    ['triangle', DRONE_ROOT * 1.5],
  ]
  const oscillators = voices.map(([type, freq]) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    osc.connect(filter)
    osc.start()
    return osc
  })
  return { oscillators, filter, gain }
}

/** tension 0..1: 0 is silence, 1 is the hole at its strongest */
export function setDroneTension(ctx: AudioContext, drone: TensionDrone, tension: number): void {
  const t = Math.min(Math.max(tension, 0), 1)
  const now = ctx.currentTime
  const shaped = t * t
  drone.gain.gain.setTargetAtTime(shaped * DRONE_PEAK_GAIN, now, 0.4)
  drone.filter.frequency.setTargetAtTime(110 + shaped * 900, now, 0.5)
  const detune = t * DRONE_MAX_DETUNE
  drone.oscillators[0].detune.setTargetAtTime(-detune, now, 0.6)
  drone.oscillators[1].detune.setTargetAtTime(detune, now, 0.6)
  // the fifth sags flat as the pull bites
  drone.oscillators[3].detune.setTargetAtTime(-t * 45, now, 0.8)
}

export function stopDrone(drone: TensionDrone): void {
  for (const osc of drone.oscillators) {
    try {
      osc.stop()
    } catch {
      // already stopped
    }
  }
}

/** One-shot musical moments. */
export type JingleKind = 'complete' | 'lifeLost' | 'gameOver'

const JINGLES: Record<JingleKind, (s: SfxContext) => void> = {
  // bright, open and resolved: a rising major figure landing on a held chord
  complete: (s) => {
    const run: [number, number][] = [
      [392, 0],
      [523.3, 0.11],
      [659.3, 0.22],
      [784, 0.33],
    ]
    for (const [freq, delay] of run) {
      tone(s, { type: 'triangle', freq, peak: 0.11, attack: 0.01, decay: 0.32, delay })
    }
    for (const freq of [523.3, 659.3, 784, 1046.5]) {
      tone(s, { type: 'triangle', freq, peak: 0.075, attack: 0.04, decay: 1.8, delay: 0.46 })
    }
    tone(s, { type: 'sine', freq: 130.8, peak: 0.12, attack: 0.05, decay: 1.6, delay: 0.46 })
    noiseBurst(s, { type: 'highpass', freq: 6500, peak: 0.05, attack: 0.3, decay: 1.2, delay: 0.4 })
  },
  // a short falling minor third: a setback, not the end
  lifeLost: (s) => {
    tone(s, { type: 'triangle', freq: 392, peak: 0.08, attack: 0.01, decay: 0.35 })
    tone(s, { type: 'triangle', freq: 329.6, peak: 0.08, attack: 0.01, decay: 0.7, delay: 0.18 })
  },
  // low and final: a descending minor line over a sinking sub
  gameOver: (s) => {
    const line: [number, number][] = [
      [311.1, 0],
      [261.6, 0.28],
      [233.1, 0.56],
      [196, 0.84],
    ]
    for (const [freq, delay] of line) {
      tone(s, { type: 'triangle', freq, peak: 0.09, attack: 0.02, decay: 0.6, delay })
    }
    tone(s, { type: 'sine', freq: 98, endFreq: 49, peak: 0.16, attack: 0.05, decay: 2.2, delay: 0.84 })
    noiseBurst(s, { type: 'lowpass', freq: 400, endFreq: 80, peak: 0.06, attack: 0.2, decay: 1.6, delay: 0.84 })
  },
}

export function playJingleVoice(s: SfxContext, kind: JingleKind): void {
  JINGLES[kind](s)
}
