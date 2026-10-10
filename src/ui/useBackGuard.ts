import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

/**
 * During a run, the Android back gesture (or browser back) pauses the game
 * instead of leaving the page. A same-URL history entry absorbs the press and
 * is re-armed after each use.
 */
export function useBackGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const arm = () => {
      try {
        if (isGuardEntry()) return
        window.history.pushState({ esGuard: true }, '')
      } catch {
        // history unavailable (sandboxed frame): back simply works normally
      }
    }
    arm()
    const onPopState = () => {
      const store = useGameStore.getState()
      if (store.status === 'playing' && !store.paused) store.togglePause()
      arm()
    }
    window.addEventListener('popstate', onPopState)
    // the guard entry is left in place on exit: popping it programmatically
    // would race the next mount (StrictMode, quick relaunch) and pause it
    return () => window.removeEventListener('popstate', onPopState)
  }, [active])
}

function isGuardEntry(): boolean {
  const state = window.history.state as { esGuard?: unknown } | null
  return state?.esGuard === true
}
