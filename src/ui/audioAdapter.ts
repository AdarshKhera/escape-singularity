import { audioEngine } from '../audio/AudioEngine'
import { TRACKS } from '../audio/tracks'

// The gameplay branch is adding separate music/sfx mute channels to the audio
// engine. This adapter feature-detects them so the UI compiles against today's
// engine (single master mute via toggleMute) and lights up after the merge.

interface AudioCapabilities {
  setMusicMuted?: unknown
  setSfxMuted?: unknown
  setMuted?: unknown
  isMuted?: unknown
}

const caps = audioEngine as unknown as AudioCapabilities

function callIfFunction(fn: unknown, value: boolean): boolean {
  if (typeof fn !== 'function') return false
  ;(fn as (v: boolean) => void).call(audioEngine, value)
  return true
}

function isMasterMuted(): boolean {
  const probe = caps.isMuted
  if (typeof probe === 'function') return Boolean((probe as () => unknown).call(audioEngine))
  return Boolean(probe)
}

function setMasterMuted(muted: boolean): void {
  if (callIfFunction(caps.setMuted, muted)) return
  if (isMasterMuted() !== muted) audioEngine.toggleMute()
}

/** Apply the music/sfx settings to whatever channels the engine supports. */
export function applyAudioSettings(music: boolean, sfx: boolean): void {
  try {
    const hasMusic = callIfFunction(caps.setMusicMuted, !music)
    const hasSfx = callIfFunction(caps.setSfxMuted, !sfx)
    if (hasMusic && hasSfx) {
      callIfFunction(caps.setMuted, false)
      return
    }
    // fallback engine: one master switch, silent only when both are off
    setMasterMuted(!music && !sfx)
  } catch {
    // audio is optional; a failure here must never break the UI
  }
}

/** Must run inside a user gesture: browsers keep audio locked until then. */
export function startAudio(): void {
  try {
    audioEngine.start()
    audioEngine.playTrack(TRACKS[0].id)
  } catch {
    // no Web Audio support: the game still plays silently
  }
}
