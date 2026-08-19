interface PixelHeartProps {
  filled: boolean
  size?: number
}

// An 8x7 pixel-art heart, drawn as a blocky SVG grid rather than a smooth
// vector shape, to match the game's pixel-art asset pack.
const HEART_ROWS = [
  '.11.11.',
  '1111111',
  '1111111',
  '1111111',
  '.11111.',
  '..111..',
  '...1...',
]

export function PixelHeart({ filled, size = 16 }: PixelHeartProps) {
  const fillColor = filled ? '#ff5d7a' : 'transparent'
  const strokeColor = filled ? '#ff8fa3' : 'rgba(232,236,245,0.25)'

  return (
    <svg width={size} height={size} viewBox={`0 0 7 7`} shapeRendering="crispEdges">
      {HEART_ROWS.map((row, y) =>
        row.split('').map((cellValue, x) => {
          if (cellValue === '.') return null
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={0.06}
            />
          )
        }),
      )}
    </svg>
  )
}
