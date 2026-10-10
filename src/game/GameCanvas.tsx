import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'
import { useShipController } from '../physics/useShipController'
import { useThrottleController } from '../physics/useThrottleController'
import { useWeaponController } from '../physics/useWeaponController'
import { usePauseController } from '../physics/usePauseController'
import { audioEngine } from '../audio/AudioEngine'
import { generateStars, type Star } from '../render/drawStarfield'
import { loadSprites } from '../render/loadSprites'
import { getLevel, computeLevelSegments, activeSegment } from '../levels/levels'
import { createWorld, resetWorldForRun } from './world'
import { updatePlaying, updateSuckedIn } from './updateGame'
import { createCameraFrame, updateCameraFrame } from './camera'
import { renderFrame } from './renderFrame'

const STAR_COUNT = 320
// clamp long frames (tab switches, GC pauses) so physics never tunnels
const MAX_FRAME_SECONDS = 0.05

export function GameCanvas() {
  useShipController()
  useThrottleController()
  useWeaponController()
  usePauseController()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const world = createWorld()
    const frame = createCameraFrame()
    const sprites = loadSprites()
    let stars: Star[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      stars = generateStars(STAR_COUNT, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let animationFrame = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      animationFrame = requestAnimationFrame(loop)
      const dt = Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS)
      lastTime = now
      const time = now / 1000
      const store = useGameStore.getState()

      // paused: freeze the frame exactly as it is, do nothing else
      if (store.paused) return

      if (store.shipWorldX < world.prevWorldX - 1) resetWorldForRun(world)
      world.prevWorldX = store.shipWorldX

      const level = getLevel(store.level)
      const layout = activeSegment(computeLevelSegments(level), store.shipWorldX)

      // crossing from one hole's segment into the next — re-arm the warning
      // and the fuel cache for the new approach
      if (world.lastSegmentHoleX !== null && world.lastSegmentHoleX !== layout.blackHoleX) {
        world.approachArmed = false
        world.fuelCacheTaken = false
      }
      world.lastSegmentHoleX = layout.blackHoleX

      const frameCtx = { level, layout, dt, time, now }
      if (store.status === 'playing') updatePlaying(world, frameCtx)
      else if (store.status === 'sucked-in') updateSuckedIn(world, dt)

      const latest = useGameStore.getState()
      updateCameraFrame(
        frame,
        world,
        layout,
        {
          shipWorldX: latest.shipWorldX,
          shipLateral: latest.shipLateral,
          suckedIn: latest.status === 'sucked-in',
        },
        canvas.width,
        canvas.height,
        dt,
      )
      audioEngine.setRumble(frame.holeShake)

      renderFrame({ ctx, frame, world, level, layout, store: latest, sprites, stars, time, now })
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />
}
