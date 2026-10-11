import type { LevelBest } from './progressStore'

/** Sum of best stars across every level, the currency ships unlock with. */
export function totalStars(best: Readonly<Record<string, LevelBest>>): number {
  return Object.values(best).reduce((sum, b) => sum + b.stars, 0)
}
