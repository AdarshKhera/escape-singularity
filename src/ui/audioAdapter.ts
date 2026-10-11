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

export type UiSound = 'tap' | 'back' | 'toggle' | 'unlock' | 'star' | 'denied'

interface UiSoundEngine {
  playUi: (kind: UiSound) => void
}

function hasPlayUi(engine: object): engine is UiSoundEngine {
  return typeof (engine as Partial<UiSoundEngine>).playUi === 'function'
}

// Until the engine ships dedicated UI voices, the meaningful moments borrow
// the closest game effect; plain taps stay silent rather than sound wrong.
const SFX_STAND_INS: Partial<Record<UiSound, Parameters<typeof audioEngine.playSfx>[0]>> = {
  denied: 'dryFire',
  star: 'pickup',
  unlock: 'slingshot',
}

/** Wakes the audio context from a menu tap without starting music. */
export function unlockAudio(): void {
  try {
    audioEngine.start()
  } catch {
    // no Web Audio support
  }
}

export function playUiSound(kind: UiSound): void {
  try {
    if (hasPlayUi(audioEngine)) {
      audioEngine.playUi(kind)
      return
    }
    const standIn = SFX_STAND_INS[kind]
    if (standIn) audioEngine.playSfx(standIn, 0.6)
  } catch {
    // UI sound is decoration; never let it break a tap
  }
}
