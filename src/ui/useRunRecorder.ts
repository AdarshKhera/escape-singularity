import { useEffect } from 'react'
import { MAX_LEVEL } from '../levels/levels'
import { useGameStore } from '../state/gameStore'
import { useProgressStore } from '../state/progressStore'
import { useRecordsStore, type LifetimeCounters } from '../state/recordsStore'
import { computeAchievements, earnedIds } from '../state/achievements'
import { totalStars } from '../state/starTotals'
import { useCelebrationStore } from './celebrationStore'
import { shipsUnlockedBetween } from './shipAdapter'
import {
  rawLevelResult,
  readLevelResultNow,
  readLivesLostNow,
  readRunStats,
  withStarFallback,
  type RunStatsView,
} from './gameStoreAdapters'

// Watches the game store and turns what happens in a run into saved
// progress: best stars and score, lifetime counters, deaths, and what a clear
// newly earned (ships, achievements) for the level-complete screen.

type GameSnapshot = ReturnType<typeof useGameStore.getState>
type Status = GameSnapshot['status']

interface MetaSnapshot {
  stars: number
  earned: readonly string[]
}

function metaSnapshot(): MetaSnapshot {
  const { best } = useProgressStore.getState()
  const records = useRecordsStore.getState()
  return {
    stars: totalStars(best),
    earned: earnedIds(computeAchievements({ best, records, maxLevel: MAX_LEVEL })),
  }
}

const STAT_TO_COUNTER: readonly [keyof RunStatsView, keyof LifetimeCounters][] = [
  ['asteroidsDestroyed', 'asteroidsDestroyed'],
  ['pickupsCollected', 'pickupsCollected'],
  ['nearMisses', 'nearMisses'],
  ['slingshots', 'slingshots'],
]

/** Positive per-counter increases between two runStats readings; resets count as zero. */
export function counterGains(before: RunStatsView | null, after: RunStatsView | null): Partial<LifetimeCounters> {
  if (!before || !after) return {}
  return STAT_TO_COUNTER.reduce<Partial<LifetimeCounters>>((acc, [stat, counter]) => {
    const a = before[stat]
    const b = after[stat]
    if (a === null || b === null || b <= a) return acc
    return { ...acc, [counter]: b - a }
  }, {})
}

const isDeath = (status: Status) => status === 'life-lost' || status === 'game-over'

function recordClear(entry: MetaSnapshot, firstReading: boolean): void {
  const { level, lives, runStats } = useGameStore.getState()
  const result = withStarFallback(readLevelResultNow(), lives)
  useProgressStore.getState().recordLevelComplete(level, result.stars, result.score ?? 0)
  if (firstReading) {
    useRecordsStore.getState().recordClear({
      level,
      livesLost: result.livesLost ?? readLivesLostNow(),
      timeMs: result.timeMs ?? runStats.timeMs,
    })
  }
  const after = metaSnapshot()
  useCelebrationStore.getState().setCelebration({
    level,
    newShipIds: shipsUnlockedBetween(entry.stars, after.stars).map((s) => s.id),
    newAchievementIds: after.earned.filter((id) => !entry.earned.includes(id)),
  })
}

export function useRunRecorder(): void {
  useEffect(() => {
    let entry: MetaSnapshot | null = null

    return useGameStore.subscribe((state, previous) => {
      if (state.runStats !== previous.runStats) {
        const gains = counterGains(readRunStats(previous), readRunStats(state))
        if (Object.keys(gains).length > 0) useRecordsStore.getState().addCounters(gains)
      }

      if (isDeath(state.status) && !isDeath(previous.status)) {
        useRecordsStore.getState().addCounters({ shipsLost: 1 })
      }

      if (state.status === 'level-complete') {
        const entered = previous.status !== 'level-complete'
        if (entered) entry = metaSnapshot()
        // the result may land a frame late; recording is a max-merge, so a
        // second reading only upgrades what was saved
        if (entry && (entered || rawLevelResult(state) !== rawLevelResult(previous))) recordClear(entry, entered)
      } else if (previous.status === 'level-complete') {
        entry = null
        useCelebrationStore.getState().setCelebration(null)
      }
    })
  }, [])
}
