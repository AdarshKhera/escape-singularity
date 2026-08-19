import { useState } from 'react'
import { GameCanvas } from './game/GameCanvas'
import { HUD } from './ui/HUD'
import { MusicBar } from './ui/MusicBar'
import { StartScreen } from './ui/StartScreen'
import { IntroLoader } from './ui/IntroLoader'
import { audioEngine } from './audio/AudioEngine'
import { TRACKS } from './audio/tracks'
import { useGameStore } from './state/gameStore'

type AppPhase = 'intro' | 'menu' | 'game'

function App() {
  const [phase, setPhase] = useState<AppPhase>('intro')
  const shipSkinId = useGameStore((s) => s.shipSkinId)
  const setShipSkinId = useGameStore((s) => s.setShipSkinId)

  // audio must be unlocked by a user gesture, so it starts with the launch click
  const handleStart = () => {
    audioEngine.start()
    audioEngine.playTrack(TRACKS[0].id)
    setPhase('game')
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000' }}>
      {phase === 'intro' && <IntroLoader onFinish={() => setPhase('menu')} />}
      {phase === 'menu' && (
        <StartScreen onStart={handleStart} shipSkinId={shipSkinId} onSelectShipSkin={setShipSkinId} />
      )}
      {phase === 'game' && (
        <>
          <GameCanvas />
          <HUD onQuit={() => setPhase('menu')} />
          <MusicBar />
        </>
      )}
    </div>
  )
}

export default App
