import { useGameStore } from '../state/gameStore'
import { FUEL_MAX, REFERENCE_SPEED } from '../levels/worldConfig'
import { getLevel, computeLevelSegments, activeSegment } from '../levels/levels'
import { PixelHeart } from './PixelHeart'
import { displayText, levelName } from './levelFormat'
import './hud.css'

const MAX_LIVES = 3

interface HUDProps {
  touchMode: boolean
}

// Deliberately minimal: level, lives, fuel with time-to-hole, loadout. Menus
// and end-of-level screens carry everything else.
export function HUD({ touchMode }: HUDProps) {
  const shipWorldX = useGameStore((s) => s.shipWorldX)
  const lives = useGameStore((s) => s.lives)
  const fuel = useGameStore((s) => s.fuel)
  const level = useGameStore((s) => s.level)
  const status = useGameStore((s) => s.status)
  const paused = useGameStore((s) => s.paused)
  const togglePause = useGameStore((s) => s.togglePause)
  const bannerMessage = useGameStore((s) => s.bannerMessage)
  const hasWeapon = useGameStore((s) => s.hasWeapon)
  const ammo = useGameStore((s) => s.ammo)
  const shieldCharges = useGameStore((s) => s.shieldCharges)

  const segments = computeLevelSegments(getLevel(level))
  const layout = activeSegment(segments, shipWorldX)
  const secondsToHole = Math.max((layout.blackHoleX - shipWorldX) / REFERENCE_SPEED, 0)
  const fuelPct = Math.max(0, Math.min(1, fuel / FUEL_MAX))
  const live = status === 'playing' && !paused

  return (
    <>
      <div className="es-hud">
        <div className="es-hud__top">
          <span className="es-hud__level">
            LV {level} · {levelName(level)}
          </span>
          <span className="es-hud__divider" />
          <span className="es-hud__hearts" aria-label={`${lives} lives`}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <PixelHeart key={i} filled={i < lives} size={11} />
            ))}
          </span>
        </div>

        <div className="es-hud__fuel">
          <span className="es-hud__fuel-label">Fuel</span>
          <div className="es-hud__fuel-track">
            <div
              className={`es-hud__fuel-fill${fuelPct < 0.25 ? ' es-hud__fuel-fill--low' : ''}`}
              style={{ width: `${fuelPct * 100}%` }}
            />
          </div>
          <span className="es-hud__countdown">{secondsToHole.toFixed(1)}s</span>
        </div>

        {(hasWeapon || shieldCharges > 0) && (
          <div className="es-hud__loadout">
            {hasWeapon && <span>AMMO x{ammo}</span>}
            {shieldCharges > 0 && <span>SHIELD UP</span>}
          </div>
        )}
      </div>

      {live && bannerMessage && <div className="es-hud__banner">{displayText(bannerMessage)}</div>}

      {!touchMode && hasWeapon && <div className="es-hud__hint es-hud__hint--fire">SPACE to fire ({ammo} left)</div>}

      {!touchMode && live && <div className="es-hud__hint es-hud__hint--corner">P to pause · Esc to quit</div>}

      {touchMode && live && (
        <button type="button" className="es-hud__pause" onClick={togglePause} aria-label="Pause">
          <span />
          <span />
        </button>
      )}
    </>
  )
}
