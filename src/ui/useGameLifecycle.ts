import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { useProgressStore } from '../state/progressStore'
import { useSettingsStore } from '../state/settingsStore'
import { applyAudioSettings } from './audioAdapter'
import { rawLevelResult, readLevelResultNow, withStarFallback } from './gameStoreAdapters'

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
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', pauseIfRunning)
    }
  }, [])
}

function recordCurrentClear() {
  const { level, lives } = useGameStore.getState()
  const result = withStarFallback(readLevelResultNow(), lives)
  useProgressStore.getState().recordLevelComplete(level, result.stars, result.score ?? 0)
}

/**
 * Unlocks the next level and saves best stars/score whenever a level is
 * cleared. Recording is a max-merge, so a levelResult that lands a frame
 * after the status change simply upgrades the saved record.
 */
export function useProgressRecorder(): void {
  useEffect(() => {
    if (useGameStore.getState().status === 'level-complete') recordCurrentClear()
    return useGameStore.subscribe((state, previous) => {
      if (state.status !== 'level-complete') return
      const entered = previous.status !== 'level-complete'
      const resultChanged = rawLevelResult(state) !== rawLevelResult(previous)
      if (entered || resultChanged) recordCurrentClear()
    })
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
