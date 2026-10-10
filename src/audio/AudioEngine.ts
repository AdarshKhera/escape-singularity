import { TRACKS, type TrackDefinition } from './tracks'
import { createNoiseBuffer, playSfxVoice, type SfxKind } from './sfx'

export type { SfxKind } from './sfx'

const MASTER_LEVEL = 0.9
const MUSIC_LEVEL = 0.5
const SFX_LEVEL = 0.7
// the same effect can't retrigger faster than this (rocket spam, debris storms)
const SFX_MIN_INTERVAL_MS = 45
const PREFS_KEY = 'escape-singularity:audio:v1'

interface AudioPrefs {
  muted: boolean
  musicMuted: boolean
  sfxMuted: boolean
}

function loadPrefs(): AudioPrefs {
  const fallback = { muted: false, musicMuted: false, sfxMuted: false }
  try {
    const raw = globalThis.localStorage?.getItem(PREFS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>
    return {
      muted: parsed.muted === true,
      musicMuted: parsed.musicMuted === true,
      sfxMuted: parsed.sfxMuted === true,
    }
  } catch {
    return fallback
  }
}

function savePrefs(prefs: AudioPrefs) {
  try {
    globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // storage unavailable: preferences just don't persist
  }
}

type AudioContextCtor = typeof AudioContext

function resolveAudioContext(): AudioContextCtor | null {
  const w = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextCtor }
  return w.AudioContext ?? w.webkitAudioContext ?? null
}

