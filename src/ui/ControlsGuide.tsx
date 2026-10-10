export type InputMode = 'keyboard' | 'touch'

interface ControlEntry {
  input: string
  action: string
}

const KEYBOARD: readonly ControlEntry[] = [
  { input: 'D / →', action: 'Thrust' },
  { input: 'A / ←', action: 'Brake' },
  { input: 'W S / ↑ ↓', action: 'Steer' },
  { input: 'D D', action: 'Boost' },
  { input: 'Space', action: 'Fire rocket' },
  { input: 'P', action: 'Pause' },
  { input: 'Esc', action: 'Quit run' },
  { input: 'M', action: 'Sound on / off' },
]

const TOUCH: readonly ControlEntry[] = [
  { input: 'Left pad', action: 'Slide up or down to steer' },
  { input: 'Thrust', action: 'Hold to accelerate' },
  { input: 'Tap tap', action: 'Double tap thrust to boost' },
  { input: 'Brake', action: 'Hold to slow down' },
  { input: 'Fire', action: 'Appears when you carry rockets' },
  { input: 'II', action: 'Pause' },
]

interface ControlsGuideProps {
  mode: InputMode
  compact?: boolean
}

export function ControlsGuide({ mode, compact }: ControlsGuideProps) {
  const entries = mode === 'touch' ? TOUCH : KEYBOARD
  const shown = compact ? entries.slice(0, mode === 'touch' ? 4 : 5) : entries
  return (
    <div className={`es-controls${compact ? ' es-controls--compact' : ''}`}>
      {shown.map((e) => (
        <div key={e.input} className="es-controls__row">
          <kbd className="es-kbd">{e.input}</kbd>
          <span className="es-controls__action">{e.action}</span>
        </div>
      ))}
    </div>
  )
}

export const RULES: readonly string[] = [
  'Cross each system and get past the black hole waiting on your line.',
  'Pick a side early and hold the turn until you are clear of the pull.',
  'Steering and thrust burn fuel. Grab fuel caches on the way.',
  'Rockets clear debris from your lane. A shield absorbs one hit.',
]
