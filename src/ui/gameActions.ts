import { useGameStore } from '../state/gameStore'
import { useLevelIntroStore } from './levelIntroStore'

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
  useLevelIntroStore.getState().announce()
}

/** On to the next level, keeping lives as the store rules say. */
export function nextLevel(): void {
  useGameStore.getState().advanceLevel()
  useLevelIntroStore.getState().announce()
}