// Everything here is synthesised at runtime with the Web Audio API — there are
// no audio files in this project, licensed or otherwise.
export class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private lastSfxAt: Partial<Record<SfxKind, number>> = {}

  private rumbleSource: AudioBufferSourceNode | null = null
  private rumbleGain: GainNode | null = null
  private rumbleFilter: BiquadFilterNode | null = null

  private voices: { osc: OscillatorNode; gain: GainNode }[] = []
  private chordTimer: number | null = null
  private tickTimer: number | null = null
  private currentTrack: TrackDefinition | null = null
  private muted: boolean
  private musicMuted: boolean
  private sfxMuted: boolean

  constructor() {
    const prefs = loadPrefs()
    this.muted = prefs.muted
    this.musicMuted = prefs.musicMuted
    this.sfxMuted = prefs.sfxMuted
  }

  get ready(): boolean {
    return this.context !== null
  }

  /** master mute (everything). An arrow property so it can be passed as a callback. */
  isMuted = (): boolean => this.muted
  isMusicMuted = (): boolean => this.musicMuted
  isSfxMuted = (): boolean => this.sfxMuted

  get trackId(): string | null {
    return this.currentTrack?.id ?? null
  }

  // Must be called from a user gesture — browsers block audio otherwise.
  // Audio is optional: if the platform refuses a context, the game runs silent.
  start() {
    if (this.context) {
      void this.context.resume().catch(() => undefined)
      return
    }
    const Ctor = resolveAudioContext()
    if (!Ctor) return
    let context: AudioContext
    try {
      context = new Ctor()
    } catch {
      return
    }
    this.context = context

    this.masterGain = context.createGain()
    this.masterGain.gain.value = this.muted ? 0 : MASTER_LEVEL
    this.masterGain.connect(context.destination)

    this.musicGain = context.createGain()
    this.musicGain.gain.value = this.musicMuted ? 0 : MUSIC_LEVEL
    this.musicGain.connect(this.masterGain)

    this.sfxGain = context.createGain()
    this.sfxGain.gain.value = this.sfxMuted ? 0 : SFX_LEVEL
    this.sfxGain.connect(this.masterGain)
    this.noise = createNoiseBuffer(context)

    this.setupRumble(context)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
  }

  // phones: stop the synth when the app is backgrounded, pick it up on return
  private onVisibilityChange = () => {
    if (!this.context) return
    const action = document.hidden ? this.context.suspend() : this.context.resume()
    void action.catch(() => undefined)
  }

  /** one-shot effect; intensity ~0.2..1.5 scales the louder voices */
  playSfx(kind: SfxKind, intensity = 1) {
    if (!this.context || !this.sfxGain || !this.noise) return
    if (this.muted || this.sfxMuted) return
    const now = performance.now()
    const last = this.lastSfxAt[kind] ?? 0
    if (now - last < SFX_MIN_INTERVAL_MS) return
    this.lastSfxAt[kind] = now
    try {
      playSfxVoice({ ctx: this.context, out: this.sfxGain, noise: this.noise }, kind, intensity)
    } catch {
      // a voice failing to schedule must never take the game loop down
    }
  }

  private setupRumble(context: AudioContext) {
    const length = context.sampleRate * 2
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 90
    filter.Q.value = 6

    const gain = context.createGain()
    gain.gain.value = 0

    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain as GainNode)
    source.start()

    this.rumbleSource = source
    this.rumbleFilter = filter
    this.rumbleGain = gain
  }

  // intensity 0..1 — hull vibration as the hole closes in
  setRumble(intensity: number) {
    if (!this.context || !this.rumbleGain || !this.rumbleFilter) return
    const clamped = Math.min(Math.max(intensity, 0), 1)
    const now = this.context.currentTime
    this.rumbleGain.gain.setTargetAtTime(clamped * 0.55, now, 0.12)
    this.rumbleFilter.frequency.setTargetAtTime(70 + clamped * 150, now, 0.2)
  }

  playTrack(id: string) {
    const track = TRACKS.find((t) => t.id === id)
    if (!track || !this.context) return
    this.stopTrack()
    this.currentTrack = track
    this.scheduleChords(track)
    this.scheduleTicks(track)
  }

  private scheduleChords(track: TrackDefinition) {
    const context = this.context
    if (!context || !this.musicGain) return

    let index = 0
    const playChord = () => {
      this.releaseVoices()
      const frequencies = track.progression[index % track.progression.length]
      index++

      for (const frequency of frequencies) {
        const osc = context.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = frequency

        const gain = context.createGain()
        gain.gain.value = 0
        gain.gain.setTargetAtTime(0.09, context.currentTime, 1.4)

        osc.connect(gain)
        gain.connect(this.musicGain as GainNode)
        osc.start()
        this.voices.push({ osc, gain })
      }
    }

    playChord()
    this.chordTimer = window.setInterval(playChord, track.tempoDriftSeconds * 1000)
  }

  private scheduleTicks(track: TrackDefinition) {
    const context = this.context
    if (!context || !this.musicGain) return

    const tick = () => {
      const osc = context.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 1850

      const gain = context.createGain()
      gain.gain.setValueAtTime(0.05, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06)

      osc.connect(gain)
      gain.connect(this.musicGain as GainNode)
      osc.start()
      osc.stop(context.currentTime + 0.08)
    }

    this.tickTimer = window.setInterval(tick, track.tickIntervalSeconds * 1000)
  }

  private releaseVoices() {
    const context = this.context
    if (!context) return
    for (const { osc, gain } of this.voices) {
      gain.gain.setTargetAtTime(0, context.currentTime, 0.8)
      osc.stop(context.currentTime + 3)
    }
    this.voices = []
  }

  stopTrack() {
    if (this.chordTimer !== null) window.clearInterval(this.chordTimer)
    if (this.tickTimer !== null) window.clearInterval(this.tickTimer)
    this.chordTimer = null
    this.tickTimer = null
    this.releaseVoices()
    this.currentTrack = null
  }

  private persist() {
    savePrefs({ muted: this.muted, musicMuted: this.musicMuted, sfxMuted: this.sfxMuted })
  }

  private fadeTo(gain: GainNode | null, value: number) {
    if (!this.context || !gain) return
    gain.gain.setTargetAtTime(value, this.context.currentTime, 0.1)
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  /** master mute: silences music, effects and rumble together */
  setMuted(muted: boolean) {
    this.muted = muted
    this.fadeTo(this.masterGain, muted ? 0 : MASTER_LEVEL)
    this.persist()
  }

  /** music only; effects keep playing */
  setMusicMuted(muted: boolean) {
    this.musicMuted = muted
    this.fadeTo(this.musicGain, muted ? 0 : MUSIC_LEVEL)
    this.persist()
  }

  /** sound effects only; music keeps playing */
  setSfxMuted(muted: boolean) {
    this.sfxMuted = muted
    this.fadeTo(this.sfxGain, muted ? 0 : SFX_LEVEL)
    this.persist()
  }

  dispose() {
    this.stopTrack()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    try {
      this.rumbleSource?.stop()
    } catch {
      // already stopped
    }
    void this.context?.close().catch(() => undefined)
    this.context = null
  }
}

export const audioEngine = new AudioEngine()

// Dev-only: without this, a hot-reload of this module orphans the previous
// instance's setInterval-driven chords/ticks — they keep running forever with
// no way to reach them, since audioEngine now points at a new instance.
if (import.meta.hot) {
  import.meta.hot.dispose(() => audioEngine.dispose())
}
