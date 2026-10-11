import { create } from 'zustand'

// What the last level clear earned beyond stars: ships and achievements that
// became available because of it. Filled by the run recorder, read by the
// level-complete screen, cleared when the next attempt starts.

export interface Celebration {
  level: number
  newShipIds: readonly string[]
  newAchievementIds: readonly string[]
}

interface CelebrationState {
  celebration: Celebration | null
  setCelebration: (celebration: Celebration | null) => void
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  celebration: null,
  setCelebration: (celebration) => set({ celebration }),
}))

export function hasRewards(celebration: Celebration | null): boolean {
  return celebration !== null && (celebration.newShipIds.length > 0 || celebration.newAchievementIds.length > 0)
}
