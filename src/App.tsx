import { useCallback, useState } from 'react'
import { GameCanvas } from './game/GameCanvas'
import { useGameStore } from './state/gameStore'
import { useSettingsStore } from './state/settingsStore'
import { HUD } from './ui/HUD'
import { LevelIntro } from './ui/LevelIntro'
import { CoachMark } from './ui/CoachMark'
import { MusicBar } from './ui/MusicBar'
import { IntroLoader } from './ui/IntroLoader'
import { MainMenu } from './ui/menu/MainMenu'
import { RotateDevice } from './ui/RotateDevice'
import { TouchControls } from './ui/touch/TouchControls'
import { GameOverlays } from './ui/overlays/GameOverlays'
import { restartLevel } from './ui/gameActions'
import { applyAudioSettings, startAudio } from './ui/audioAdapter'
import { enterImmersiveMode, useIsPortrait, useIsTouchDevice, useSuppressContextMenu, useTouchMode } from './ui/device'
import { useHaptics } from './ui/haptics'
import { useAudioSettingsSync, useAutoPause } from './ui/useGameLifecycle'
import { useRunRecorder } from './ui/useRunRecorder'
import { useBackGuard } from './ui/useBackGuard'
import { useMotionAttribute } from './ui/motion'
import { useUiFeedback } from './ui/useUiFeedback'
import { useSpatialNav } from './ui/useSpatialNav'
import './ui/ui.css'

type AppPhase = 'intro' | 'menu' | 'game'

function App() {
  const [phase, setPhase] = useState<AppPhase>('intro')
  const touchDevice = useIsTouchDevice()
  const touchMode = useTouchMode()
  const portrait = useIsPortrait()
  const blockedByOrientation = touchDevice && portrait

  useHaptics()
  useMotionAttribute()
  useUiFeedback()
  useSpatialNav()
  useAudioSettingsSync()
  useRunRecorder()
  useAutoPause(blockedByOrientation)
  useBackGuard(phase === 'game')
  useSuppressContextMenu(phase === 'game')

  // runs inside the tap: fullscreen, orientation lock and audio all need a
  // user gesture, so none of them can be deferred to an effect
  const startLevel = useCallback(
    (level: number) => {
      if (touchDevice) void enterImmersiveMode()
      startAudio()
      const { music, sfx } = useSettingsStore.getState()
      applyAudioSettings(music, sfx)
      restartLevel(level)
      setPhase('game')
    },
    [touchDevice],
  )

  const quitToMenu = useCallback(() => setPhase('menu'), [])
  const skipIntro = useCallback(() => setPhase('menu'), [])

  return (
    <div className="es-app">
      {phase === 'intro' && (
        // skip on click, not pointerdown: the menu mounts under the finger and
        // would otherwise receive this same tap's click
        <div onClick={skipIntro} style={{ position: 'absolute', inset: 0 }}>
          <IntroLoader onFinish={skipIntro} />
        </div>
      )}

      {phase === 'menu' && <MainMenu onStartLevel={startLevel} />}

      {phase === 'game' && (
        <GameView touchMode={touchMode} onQuitToMenu={quitToMenu} />
      )}

      {blockedByOrientation && <RotateDevice />}
    </div>
  )
}

interface GameViewProps {
  touchMode: boolean
  onQuitToMenu: () => void
}

function GameView({ touchMode, onQuitToMenu }: GameViewProps) {
  const status = useGameStore((s) => s.status)
  const paused = useGameStore((s) => s.paused)
  const flying = (status === 'playing' || status === 'sucked-in') && !paused

  return (
    <div className="es-stage">
      <GameCanvas />
      <HUD touchMode={touchMode} />
      <LevelIntro />
      <CoachMark inputMode={touchMode ? 'touch' : 'keyboard'} />
      {touchMode && flying && <TouchControls />}
      {!touchMode && <MusicBar />}
      <GameOverlays inputMode={touchMode ? 'touch' : 'keyboard'} onQuitToMenu={onQuitToMenu} />
    </div>
  )
}

export default App
