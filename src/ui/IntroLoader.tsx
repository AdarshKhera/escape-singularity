import { useEffect, useRef, useState } from 'react'
import { drawBlackHole } from '../render/drawBlackHole'
import { EMBER } from '../render/holePalette'
import { preloadAssets } from '../render/preload'
import { getShipSkin, shipThrustFrameSrc } from '../render/shipSkins'
import { useGameStore } from '../state/gameStore'
import './intro.css'

interface IntroLoaderProps {
  onFinish: () => void
}

// the intro always plays at least this long, and ends once the assets are in
const MIN_MS = 3400
const FADE_MS = 520
// taps skip the intro, but not in the first instant (a stray tap on load)
const SKIP_AFTER_MS = 700
const STAR_COUNT = 150

interface Star {
  x: number
  y: number
  r: number
  phase: number
}

function makeStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.2 + 0.3,
    phase: Math.random() * Math.PI * 2,
  }))
}

function smoothstep(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

// Boot screen: a small, soft hole on the horizon swells into a vast arc (the
// same approach the game itself makes) while the player's ship arcs over it,
// the title settles in, and a hairline fills as the sprites and fonts load.
export function IntroLoader({ onFinish }: IntroLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const readyRef = useRef(false)
  const leavingRef = useRef(false)
  const startRef = useRef(performance.now())

  useEffect(() => {
    const handle = preloadAssets(setProgress)
    void handle.done.then(() => {
      readyRef.current = true
      setProgress(1)
    })
  }, [])

  useEffect(() => {
    const leave = () => {
      if (leavingRef.current) return
      leavingRef.current = true
      setLeaving(true)
      window.setTimeout(onFinish, FADE_MS)
    }
    const skip = () => {
      if (performance.now() - startRef.current > SKIP_AFTER_MS) leave()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerup', skip)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      leave()
      return () => {
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('pointerup', skip)
      }
    }

    const ship = new Image()
    ship.src = shipThrustFrameSrc(getShipSkin(useGameStore.getState().shipSkinId).prefix, 'full', 0)
    const stars = makeStars()
    let raf = 0

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
      const elapsed = now - startRef.current
      const w = window.innerWidth
      const h = window.innerHeight
      const t = elapsed / 1000
      // the hole's rise: 0 at the start, 1 at the end of the swell
      const rise = smoothstep((elapsed - 200) / (MIN_MS - 400))
      const grow = Math.pow(rise, 1.8)

      ctx.fillStyle = '#050506'
      ctx.fillRect(0, 0, w, h)

      const fadeIn = smoothstep(elapsed / 700)
      ctx.fillStyle = '#e2e6ee'
      for (const s of stars) {
        ctx.globalAlpha = fadeIn * (0.3 + 0.45 * Math.sin(t * 1.4 + s.phase) ** 2)
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      const holeR = Math.min(w * 0.26, h * 0.34) * (0.12 + 0.88 * grow)
      const holeX = w * (0.8 - 0.03 * grow)
      const holeY = h * (0.46 + 0.05 * grow)
      drawBlackHole(ctx, {
        x: holeX,
        y: holeY,
        radius: holeR,
        time: t,
        disk: 1,
        streams: 6,
        palette: EMBER,
        focus: 0.25 + 0.75 * smoothstep((rise - 0.1) / 0.8),
      })

      // the ship arcs in from the left, over the rim and out the far side
      const u = smoothstep((elapsed - 500) / (MIN_MS - 300))
      if (u > 0 && u < 1 && ship.complete && ship.naturalWidth > 0) {
        const sx = -60 + (w + 120) * u
        const lift = Math.sin(Math.PI * u)
        const sy = holeY - holeR * (0.2 + 1.55 * lift) - h * 0.02
        const size = Math.max(34, Math.min(w, h) * 0.085)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(Math.cos(Math.PI * u) * -0.35)
        ctx.globalAlpha = Math.min(u * 6, 1) * Math.min((1 - u) * 6, 1)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(ship, -size / 2, -size / 2, size, size)
        ctx.restore()
      }

      if (elapsed >= MIN_MS && readyRef.current) leave()
    }
    raf = requestAnimationFrame(render)

    // the exit must not hang on frame rate (a throttled or backgrounded page
    // may barely run animation frames), so it is also checked on a timer
    const exitCheck = window.setInterval(() => {
      if (performance.now() - startRef.current >= MIN_MS && readyRef.current) leave()
    }, 200)

    return () => {
      window.clearInterval(exitCheck)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerup', skip)
    }
  }, [onFinish])

  const percent = Math.round(progress * 100)

  return (
    <div className="es-intro-screen" data-leaving={leaving}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="es-boot__studio">Arehk Games</div>
      <div className="es-boot__title">
        <span>ESCAPE</span>
        <span>SINGULARITY</span>
      </div>
      <div className="es-boot__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span>{percent < 100 ? 'Loading' : 'Ready'}</span>
        <span className="es-boot__track">
          <span className="es-boot__fill" style={{ width: `${percent}%` }} />
        </span>
        <span className="es-boot__skip">{percent}%</span>
      </div>
    </div>
  )
}
