import { useCallback, useState } from 'react'
import { GameCanvas } from './game/GameCanvas'
import { useGameStore } from './state/gameStore'
import { useSettingsStore } from './state/settingsStore'
import { HUD } from './ui/HUD'
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
import { useAudioSettingsSync, useAutoPause, useProgressRecorder } from './ui/useGameLifecycle'
import { useBackGuard } from './ui/useBackGuard'
import './ui/ui.css'

type AppPhase = 'intro' | 'menu' | 'game'

function App() {
  const [phase, setPhase] = useState<AppPhase>('intro')
  const touchDevice = useIsTouchDevice()
  const touchMode = useTouchMode()
  const portrait = useIsPortrait()
  const blockedByOrientation = touchDevice && portrait

  useHaptics()
  useAudioSettingsSync()
  useProgressRecorder()
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
    <>
      <GameCanvas />
      <HUD touchMode={touchMode} />
      {touchMode && flying && <TouchControls />}
      {!touchMode && <MusicBar />}
      <GameOverlays inputMode={touchMode ? 'touch' : 'keyboard'} onQuitToMenu={onQuitToMenu} />
    </>
  )
}

export default App
