import { useCallback, useEffect, useRef, useState } from 'react'
import { useScreenTransition } from '../useScreenTransition'
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
import { Records } from './Records'
import { Sheet } from './Sheet'
import { StarTotal } from './StarTotal'
import './menu.css'

type MenuScreen = 'home' | 'levels' | 'hangar' | 'records' | 'settings' | 'howto' | 'credits'

interface MainMenuProps {
  onStartLevel: (level: number) => void
}

export function MainMenu({ onStartLevel }: MainMenuProps) {
  const [target, setScreen] = useState<MenuScreen>('home')
  const [lastSheet, setLastSheet] = useState<MenuScreen | null>(null)
  const { shown: screen, leaving } = useScreenTransition(target)
  const shipSkinId = useGameStore((s) => s.shipSkinId)
  const setShipSkinId = useGameStore((s) => s.setShipSkinId)
  const touchMode = useTouchMode()
  const goHome = useCallback(() => setScreen('home'), [])
  const navigate = useCallback((next: MenuScreen) => {
    setLastSheet(next)
    setScreen(next)
  }, [])

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <Home onStartLevel={onStartLevel} onNavigate={navigate} returnFrom={lastSheet} />
      case 'levels':
        return <LevelSelect onBack={goHome} onSelect={onStartLevel} />
      case 'hangar':
        return (
          <Sheet title="Hangar" onBack={goHome} aside={<StarTotal />}>
            <ShipSelector equippedId={shipSkinId} onEquip={setShipSkinId} />
          </Sheet>
        )
      case 'records':
        return <Records onBack={goHome} />
      case 'settings':
        return (
          <Sheet title="Settings" onBack={goHome}>
            <div className="es-sheet__content">
              <SettingsPanel allowReset />
            </div>
          </Sheet>
        )
      case 'howto':
        return <HowToPlay onBack={goHome} preferred={touchMode ? 'touch' : 'keyboard'} />
      case 'credits':
        return <Credits onBack={goHome} />
    }
  }

  return (
    <div className="es-menu">
      <MenuBackdrop shipSkinId={shipSkinId} />
      <div className="es-menu__vignette" />
      <div className="es-menu__screen" data-leaving={leaving} inert={leaving}>
        {renderScreen()}
      </div>
    </div>
  )
}

interface HomeProps {
  onStartLevel: (level: number) => void
  onNavigate: (screen: MenuScreen) => void
  /** the sub-screen just closed, so focus lands back on its button */
  returnFrom: MenuScreen | null
}

function Home({ onStartLevel, onNavigate, returnFrom }: HomeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!returnFrom) return
    rootRef.current?.querySelector<HTMLElement>(`[data-screen="${returnFrom}"]`)?.focus({ preventScroll: true })
  }, [returnFrom])

  const highestUnlocked = useProgressStore((s) => s.highestUnlocked)
  const best = useProgressStore((s) => s.best)
  const continueLevel = Math.min(Math.max(highestUnlocked, 1), MAX_LEVEL)
  const hasProgress = Object.keys(best).length > 0

  return (
    <div ref={rootRef} className="es-home">
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
        <Button
          variant="primary"
          className="es-home__play"
          block
          autoFocus={!returnFrom}
          onClick={() => onStartLevel(continueLevel)}
        >
          {hasProgress ? 'Continue' : 'Play'}
          <span className="es-btn__sub">
            Level {continueLevel} · {levelName(continueLevel)}
          </span>
        </Button>
        <div className="es-home__grid">
          <Button data-screen="levels" onClick={() => onNavigate('levels')}>
            Levels
          </Button>
          <Button data-screen="hangar" onClick={() => onNavigate('hangar')}>
            Hangar
          </Button>
          <Button data-screen="records" onClick={() => onNavigate('records')}>
            Records
          </Button>
          <Button data-screen="settings" onClick={() => onNavigate('settings')}>
            Settings
          </Button>
        </div>
      </nav>

      <footer className="es-home__footer">
        <span>Created by Adarsh Khera</span>
        <span className="es-home__links">
          <Button variant="ghost" data-screen="howto" onClick={() => onNavigate('howto')}>
            How to play
          </Button>
          <Button variant="ghost" data-screen="credits" onClick={() => onNavigate('credits')}>
            Credits
          </Button>
        </span>
      </footer>
    </div>
  )
}
