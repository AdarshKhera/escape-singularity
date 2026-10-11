import { PixelHeart } from '../PixelHeart'
import { Button, Overlay } from '../primitives'

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

interface GameOverProps {
  levelLabel: string
  onRetry: () => void
  onMenu: () => void
}

export function GameOverScreen({ levelLabel, onRetry, onMenu }: GameOverProps) {
  return (
    <Overlay label="Game over" width={420}>
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
