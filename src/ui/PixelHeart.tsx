interface PixelHeartProps {
  filled: boolean
  size?: number
}

// A clean vector heart: solid white when it is a life you still have, a faint
// outline when it is spent. (Kept under its original name so callers don't
// change; it is no longer pixel art.)
const HEART_PATH =
  'M12 21.2 3.9 13.1A5.2 5.2 0 0 1 11.2 5.7L12 6.5l.8-.8a5.2 5.2 0 0 1 7.3 7.4Z'

export function PixelHeart({ filled, size = 16 }: PixelHeartProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={filled ? { filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.45))' } : undefined}
    >
      <path
        d={HEART_PATH}
        fill={filled ? '#ffffff' : 'transparent'}
        stroke={filled ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}
