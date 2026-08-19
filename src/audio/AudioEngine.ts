import { TRACKS, type TrackDefinition } from './tracks'

// Everything here is synthesised at runtime with the Web Audio API — there are
// no audio files in this project, licensed or otherwise.
export class AudioEngine {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null

  private rumbleSource: AudioBufferSourceNode | null = null
  private rumbleGain: GainNode | null = null
  private rumbleFilter: BiquadFilterNode | null = null

  private voices: { osc: OscillatorNode; gain: GainNode }[] = []
  private chordTimer: number | null = null
  private tickTimer: number | null = null
  private currentTrack: TrackDefinition | null = null
  private muted = false

  get ready(): boolean {
    return this.context !== null
  }

  get isMuted(): boolean {
    return this.muted
  }

  get trackId(): string | null {
    return this.currentTrack?.id ?? null
  }

  // Must be called from a user gesture — browsers block audio otherwise.
  start() {
    if (this.context) return
    const context = new AudioContext()
    this.context = context

    this.masterGain = context.createGain()
    this.masterGain.gain.value = this.muted ? 0 : 0.9
    this.masterGain.connect(context.destination)

    this.musicGain = context.createGain()
    this.musicGain.gain.value = 0.5
    this.musicGain.connect(this.masterGain)

    this.setupRumble(context)
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

  toggleMute(): boolean {
    this.muted = !this.muted
    if (this.context && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.9,
        this.context.currentTime,
        0.1,
      )
    }
    return this.muted
  }

  dispose() {
    this.stopTrack()
    this.rumbleSource?.stop()
    this.context?.close()
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
