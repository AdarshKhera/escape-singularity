import { create } from 'zustand'

// Signals a fresh level start (new level, retry, restart) to the intro card.
// Respawns after a lost ship do not count: the player already saw it.

interface LevelIntroState {
  introId: number
  visible: boolean
  announce: () => void
  dismiss: (id: number) => void
}

export const useLevelIntroStore = create<LevelIntroState>((set) => ({
  introId: 0,
  visible: false,
  announce: () => set((s) => ({ introId: s.introId + 1, visible: true })),
  dismiss: (id) => set((s) => (s.introId === id ? { visible: false } : s)),
}))
