import { PixelHeart } from '../PixelHeart'
import { Button, Overlay, StarRow } from '../primitives'
import { formatDuration, formatScore } from '../levelFormat'
import type { LevelResultView, RunStatsView } from '../gameStoreAdapters'

const MAX_LIVES = 3

interface LifeLostProps {
  cause: 'collision' | 'blackhole'
  lives: number
  onRelaunch: () => void
}

export function LifeLostScreen({ cause, lives, onRelaunch }: LifeLostProps) {
  return (
    <Overlay label="Ship lost" width={360}>
      <div className="es-overlay__title es-overlay__title--warm">
        {cause === 'blackhole' ? 'SWALLOWED' : 'SHIP DESTROYED'}
      </div>
      <div className="es-hearts" aria-label={`${lives} lives left`}>
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <PixelHeart key={i} filled={i < lives} size={16} />
        ))}
      </div>
      <Button variant="primary" block autoFocus onClick={onRelaunch}>
        Relaunch
      </Button>
    </Overlay>
  )
}

interface LevelCompleteProps {
  levelLabel: string
  result: LevelResultView
  stats: RunStatsView | null
  nextLabel: string | null
  onNext: () => void
  onRetry: () => void
  onMenu: () => void
}

export function LevelCompleteScreen({ levelLabel, result, stats, nextLabel, onNext, onRetry, onMenu }: LevelCompleteProps) {
  return (
    <Overlay label="Level complete" width={460}>
      <span className="es-label">{levelLabel}</span>
      <div className="es-overlay__title es-overlay__title--win">ESCAPED</div>
      <div className="es-result__stars">
        <StarRow stars={result.stars} size={40} animated />
      </div>
      {result.score !== null && <div className="es-result__score">{formatScore(result.score)}</div>}
      {stats && <StatsRow stats={stats} />}
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

interface GameOverProps {
  levelLabel: string
  onRetry: () => void
  onMenu: () => void
}

export function GameOverScreen({ levelLabel, onRetry, onMenu }: GameOverProps) {
  return (
    <Overlay label="Game over" width={380}>
      <div className="es-overlay__title es-overlay__title--danger">GAME OVER</div>
      <span className="es-label">Out of ships on {levelLabel}</span>
      <div className="es-actions">
        <Button onClick={onMenu}>Menu</Button>
        <Button variant="primary" autoFocus onClick={onRetry}>
          Retry level
        </Button>
      </div>
    </Overlay>
  )
}

interface QuitConfirmProps {
  onResume: () => void
  onQuit: () => void
}

export function QuitConfirm({ onResume, onQuit }: QuitConfirmProps) {
  return (
    <Overlay label="Quit run" width={360}>
      <div className="es-overlay__title">QUIT RUN?</div>
      <span className="es-label">Progress on this level will be lost</span>
      <div className="es-actions">
        <Button variant="danger" onClick={onQuit}>
          Quit
        </Button>
        <Button variant="primary" autoFocus onClick={onResume}>
          Resume
        </Button>
      </div>
    </Overlay>
  )
}
