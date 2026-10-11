import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../../state/gameStore'
import { MAX_LEVEL } from '../../levels/levels'
import { levelName } from '../levelFormat'
import { useLevelResult, useRunStats, withStarFallback } from '../gameStoreAdapters'
import type { InputMode } from '../ControlsGuide'
import { restartLevel, setPaused } from '../gameActions'
import { PauseMenu } from './PauseMenu'
import { GameOverScreen, LifeLostScreen, QuitConfirm } from './EndScreens'
import { LevelCompleteScreen } from './LevelComplete'
import { useCelebrationStore } from '../celebrationStore'
import './overlays.css'

interface GameOverlaysProps {
  inputMode: InputMode
  onQuitToMenu: () => void
}

export function GameOverlays({ inputMode, onQuitToMenu }: GameOverlaysProps) {
  const status = useGameStore((s) => s.status)
  const paused = useGameStore((s) => s.paused)
  const level = useGameStore((s) => s.level)
  const lives = useGameStore((s) => s.lives)
  const deathCause = useGameStore((s) => s.deathCause)
  const respawn = useGameStore((s) => s.respawn)
  const advanceLevel = useGameStore((s) => s.advanceLevel)
  const levelResult = useLevelResult()
  const runStats = useRunStats()
  const celebration = useCelebrationStore((s) => s.celebration)
  const [showQuit, setShowQuit] = useState(false)
  const showQuitRef = useRef(false)
  showQuitRef.current = showQuit

  useEffect(() => {
    if (status !== 'playing' || !paused) setShowQuit(false)
  }, [status, paused])

  // Escape toggles the quit confirmation during a run (desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useGameStore.getState().status !== 'playing') return
      const next = !showQuitRef.current
      setPaused(next)
      setShowQuit(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const levelLabel = `Level ${level} · ${levelName(level)}`
  const quit = () => {
    setShowQuit(false)
    useGameStore.getState().resetRun()
    onQuitToMenu()
  }

  if (status === 'playing' && paused) {
    if (showQuit) return <QuitConfirm onResume={() => setPaused(false)} onQuit={quit} />
    return (
      <PauseMenu
        levelLabel={levelLabel}
        inputMode={inputMode}
        onResume={() => setPaused(false)}
        onRestart={() => restartLevel(level)}
        onQuit={() => setShowQuit(true)}
      />
    )
  }

  if (status === 'life-lost') {
    return <LifeLostScreen cause={deathCause} lives={lives} onRelaunch={respawn} />
  }

  if (status === 'level-complete') {
    const hasNext = level < MAX_LEVEL
    return (
      <LevelCompleteScreen
        levelLabel={levelLabel}
        result={withStarFallback(levelResult, lives)}
        stats={runStats}
        celebration={celebration?.level === level ? celebration : null}
        nextLabel={hasNext ? `Level ${level + 1} · ${levelName(level + 1)}` : null}
        onNext={advanceLevel}
        onRetry={() => restartLevel(level)}
        onMenu={quit}
      />
    )
  }

  if (status === 'game-over') {
    return <GameOverScreen levelLabel={levelLabel} onRetry={() => restartLevel(level)} onMenu={quit} />
  }

  return null
}
