import type { CSSProperties } from 'react'
import { ShipSelector } from './ShipSelector'
import { FONT_DISPLAY, FONT_MONO } from './fonts'

interface StartScreenProps {
  onStart: () => void
  shipSkinId: string
  onSelectShipSkin: (id: string) => void
}

const CONTROLS = [
  { keys: 'D / →', action: 'Thrust' },
  { keys: 'A / ←', action: 'Brake' },
  { keys: 'W S / ↑ ↓', action: 'Steer' },
  { keys: 'D D', action: 'Boost' },
]

export function StartScreen({ onStart, shipSkinId, onSelectShipSkin }: StartScreenProps) {
  return (
    <div style={wrapStyle}>
      <div style={studioStyle}>AREHK GAMES</div>

      <h1 style={titleStyle}>ESCAPE SINGULARITY</h1>

      <p style={taglineStyle}>Turn away early, or the black hole keeps you.</p>

      <div style={controlsStyle}>
        {CONTROLS.map((c) => (
          <div key={c.keys} style={controlRowStyle}>
            <kbd style={kbdStyle}>{c.keys}</kbd>
            <span style={actionStyle}>{c.action}</span>
          </div>
        ))}
      </div>

      <div style={rulesStyle}>
        <span>Steering and thrust burn fuel.</span>
        <span>Hold the turn until you are clear.</span>
      </div>

      <ShipSelector selectedId={shipSkinId} onSelect={onSelectShipSkin} />

      <button style={startButtonStyle} onClick={onStart}>
        Launch
      </button>

      <div style={footerStyle}>Created by Adarsh Khera</div>
    </div>
  )
}

const wrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 18,
  padding: 24,
  textAlign: 'center',
  background:
    'radial-gradient(circle at 50% 42%, #10141f 0%, #05070c 55%, #000 100%)',
  color: '#e8ecf5',
  fontFamily: FONT_MONO,
  overflowY: 'auto',
}

const studioStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  letterSpacing: 8,
  fontSize: 11,
  color: '#6fa8d8',
  opacity: 0.7,
}

const titleStyle: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontSize: 'clamp(28px, 6.5vw, 56px)',
  letterSpacing: 5,
  fontWeight: 900,
  margin: 0,
  background: 'linear-gradient(180deg, #ffffff 0%, #9fd3ff 60%, #4fa8e8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  filter: 'drop-shadow(0 0 24px rgba(120,180,255,0.35))',
}

const taglineStyle: CSSProperties = {
  fontSize: 13,
  letterSpacing: 0.5,
  opacity: 0.6,
  margin: 0,
}

const controlsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(128px, max-content))',
  gap: '8px 22px',
  justifyContent: 'center',
}

const controlRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}

const kbdStyle: CSSProperties = {
  minWidth: 66,
  padding: '4px 8px',
  fontFamily: FONT_MONO,
  fontWeight: 500,
  fontSize: 11,
  background: 'rgba(63,214,255,0.06)',
  border: '1px solid rgba(191,227,255,0.25)',
  borderRadius: 4,
  color: '#bfe3ff',
}

const actionStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: 1,
  textTransform: 'uppercase',
  opacity: 0.65,
}

const rulesStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontSize: 11,
  opacity: 0.45,
}

const footerStyle: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.5,
  opacity: 0.28,
}

const startButtonStyle: CSSProperties = {
  padding: '12px 42px',
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 4,
  textTransform: 'uppercase',
  background: 'rgba(63,214,255,0.08)',
  border: '1px solid #3fd6ff',
  borderRadius: 3,
  color: '#3fd6ff',
  boxShadow: '0 0 22px rgba(63,214,255,0.18)',
  cursor: 'pointer',
}
