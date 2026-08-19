import { type CSSProperties } from 'react'
import { SHIP_SKINS, shipThrustFrameSrc } from '../render/shipSkins'

interface ShipSelectorProps {
  selectedId: string
  onSelect: (id: string) => void
}

const PREVIEW_SIZE = 96

// One ship at a time with left/right paging, rather than every option at once.
export function ShipSelector({ selectedId, onSelect }: ShipSelectorProps) {
  const index = Math.max(
    0,
    SHIP_SKINS.findIndex((s) => s.id === selectedId),
  )
  const skin = SHIP_SKINS[index]

  const step = (delta: number) => {
    const next = (index + delta + SHIP_SKINS.length) % SHIP_SKINS.length
    onSelect(SHIP_SKINS[next].id)
  }

  return (
    <div style={wrapStyle}>
      <button style={arrowStyle} onClick={() => step(-1)} aria-label="Previous ship">
        ‹
      </button>

      <div style={stageStyle}>
        <img
          src={shipThrustFrameSrc(skin.prefix, 'full', 1)}
          alt={skin.label}
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          style={{ imageRendering: 'pixelated' }}
        />
        <div style={nameStyle}>{skin.label}</div>
        <div style={detailStyle}>{skin.detail}</div>
        <div style={dotsStyle}>
          {SHIP_SKINS.map((s, i) => (
            <span
              key={s.id}
              style={{
                ...dotStyle,
                background: i === index ? '#3fd6ff' : 'rgba(191,227,255,0.25)',
              }}
            />
          ))}
        </div>
      </div>

      <button style={arrowStyle} onClick={() => step(1)} aria-label="Next ship">
        ›
      </button>
    </div>
  )
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
}

const stageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 170,
}

const nameStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 12,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: '#3fd6ff',
}

const detailStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 9,
  opacity: 0.5,
}

const dotsStyle: CSSProperties = {
  display: 'flex',
  gap: 5,
  marginTop: 2,
}

const dotStyle: CSSProperties = {
  width: 5,
  height: 5,
  borderRadius: '50%',
  display: 'inline-block',
}

const arrowStyle: CSSProperties = {
  width: 32,
  height: 32,
  fontFamily: 'monospace',
  fontSize: 18,
  lineHeight: 1,
  background: 'transparent',
  border: '1px solid rgba(191,227,255,0.25)',
  borderRadius: 4,
  color: '#bfe3ff',
  cursor: 'pointer',
}
