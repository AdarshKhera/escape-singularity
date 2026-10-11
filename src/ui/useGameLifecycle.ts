import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { useSettingsStore } from '../state/settingsStore'
import { applyAudioSettings } from './audioAdapter'

function pauseIfRunning() {
  const store = useGameStore.getState()
  if (store.status === 'playing' && !store.paused) store.togglePause()
}

/**
 * Pauses a live run when the app goes to the background, the window loses
 * focus, or `hold` is set (portrait on a phone). Nobody comes back to a ship
 * that flew itself into a black hole while they read a notification.
 */
export function useAutoPause(hold: boolean): void {
  useEffect(() => {
    if (hold) pauseIfRunning()
  }, [hold])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) pauseIfRunning()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', pauseIfRunning)
    // a notification shade or alt-tab blurs without hiding the page
    window.addEventListener('blur', pauseIfRunning)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', pauseIfRunning)
      window.removeEventListener('blur', pauseIfRunning)
    }
  }, [])
}

/** Pushes the music/sfx settings into the audio engine now and on change. */
export function useAudioSettingsSync(): void {
  const music = useSettingsStore((s) => s.music)
  const sfx = useSettingsStore((s) => s.sfx)
  useEffect(() => {
    applyAudioSettings(music, sfx)
  }, [music, sfx])
}
