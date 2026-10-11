import { useGameStore } from '../state/gameStore'
import { FUEL_MAX } from '../levels/worldConfig'
import { getLevel, computeLevelSegments } from '../levels/levels'
import { PixelHeart } from './PixelHeart'
import { displayText, levelName } from './levelFormat'
import { horizonProgress } from './hudMath'
import './hud.css'

const MAX_LIVES = 3

interface HUDProps {
  touchMode: boolean
}

// Deliberately light and frameless so the game stays the star: level and
// lives with the fuel gauge top-left, the run to the next black hole as a slim
// track along the top. Menus and end-of-level screens carry everything else.
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

  const progress = horizonProgress(computeLevelSegments(getLevel(level)), shipWorldX)
  const fuelFraction = Math.max(0, Math.min(1, fuel / FUEL_MAX))
  const lowFuel = fuelFraction < 0.25
  const live = status === 'playing' && !paused

  return (
    <>
      <div className="es-hud">
        <div className="es-hud__scrim" aria-hidden="true" />

        <div className="es-hud__id">
          <span className="es-hud__num">{String(level).padStart(2, '0')}</span>
          <span className="es-hud__name">{levelName(level)}</span>
        </div>

        <div className="es-hud__hearts" aria-label={`${lives} lives`}>
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <PixelHeart key={i} filled={i < lives} size={13} />
          ))}
        </div>

        <div
          className={`es-hud__fuel${lowFuel ? ' es-hud__fuel--low' : ''}`}
          role="meter"
          aria-label="Fuel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fuelFraction * 100)}
        >
          <span className="es-hud__fuel-label">Fuel</span>
          <span className="es-hud__bar" aria-hidden="true">
            <i style={{ width: `${fuelFraction * 100}%` }} />
          </span>
        </div>

        {(hasWeapon || shieldCharges > 0) && (
          <div className="es-hud__loadout">
            {hasWeapon && (
              <span className="es-hud__chip">
                <b>{ammo}</b> Rockets
              </span>
            )}
            {shieldCharges > 0 && (
              <span className="es-hud__chip es-hud__chip--shield">
                <b>{shieldCharges}</b> Shield
              </span>
            )}
          </div>
        )}
      </div>

      <div className="es-hud__horizon" aria-label={`${progress.seconds.toFixed(0)} seconds to the black hole`}>
        <span className="es-hud__eta">
          <b>{progress.seconds.toFixed(1)}</b>s to horizon
          {progress.holeCount > 1 && (
            <em>
              {progress.holeIndex}/{progress.holeCount}
            </em>
          )}
        </span>
        <span className="es-hud__track" aria-hidden="true">
          <span className="es-hud__trail" style={{ width: `${progress.fraction * 100}%` }} />
          <span className="es-hud__ship" style={{ left: `${progress.fraction * 100}%` }} />
          <span className="es-hud__hole" />
        </span>
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
