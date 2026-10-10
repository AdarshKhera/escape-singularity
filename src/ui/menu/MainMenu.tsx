import { useCallback, useState } from 'react'
import { MAX_LEVEL } from '../../levels/levels'
import { useProgressStore } from '../../state/progressStore'
import { useGameStore } from '../../state/gameStore'
import { Button } from '../primitives'
import { ShipSelector } from '../ShipSelector'
import { SettingsPanel } from '../SettingsPanel'
import { levelName } from '../levelFormat'
import { useTouchMode } from '../device'
import { MenuBackdrop } from './MenuBackdrop'
import { LevelSelect } from './LevelSelect'
import { Credits, HowToPlay } from './InfoScreens'
import { Sheet } from './Sheet'
import './menu.css'

type MenuScreen = 'home' | 'levels' | 'hangar' | 'settings' | 'howto' | 'credits'

interface MainMenuProps {
  onStartLevel: (level: number) => void
}

export function MainMenu({ onStartLevel }: MainMenuProps) {
  const [screen, setScreen] = useState<MenuScreen>('home')
  const shipSkinId = useGameStore((s) => s.shipSkinId)
  const setShipSkinId = useGameStore((s) => s.setShipSkinId)
  const touchMode = useTouchMode()
  const goHome = useCallback(() => setScreen('home'), [])

  return (
    <div className="es-menu">
      <MenuBackdrop shipSkinId={shipSkinId} />
      <div className="es-menu__vignette" />

      {screen === 'home' && <Home onStartLevel={onStartLevel} onNavigate={setScreen} />}

      {screen === 'levels' && <LevelSelect onBack={goHome} onSelect={onStartLevel} />}

      {screen === 'hangar' && (
        <Sheet title="Hangar" onBack={goHome}>
          <ShipSelector selectedId={shipSkinId} onSelect={setShipSkinId} />
        </Sheet>
      )}

      {screen === 'settings' && (
        <Sheet title="Settings" onBack={goHome}>
          <div className="es-sheet__narrow">
            <SettingsPanel allowReset />
          </div>
        </Sheet>
      )}

      {screen === 'howto' && <HowToPlay onBack={goHome} preferred={touchMode ? 'touch' : 'keyboard'} />}

      {screen === 'credits' && <Credits onBack={goHome} />}
    </div>
  )
}

interface HomeProps {
  onStartLevel: (level: number) => void
  onNavigate: (screen: MenuScreen) => void
}

function Home({ onStartLevel, onNavigate }: HomeProps) {
  const highestUnlocked = useProgressStore((s) => s.highestUnlocked)
  const best = useProgressStore((s) => s.best)
  const continueLevel = Math.min(Math.max(highestUnlocked, 1), MAX_LEVEL)
  const hasProgress = Object.keys(best).length > 0

  return (
    <div className="es-home">
      <div className="es-home__brand">
        <span className="es-eyebrow">Arehk Games</span>
        <h1 className="es-title es-home__title">
          ESCAPE
          <br />
          SINGULARITY
        </h1>
        <p className="es-home__tagline">Turn away early, or the black hole keeps you.</p>
      </div>

      <nav className="es-home__nav" aria-label="Main menu">
        <Button variant="primary" className="es-home__play" block autoFocus onClick={() => onStartLevel(continueLevel)}>
          {hasProgress ? 'Continue' : 'Play'}
          <span className="es-btn__sub">
            Level {continueLevel} · {levelName(continueLevel)}
          </span>
        </Button>
        <div className="es-home__grid">
          <Button onClick={() => onNavigate('levels')}>Levels</Button>
          <Button onClick={() => onNavigate('hangar')}>Hangar</Button>
          <Button onClick={() => onNavigate('settings')}>Settings</Button>
          <Button onClick={() => onNavigate('howto')}>How to play</Button>
        </div>
      </nav>

      <footer className="es-home__footer">
        <span>Created by Adarsh Khera</span>
        <Button variant="ghost" onClick={() => onNavigate('credits')}>
          Credits
        </Button>
      </footer>
    </div>
  )
}
