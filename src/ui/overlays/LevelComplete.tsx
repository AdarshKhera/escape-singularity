import { useEffect, useState } from 'react'
import { Button, Overlay, StarRow } from '../primitives'
import { formatDuration, formatScore } from '../levelFormat'
import { playUiSound } from '../audioAdapter'
import { starPopDelayMs, useReducedMotion } from '../motion'
import { useCountUp } from '../useCountUp'
import type { LevelResultView, RunStatsView } from '../gameStoreAdapters'
import { hasRewards, type Celebration } from '../celebrationStore'
import { Rewards } from './Rewards'

interface LevelCompleteProps {
  levelLabel: string
  result: LevelResultView
  stats: RunStatsView | null
  celebration: Celebration | null
  nextLabel: string | null
  onNext: () => void
  onRetry: () => void
  onMenu: () => void
}

const SCORE_DELAY_MS = 900
const UNLOCK_SOUND_DELAY_MS = 1250

export function LevelCompleteScreen(props: LevelCompleteProps) {
  const { levelLabel, result, stats, celebration, nextLabel, onNext, onRetry, onMenu } = props
  const showRewards = hasRewards(celebration)
  useResultSounds(result.stars, celebration !== null && celebration.newShipIds.length > 0)

  return (
    <Overlay label="Level complete" width={showRewards ? 660 : 460}>
      <div className={`es-result${showRewards ? ' es-result--split' : ''}`}>
        <div className="es-result__main">
          <span className="es-label">{levelLabel}</span>
          <div className="es-overlay__title es-overlay__title--win">ESCAPED</div>
          <div className="es-result__stars">
            <StarRow stars={result.stars} size={40} animated />
          </div>
          {result.score !== null && <ScoreLine score={result.score} isNewBest={result.isNewBest} />}
          {stats && <StatsRow stats={stats} />}
        </div>
        {showRewards && celebration && <Rewards celebration={celebration} />}
      </div>
      <span className="es-label">{nextLabel ? `Unlocked: ${nextLabel}` : 'All levels cleared'}</span>
      <div className="es-actions">
        <Button onClick={onMenu}>Menu</Button>
        <Button onClick={onRetry}>Retry</Button>
        {nextLabel && (
          <Button variant="primary" autoFocus onClick={onNext}>
            Next
          </Button>
        )}
      </div>
    </Overlay>
  )
}

/** One chime per earned star as it lands, then the unlock fanfare. */
function useResultSounds(stars: number, unlocked: boolean): void {
  const reduced = useReducedMotion()
  // frozen at mount: later re-renders must not replay the fanfare
  const [plan] = useState(() => ({ stars, unlocked, reduced }))
  useEffect(() => {
    const chimes = plan.reduced ? Math.min(1, plan.stars) : plan.stars
    const timers = Array.from({ length: chimes }, (_, i) =>
      window.setTimeout(() => playUiSound('star'), plan.reduced ? 0 : starPopDelayMs(i) + 120),
    )
    if (plan.unlocked) {
      timers.push(window.setTimeout(() => playUiSound('unlock'), plan.reduced ? 200 : UNLOCK_SOUND_DELAY_MS))
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [plan])
}

function ScoreLine({ score, isNewBest }: { score: number; isNewBest: boolean }) {
  const shown = useCountUp(score, { delayMs: SCORE_DELAY_MS, durationMs: 900 })
  return (
    <div className="es-result__scoreline">
      <span className="es-result__score">{formatScore(shown)}</span>
      {isNewBest && <span className="es-result__best">New best</span>}
    </div>
  )
}

function StatsRow({ stats }: { stats: RunStatsView }) {
  const items = [
    stats.timeMs !== null && { label: 'Time', value: formatDuration(stats.timeMs) },
    stats.asteroidsDestroyed !== null && { label: 'Destroyed', value: String(stats.asteroidsDestroyed) },
    stats.pickupsCollected !== null && { label: 'Pickups', value: String(stats.pickupsCollected) },
  ].filter((item): item is { label: string; value: string } => Boolean(item))

  return (
    <div className="es-stats">
      {items.map((item) => (
        <div key={item.label} className="es-stat">
          <span className="es-stat__value">{item.value}</span>
          <span className="es-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
