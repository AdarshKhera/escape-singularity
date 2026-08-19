import { useEffect, useState, type CSSProperties } from 'react'
import { useGameStore } from '../state/gameStore'
import { FUEL_MAX, REFERENCE_SPEED } from '../levels/worldConfig'
import { getLevel, MAX_LEVEL, computeLevelSegments, activeSegment } from '../levels/levels'
import { PixelHeart } from './PixelHeart'
import { FONT_DISPLAY, FONT_MONO } from './fonts'

const MAX_LIVES = 3

interface HUDProps {
  onQuit: () => void
}

export function HUD({ onQuit }: HUDProps) {
  const shipWorldX = useGameStore((s) => s.shipWorldX)
  const lives = useGameStore((s) => s.lives)
  const fuel = useGameStore((s) => s.fuel)
  const level = useGameStore((s) => s.level)
  const status = useGameStore((s) => s.status)
  const paused = useGameStore((s) => s.paused)
  const togglePause = useGameStore((s) => s.togglePause)
  const bannerMessage = useGameStore((s) => s.bannerMessage)
  const deathCause = useGameStore((s) => s.deathCause)
  const respawn = useGameStore((s) => s.respawn)
  const resetRun = useGameStore((s) => s.resetRun)
  const advanceLevel = useGameStore((s) => s.advanceLevel)
  const hasWeapon = useGameStore((s) => s.hasWeapon)
  const ammo = useGameStore((s) => s.ammo)
  const shieldCharges = useGameStore((s) => s.shieldCharges)

  const [showQuit, setShowQuit] = useState(false)

  useEffect(() => {
    if (status !== 'playing') setShowQuit(false)
  }, [status])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (status !== 'playing') return
      setShowQuit((prev) => {
        const next = !prev
        if (next && !useGameStore.getState().paused) togglePause()
        if (!next && useGameStore.getState().paused) togglePause()
        return next
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status, togglePause])

  const handleQuit = () => {
    setShowQuit(false)
    resetRun()
    onQuit()
  }

  const handleResumeFromQuit = () => {
    setShowQuit(false)
    togglePause()
  }

  const levelConfig = getLevel(level)
  const segments = computeLevelSegments(levelConfig)
  const layout = activeSegment(segments, shipWorldX)
  const secondsToHole = Math.max((layout.blackHoleX - shipWorldX) / REFERENCE_SPEED, 0)
  const fuelPct = Math.max(0, Math.min(1, fuel / FUEL_MAX))
  const fuelLow = fuelPct < 0.25
  const hasNextLevel = level < MAX_LEVEL

  return (
    <>
      <div style={panelStyle}>
        <div style={topRowStyle}>
          <span style={levelBadgeStyle}>
            LV {level} · {levelConfig.name}
          </span>
          <span style={dividerStyle} />
          <span style={rowStyle}>
            {Array.from({ length: MAX_LIVES }, (_, i) => (
              <PixelHeart key={i} filled={i < lives} size={11} />
            ))}
          </span>
        </div>

        <div style={fuelRowStyle}>
          <span style={fuelLabelStyle}>Fuel</span>
          <div style={fuelTrackStyle}>
            <div
              style={{
                ...fuelFillStyle,
                width: `${fuelPct * 100}%`,
                background: fuelLow
                  ? 'linear-gradient(90deg, #ff5d5d, #ff9a6a)'
                  : 'linear-gradient(90deg, #3fd6ff, #7fe9c7)',
              }}
            />
          </div>
          <span style={countdownStyle}>{secondsToHole.toFixed(1)}s</span>
        </div>

        {(hasWeapon || shieldCharges > 0) && (
          <div style={loadoutRowStyle}>
            {hasWeapon && <span>AMMO x{ammo}</span>}
            {shieldCharges > 0 && <span>SHIELD UP</span>}
          </div>
        )}
      </div>

      {hasWeapon && (
        <div style={fireHintStyle}>SPACE to fire ({ammo} left)</div>
      )}

      {status === 'playing' && !paused && bannerMessage && (
        <div style={bannerStyle}>{bannerMessage}</div>
      )}

      {status === 'playing' && !paused && (
        <div style={pauseHintStyle}>P to pause · Esc to quit</div>
      )}

      {status === 'playing' && paused && showQuit && (
        <div style={overlayStyle}>
          <div style={overlayTitleStyle}>QUIT RUN?</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={buttonStyle} onClick={handleResumeFromQuit}>
              Resume
            </button>
            <button style={buttonStyle} onClick={handleQuit}>
              Quit
            </button>
          </div>
        </div>
      )}

      {status === 'playing' && paused && !showQuit && (
        <div style={overlayStyle}>
          <div style={overlayTitleStyle}>PAUSED</div>
          <button style={buttonStyle} onClick={togglePause}>
            Resume
          </button>
        </div>
      )}

      {status !== 'playing' && status !== 'sucked-in' && (
        <div style={overlayStyle}>
          <div style={overlayTitleStyle}>
            {status === 'life-lost' && (deathCause === 'blackhole' ? 'SWALLOWED' : 'SHIP DESTROYED')}
            {status === 'level-complete' && 'ESCAPED THE SINGULARITY'}
            {status === 'game-over' && 'GAME OVER'}
          </div>

          {status === 'level-complete' && (
            <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 2 }}>
              {hasNextLevel
                ? `NEXT: LEVEL ${level + 1} · ${getLevel(level + 1).name.toUpperCase()}`
                : 'ALL LEVELS CLEARED'}
            </div>
          )}

          {status === 'life-lost' && (
            <button style={buttonStyle} onClick={respawn}>
              Relaunch
            </button>
          )}
          {status === 'level-complete' && hasNextLevel && (
            <button style={buttonStyle} onClick={advanceLevel}>
              Continue
            </button>
          )}
          {(status === 'game-over' || (status === 'level-complete' && !hasNextLevel)) && (
            <button style={buttonStyle} onClick={resetRun}>
              Restart
            </button>
          )}
        </div>
      )}
    </>
  )
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  minWidth: 260,
  padding: '8px 16px',
  background: 'linear-gradient(180deg, rgba(12,17,28,0.72), rgba(8,11,18,0.58))',
  border: '1px solid rgba(191,227,255,0.16)',
  borderRadius: 7,
  boxShadow: '0 4px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(4px)',
  fontFamily: FONT_MONO,
  color: '#e8ecf5',
  pointerEvents: 'none',
}

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  justifyContent: 'space-between',
}

