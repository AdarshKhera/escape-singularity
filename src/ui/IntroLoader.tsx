import { useEffect, useRef } from 'react'
import { drawBlackHole } from '../render/drawBlackHole'
import { shipThrustFrameSrc } from '../render/shipSkins'
import { FONT_DISPLAY } from './fonts'

interface IntroLoaderProps {
  onFinish: () => void
}

const DURATION_MS = 2600

// A one-time boot animation: the ship spirals into a black hole before the
// title screen appears, establishing the game's premise before a word of UI
// shows up.
export function IntroLoader({ onFinish }: IntroLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const ship = new Image()
    ship.src = shipThrustFrameSrc('scout', 'full', 0)

    let raf = 0
    const start = performance.now()

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const render = (now: number) => {
      const elapsed = now - start
      const t = Math.min(elapsed / DURATION_MS, 1)
      const width = canvas.width
      const height = canvas.height
      const cx = width / 2
      const cy = height / 2

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)

      const holeRadius = 18 + t * Math.min(width, height) * 0.24
      drawBlackHole(ctx, { x: cx, y: cy, radius: holeRadius, time: elapsed / 1000 })

      // ship spirals inward from the edge, shrinking as it nears the horizon
      const spiralT = Math.min(t / 0.85, 1)
      const eased = spiralT * spiralT
      const startRadius = Math.hypot(width, height) * 0.42
      const radiusNow = startRadius * (1 - eased)
      const angle = spiralT * Math.PI * 4.2
      const sx = cx + Math.cos(angle) * radiusNow
      const sy = cy + Math.sin(angle) * radiusNow * 0.6
      const shipScale = Math.max(1 - eased, 0.05)

      if (spiralT < 1 && ship.complete && ship.naturalWidth > 0) {
        const size = 46 * shipScale
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(angle + Math.PI / 2)
        ctx.globalAlpha = Math.max(1 - eased * 1.1, 0)
        ctx.drawImage(ship, -size / 2, -size / 2, size, size)
        ctx.restore()
      }

      if (t < 1) {
        raf = requestAnimationFrame(render)
      } else {
        onFinish()
      }
    }

    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          bottom: '14%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 8,
          color: '#6fa8d8',
          opacity: 0.6,
          textTransform: 'uppercase',
        }}
      >
        Arehk Games
      </div>
    </div>
  )
}
