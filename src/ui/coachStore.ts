import { create } from 'zustand'
import type { TutorialAction } from './gameStoreAdapters'

// Which on-screen control the current coach mark points at, so the touch
// controls can pulse it. Null when no tip is showing.

interface CoachState {
  highlight: TutorialAction | null
  setHighlight: (action: TutorialAction | null) => void
}

export const useCoachStore = create<CoachState>((set) => ({
  highlight: null,
  setHighlight: (highlight) => set({ highlight }),
}))
