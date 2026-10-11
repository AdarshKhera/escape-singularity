interface PixelHeartProps {
  filled: boolean
  size?: number
}

// A clean vector heart: neon rose when it is a life you still have, a faint
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
      style={filled ? { filter: 'drop-shadow(0 0 4px rgba(255, 92, 140, 0.55))' } : undefined}
    >
      <path
        d={HEART_PATH}
        fill={filled ? '#ff5c8c' : 'transparent'}
        stroke={filled ? '#ffa3bd' : 'rgba(231, 233, 238, 0.28)'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  )
}
