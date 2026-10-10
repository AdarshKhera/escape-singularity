import { useGameStore } from '../state/gameStore'

/** Idempotent pause control on top of the store's togglePause. */
export function setPaused(paused: boolean): void {
  const store = useGameStore.getState()
  if (store.paused !== paused) store.togglePause()
}

/** Fresh attempt at a level: full lives, clean loadout. */
export function restartLevel(level: number): void {
  const store = useGameStore.getState()
  store.resetRun()
  store.setLevel(level)
}
