// Audio mute preferences, persisted locally. Storage can be unavailable
// (private mode, blocked site data): then preferences simply don't persist.

const PREFS_KEY = 'escape-singularity:audio:v1'

export interface AudioPrefs {
  muted: boolean
  musicMuted: boolean
  sfxMuted: boolean
}

export function loadPrefs(): AudioPrefs {
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

export function savePrefs(prefs: AudioPrefs) {
  try {
    globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // storage unavailable: preferences just don't persist
  }
}

