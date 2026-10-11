import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { getLevel } from '../levels/levels'
import { displayText } from './levelFormat'
import { useReducedMotion } from './motion'
import { useLevelIntroStore } from './levelIntroStore'

// Brief title card as a level starts: number, name, subtitle and the black
// hole waiting at the end. Sits low and centred, clear of the ship's lane,
// and is gone in a little over two seconds. Never blocks input.
// card animation (2400ms) plus the 400ms it waits for the stage fade
const INTRO_MS = 2800

export function LevelIntro() {
  const introId = useLevelIntroStore((s) => s.introId)
  const visible = useLevelIntroStore((s) => s.visible)
  const dismiss = useLevelIntroStore((s) => s.dismiss)
  const level = useGameStore((s) => s.level)
  const live = useGameStore((s) => s.status === 'playing' && !s.paused)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => dismiss(introId), INTRO_MS)
    return () => window.clearTimeout(timer)
  }, [introId, visible, dismiss])

  if (!visible || !live) return null
  const def = getLevel(level)

  return (
    <div key={introId} className={`es-intro${reduced ? ' es-intro--static' : ''}`} role="status">
      <div className="es-intro__text">
        <span className="es-intro__num">Level {String(def.id).padStart(2, '0')}</span>
        <span className="es-intro__name">{displayText(def.name)}</span>
        <span className="es-intro__sub">
          {displayText(def.subtitle)}
          <span className="es-intro__dot" aria-hidden="true" />
          Black hole <strong>{displayText(def.blackHoleName)}</strong>
        </span>
      </div>
    </div>
  )
}
