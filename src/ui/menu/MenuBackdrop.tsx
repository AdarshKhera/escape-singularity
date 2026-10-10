import { useEffect, useRef } from 'react'
import { drawBlackHole } from '../../render/drawBlackHole'
import { getShipSkin, shipThrustFrameSrc } from '../../render/shipSkins'

interface MenuBackdropProps {
  shipSkinId: string
}

interface Star {
  x: number
  y: number
  r: number
  speed: number
  phase: number
}

const FRAME_MS = 1000 / 30
const STAR_COUNT = 140

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.1 + 0.3,
    speed: Math.random() * 0.006 + 0.002,
    phase: Math.random() * Math.PI * 2,
  }))
}

// Cheap ambient scene behind the menus: drifting stars, the black hole on the
// right and the selected ship holding position just outside its pull. Capped
// at 30fps and stopped while the tab is hidden.
export function MenuBackdrop({ shipSkinId }: MenuBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shipRef = useRef<HTMLImageElement[]>([])

  useEffect(() => {
    const prefix = getShipSkin(shipSkinId).prefix
    shipRef.current = [0, 1, 2, 3].map((i) => {
      const img = new Image()
      img.src = shipThrustFrameSrc(prefix, 'full', i)
      return img
    })
  }, [shipSkinId])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const stars = makeStars()
    let raf = 0
    let last = 0
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = (now: number) => {
      raf = requestAnimationFrame(render)
      if (now - last < FRAME_MS || document.hidden) return
      last = now
      const t = (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight
      const holeX = w * 0.74
      const holeY = h * 0.5
      const holeR = Math.min(w, h) * 0.2

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      for (const s of stars) {
        // stars slide toward the hole, a quiet hint of the pull
        s.x += (holeX / w - s.x) * s.speed * 0.05
        s.y += (holeY / h - s.y) * s.speed * 0.05
        const dx = s.x * w - holeX
        const dy = s.y * h - holeY
        if (Math.hypot(dx, dy) < holeR * 1.1) {
          s.x = Math.random() < 0.5 ? 0 : Math.random()
          s.y = Math.random()
        }
        const twinkle = 0.45 + 0.4 * Math.sin(t * 1.6 + s.phase)
        ctx.fillStyle = `rgba(214, 228, 255, ${twinkle})`
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      drawBlackHole(ctx, { x: holeX, y: holeY, radius: holeR, time: t })

      const frame = shipRef.current[Math.floor(t * 10) % 4]
      if (frame?.complete && frame.naturalWidth > 0) {
        const size = Math.max(40, Math.min(w, h) * 0.14)
        const sx = holeX + holeR * 1.55 + Math.sin(t * 0.6) * 6
        const sy = holeY - holeR * 1.45 + Math.sin(t * 0.9) * 8
        ctx.save()
        ctx.translate(sx, sy)
        // sprite faces right: the ship has just slipped past the hole
        ctx.rotate(-0.18 + Math.sin(t * 0.7) * 0.05)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(frame, -size / 2, -size / 2, size, size)
        ctx.restore()
      }
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="es-menu__backdrop" aria-hidden="true" />
}
