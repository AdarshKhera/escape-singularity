import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

// P toggles pause, only while a run is actually in progress. Escape is
// handled separately by the HUD, which pairs it with the quit confirmation.
export function usePauseController() {
  const togglePause = useGameStore((s) => s.togglePause)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'p' && e.key !== 'P') return
      if (useGameStore.getState().status !== 'playing') return
      togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [togglePause])
}
