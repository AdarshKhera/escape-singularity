import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import type { TutorialAction } from './gameStoreAdapters'

type GameSnapshot = ReturnType<typeof useGameStore.getState>

function performed(action: TutorialAction, state: GameSnapshot, previous: GameSnapshot): boolean {
  switch (action) {
    case 'steer':
      return state.bankInput !== 0
    case 'thrust':
      return state.throttleInput === 1
    case 'brake':
      return state.throttleInput === -1
    case 'boost':
      return state.boostRequestId !== previous.boostRequestId
    case 'fire':
      return state.fireRequestId !== previous.fireRequestId
  }
}

/** Calls onDone once the player performs `action` while `active`. */
export function useActionDetector(action: TutorialAction | null, active: boolean, onDone: () => void): void {
  useEffect(() => {
    if (!action || !active) return
    let fired = false
    return useGameStore.subscribe((state, previous) => {
      if (fired || !performed(action, state, previous)) return
      fired = true
      onDone()
    })
  }, [action, active, onDone])
}
