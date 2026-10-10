import { audioEngine } from '../audio/AudioEngine'
import { TRACKS } from '../audio/tracks'

// Music and sfx are separate channels on the engine; settings map onto them
// directly. Audio is optional, so failures never reach the UI.

/** Apply the music/sfx settings to the engine's separate channels. */
export function applyAudioSettings(music: boolean, sfx: boolean): void {
  try {
    // settings own muting now; clear any master mute persisted by older builds
    if (audioEngine.isMuted()) audioEngine.setMuted(false)
    audioEngine.setMusicMuted(!music)
    audioEngine.setSfxMuted(!sfx)
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