const dividerStyle: CSSProperties = {
  width: 1,
  height: 10,
  background: 'rgba(191,227,255,0.2)',
}

const levelBadgeStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: 1.2,
  color: '#5fd0ff',
  textShadow: '0 0 12px rgba(95,208,255,0.4)',
  textTransform: 'uppercase',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 3,
  alignItems: 'center',
}

const fuelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  width: '100%',
}

const fuelLabelStyle: CSSProperties = {
  fontSize: 8,
  fontWeight: 500,
  letterSpacing: 1.2,
  opacity: 0.55,
  textTransform: 'uppercase',
}

const fuelTrackStyle: CSSProperties = {
  flex: 1,
  minWidth: 90,
  height: 5,
  background: 'rgba(255,255,255,0.07)',
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.06)',
  overflow: 'hidden',
}

const fuelFillStyle: CSSProperties = {
  height: '100%',
  transition: 'width 0.15s linear',
}

const countdownStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  opacity: 0.7,
  minWidth: 36,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}

const loadoutRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: 1,
  opacity: 0.85,
  color: '#ffb37a',
}

const pauseHintStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 16,
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: 1,
  opacity: 0.35,
  color: '#e8ecf5',
  pointerEvents: 'none',
}

const fireHintStyle: CSSProperties = {
  position: 'absolute',
  top: 84,
  left: '50%',
  transform: 'translateX(-50%)',
  fontFamily: FONT_MONO,
  fontSize: 9,
  letterSpacing: 1,
  opacity: 0.5,
  color: '#e8ecf5',
  pointerEvents: 'none',
}

const bannerStyle: CSSProperties = {
  position: 'absolute',
  top: '22%',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#ffb37a',
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: 3,
  whiteSpace: 'nowrap',
  textShadow: '0 0 18px rgba(255,150,80,0.5)',
  pointerEvents: 'none',
}

const overlayTitleStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 26,
  letterSpacing: 3,
}

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(2px)',
  color: '#e8ecf5',
  fontFamily: FONT_MONO,
  textAlign: 'center',
  padding: 20,
}

const buttonStyle: CSSProperties = {
  padding: '10px 26px',
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 2,
  textTransform: 'uppercase',
  background: 'rgba(63,214,255,0.08)',
  border: '1px solid #3fd6ff',
  borderRadius: 3,
  color: '#3fd6ff',
  boxShadow: '0 0 18px rgba(63,214,255,0.16)',
  cursor: 'pointer',
  pointerEvents: 'auto',
}
