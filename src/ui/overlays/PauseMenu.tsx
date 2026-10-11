import { useState } from 'react'
import { useSettingsStore } from '../../state/settingsStore'
import { ControlsGuide, type InputMode } from '../ControlsGuide'
import { SettingsPanel } from '../SettingsPanel'
import { Button, Overlay } from '../primitives'

interface PauseMenuProps {
  levelLabel: string
  inputMode: InputMode
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
}

export function PauseMenu({ levelLabel, inputMode, onResume, onRestart, onQuit }: PauseMenuProps) {
  const [showSettings, setShowSettings] = useState(false)

  if (showSettings) {
    return (
      <Overlay label="Settings" width={640}>
        <div className="es-overlay__title" style={{ fontSize: 18 }}>
          SETTINGS
        </div>
        <SettingsPanel />
        <Button block data-sound="back" onClick={() => setShowSettings(false)}>
          Back
        </Button>
      </Overlay>
    )
  }

  return (
    <Overlay label="Paused" width={600}>
      <div className="es-pause">
        <div className="es-stack">
          <div className="es-pause__head">
            <span className="es-overlay__title">PAUSED</span>
            <span className="es-label">{levelLabel}</span>
          </div>
          <Button variant="primary" block autoFocus onClick={onResume}>
            Resume
          </Button>
          <Button block onClick={onRestart}>
            Restart level
          </Button>
          <Button block onClick={() => setShowSettings(true)}>
            Settings
          </Button>
          <Button block variant="danger" onClick={onQuit}>
            Quit to menu
          </Button>
        </div>

        <div className="es-pause__side">
          <span className="es-label">Sound</span>
          <SoundChips />
          <span className="es-label" style={{ marginTop: 6 }}>
            Controls
          </span>
          <ControlsGuide mode={inputMode} compact />
        </div>
      </div>
    </Overlay>
  )
}

export function SoundChips() {
  const music = useSettingsStore((s) => s.music)
  const sfx = useSettingsStore((s) => s.sfx)
  const setMusic = useSettingsStore((s) => s.setMusic)
  const setSfx = useSettingsStore((s) => s.setSfx)

  return (
    <div className="es-chip-row">
      <button type="button" className="es-chip" aria-pressed={music} onClick={() => setMusic(!music)}>
        <span className="es-chip__dot" />
        Music
      </button>
      <button type="button" className="es-chip" aria-pressed={sfx} onClick={() => setSfx(!sfx)}>
        <span className="es-chip__dot" />
        SFX
      </button>
    </div>
  )
}
