import { ControlsGuide, RULES, type InputMode } from '../ControlsGuide'
import { Sheet } from './Sheet'

interface HowToPlayProps {
  onBack: () => void
  preferred: InputMode
}

export function HowToPlay({ onBack, preferred }: HowToPlayProps) {
  const order: InputMode[] = preferred === 'touch' ? ['touch', 'keyboard'] : ['keyboard', 'touch']
  return (
    <Sheet title="How to play" onBack={onBack}>
      <div className="es-howto">
        <div className="es-howto__col">
          <span className="es-label">The mission</span>
          <ul className="es-howto__rules">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        {order.map((mode) => (
          <div key={mode} className="es-howto__col">
            <span className="es-label">{mode === 'touch' ? 'Touch' : 'Keyboard'}</span>
            <ControlsGuide mode={mode} />
          </div>
        ))}
      </div>
    </Sheet>
  )
}

interface CreditsProps {
  onBack: () => void
}

const CREDIT_BLOCKS: readonly { role: string; lines: readonly string[] }[] = [
  { role: 'Studio', lines: ['Arehk Games'] },
  { role: 'Created by', lines: ['Adarsh Khera'] },
  { role: 'Ship art', lines: ['"Void Main Ship" pack by Foozle (CC0)'] },
  { role: 'Celestial art', lines: ['CelestialObjects pack'] },
  { role: 'Music and sound', lines: ['Synthesised live in the browser'] },
]

export function Credits({ onBack }: CreditsProps) {
  return (
    <Sheet title="Credits" onBack={onBack}>
      <div className="es-credits">
        {CREDIT_BLOCKS.map((block) => (
          <div key={block.role} className="es-credits__block">
            <span className="es-label">{block.role}</span>
            {block.lines.map((line) => (
              <span key={line} className="es-credits__name">
                {line}
              </span>
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  )
}
