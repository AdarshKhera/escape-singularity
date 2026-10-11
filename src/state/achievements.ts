import type { LevelBest } from './progressStore'
import type { Records } from './recordsStore'
import { totalStars } from './starTotals'

// Ten achievements computed from saved progress and lifetime records. Each
// one reads only data the game really stores, so none can be faked by a
// guess or awarded wrongly.

export interface AchievementInput {
  best: Readonly<Record<string, LevelBest>>
  records: Records
  maxLevel: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  earned: boolean
  /** current value toward the goal, capped at target */
  value: number
  target: number
}

interface AchievementRule {
  id: string
  title: string
  description: (input: AchievementInput) => string
  target: (input: AchievementInput) => number
  value: (input: AchievementInput) => number
}

const clearedCount = (i: AchievementInput) => Object.keys(i.best).length
const threeStarCount = (i: AchievementInput) => Object.values(i.best).filter((b) => b.stars >= 3).length

const RULES: readonly AchievementRule[] = [
  {
    id: 'first-light',
    title: 'First Light',
    description: () => 'Escape your first black hole',
    target: () => 1,
    value: clearedCount,
  },
  {
    id: 'halfway-out',
    title: 'Halfway Out',
    description: (i) => `Clear ${Math.ceil(i.maxLevel / 2)} levels`,
    target: (i) => Math.ceil(i.maxLevel / 2),
    value: clearedCount,
  },
  {
    id: 'event-horizon',
    title: 'Beyond the Horizon',
    description: (i) => `Clear all ${i.maxLevel} levels`,
    target: (i) => i.maxLevel,
    value: clearedCount,
  },
  {
    id: 'untouched',
    title: 'Untouched',
    description: () => 'Clear a level without losing a ship',
    target: () => 1,
    value: (i) => i.records.flawlessLevels.length,
  },
  {
    id: 'iron-nerve',
    title: 'Iron Nerve',
    description: () => 'Clear 5 different levels without losing a ship',
    target: () => 5,
    value: (i) => i.records.flawlessLevels.length,
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: () => 'Earn 3 stars on any level',
    target: () => 1,
    value: threeStarCount,
  },
  {
    id: 'full-hangar',
    title: 'Full Hangar',
    description: () => 'Collect 30 stars to unlock every ship',
    target: () => 30,
    value: (i) => totalStars(i.best),
  },
  {
    id: 'constellation',
    title: 'Constellation',
    description: (i) => `Collect all ${i.maxLevel * 3} stars`,
    target: (i) => i.maxLevel * 3,
    value: (i) => totalStars(i.best),
  },
  {
    id: 'demolition',
    title: 'Demolition',
    description: () => 'Destroy 50 asteroids with rockets',
    target: () => 50,
    value: (i) => i.records.asteroidsDestroyed,
  },
  {
    id: 'scavenger',
    title: 'Scavenger',
    description: () => 'Fly through 100 pickups',
    target: () => 100,
    value: (i) => i.records.pickupsCollected,
  },
]

export function computeAchievements(input: AchievementInput): readonly Achievement[] {
  return RULES.map((rule) => {
    const target = Math.max(1, rule.target(input))
    const value = Math.min(target, Math.max(0, rule.value(input)))
    return {
      id: rule.id,
      title: rule.title,
      description: rule.description(input),
      earned: value >= target,
      value,
      target,
    }
  })
}

export function earnedIds(achievements: readonly Achievement[]): readonly string[] {
  return achievements.filter((a) => a.earned).map((a) => a.id)
}
