// One-shot sound effects, synthesised with Web Audio (no audio files).
// Each voice builds a tiny node graph, schedules its envelope and stops
// itself; nothing is kept alive between calls.

export type SfxKind =
  | 'fire'
  | 'explosion'
  | 'bigExplosion'
  | 'pickup'
  | 'boost'
  | 'hit'
  | 'shieldBreak'
  | 'nearMiss'
  | 'escape'
  | 'slingshot'
  | 'warning'
  | 'dryFire'

export interface SfxContext {
  ctx: AudioContext
  out: AudioNode
  noise: AudioBuffer
}

export function createNoiseBuffer(ctx: AudioContext, seconds = 1): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

function envelope(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function noiseBurst(
  s: SfxContext,
  opts: { type: BiquadFilterType; freq: number; endFreq?: number; q?: number; peak: number; attack: number; decay: number; delay?: number },
) {
  const t = s.ctx.currentTime + (opts.delay ?? 0)
  const src = s.ctx.createBufferSource()
  src.buffer = s.noise
  src.playbackRate.value = 0.8 + Math.random() * 0.4
  const filter = s.ctx.createBiquadFilter()
  filter.type = opts.type
  filter.frequency.setValueAtTime(opts.freq, t)
  if (opts.endFreq) filter.frequency.exponentialRampToValueAtTime(opts.endFreq, t + opts.attack + opts.decay)
  filter.Q.value = opts.q ?? 0.8
  const gain = s.ctx.createGain()
  envelope(gain, t, opts.peak, opts.attack, opts.decay)
  src.connect(filter).connect(gain).connect(s.out)
  src.start(t, Math.random() * 0.5)
  src.stop(t + opts.attack + opts.decay + 0.05)
}

function tone(
  s: SfxContext,
  opts: { type: OscillatorType; freq: number; endFreq?: number; peak: number; attack: number; decay: number; delay?: number },
) {
  const t = s.ctx.currentTime + (opts.delay ?? 0)
  const osc = s.ctx.createOscillator()
  osc.type = opts.type
  osc.frequency.setValueAtTime(opts.freq, t)
  if (opts.endFreq) osc.frequency.exponentialRampToValueAtTime(opts.endFreq, t + opts.attack + opts.decay)
  const gain = s.ctx.createGain()
  envelope(gain, t, opts.peak, opts.attack, opts.decay)
  osc.connect(gain).connect(s.out)
  osc.start(t)
  osc.stop(t + opts.attack + opts.decay + 0.05)
}

const VOICES: Record<SfxKind, (s: SfxContext, intensity: number) => void> = {
  fire: (s) => {
    noiseBurst(s, { type: 'bandpass', freq: 2400, endFreq: 500, q: 1.2, peak: 0.35, attack: 0.005, decay: 0.22 })
    tone(s, { type: 'square', freq: 520, endFreq: 140, peak: 0.07, attack: 0.004, decay: 0.12 })
  },
  dryFire: (s) => {
    tone(s, { type: 'square', freq: 180, endFreq: 120, peak: 0.05, attack: 0.002, decay: 0.05 })
  },
  explosion: (s, k) => {
    noiseBurst(s, { type: 'lowpass', freq: 1800, endFreq: 120, peak: 0.55 * k, attack: 0.004, decay: 0.45 })
    tone(s, { type: 'sine', freq: 110, endFreq: 38, peak: 0.45 * k, attack: 0.005, decay: 0.35 })
  },
  bigExplosion: (s, k) => {
    noiseBurst(s, { type: 'lowpass', freq: 1400, endFreq: 70, peak: 0.7 * k, attack: 0.006, decay: 0.9 })
    tone(s, { type: 'sine', freq: 90, endFreq: 28, peak: 0.6 * k, attack: 0.006, decay: 0.7 })
    noiseBurst(s, { type: 'highpass', freq: 3000, peak: 0.12 * k, attack: 0.002, decay: 0.15 })
  },
  pickup: (s) => {
    tone(s, { type: 'triangle', freq: 660, peak: 0.16, attack: 0.005, decay: 0.12 })
    tone(s, { type: 'triangle', freq: 990, peak: 0.16, attack: 0.005, decay: 0.18, delay: 0.07 })
    tone(s, { type: 'sine', freq: 1320, peak: 0.08, attack: 0.005, decay: 0.25, delay: 0.13 })
  },
  boost: (s) => {
    tone(s, { type: 'sawtooth', freq: 120, endFreq: 520, peak: 0.1, attack: 0.03, decay: 0.45 })
    noiseBurst(s, { type: 'bandpass', freq: 600, endFreq: 3200, q: 2, peak: 0.25, attack: 0.05, decay: 0.5 })
  },
  slingshot: (s) => {
    tone(s, { type: 'sine', freq: 300, endFreq: 900, peak: 0.14, attack: 0.04, decay: 0.5 })
    tone(s, { type: 'triangle', freq: 450, endFreq: 1350, peak: 0.08, attack: 0.06, decay: 0.5 })
  },
  hit: (s) => {
    noiseBurst(s, { type: 'lowpass', freq: 900, endFreq: 100, peak: 0.6, attack: 0.002, decay: 0.3 })
    tone(s, { type: 'square', freq: 90, endFreq: 40, peak: 0.25, attack: 0.002, decay: 0.25 })
    noiseBurst(s, { type: 'highpass', freq: 2500, peak: 0.2, attack: 0.001, decay: 0.06 })
  },
  shieldBreak: (s) => {
    tone(s, { type: 'triangle', freq: 1600, endFreq: 300, peak: 0.16, attack: 0.002, decay: 0.35 })
    noiseBurst(s, { type: 'highpass', freq: 4000, peak: 0.22, attack: 0.002, decay: 0.3 })
  },
  nearMiss: (s) => {
    noiseBurst(s, { type: 'bandpass', freq: 900, endFreq: 3500, q: 3, peak: 0.22, attack: 0.04, decay: 0.18 })
  },
  escape: (s) => {
    // a major chord swelling under a shimmer: relief, not triumph fanfare
    for (const [freq, delay] of [[261.6, 0], [329.6, 0.06], [392, 0.12], [523.3, 0.2]] as const) {
      tone(s, { type: 'triangle', freq, peak: 0.1, attack: 0.25, decay: 1.6, delay })
    }
    noiseBurst(s, { type: 'highpass', freq: 5000, peak: 0.08, attack: 0.3, decay: 1.2 })
  },
  warning: (s) => {
    tone(s, { type: 'square', freq: 880, peak: 0.06, attack: 0.005, decay: 0.12 })
    tone(s, { type: 'square', freq: 660, peak: 0.06, attack: 0.005, decay: 0.12, delay: 0.16 })
  },
}

export function playSfxVoice(s: SfxContext, kind: SfxKind, intensity: number): void {
  VOICES[kind](s, Math.min(Math.max(intensity, 0.2), 1.5))
}
