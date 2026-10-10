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
import { createCameraFrame, shipScreenXRatio, updateCameraFrame } from './camera'
import { renderFrame } from './renderFrame'
import { stepFeedback } from './feedback'
import { ageEffects } from './renderEffects'

const STAR_COUNT = 320
// clamp long frames (tab switches, GC pauses) so physics never tunnels
const MAX_FRAME_SECONDS = 0.05
const MAX_DPR = 2

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

    const { boostRequestId, fireRequestId } = useGameStore.getState()
    const world = createWorld({ boost: boostRequestId, fire: fireRequestId })
    const frame = createCameraFrame()
    const sprites = loadSprites()
    let stars: Star[] = []
    let viewWidth = 0
    let viewHeight = 0
    // resizing clears the canvas; while paused the loop doesn't draw, so the
    // last frame has to be repainted once or the pause menu sits on black
    let lastRender: Parameters<typeof renderFrame>[0] | null = null
    let redrawWhilePaused = false

    // The backing store follows devicePixelRatio (capped for fill-rate on
    // phones) so sprites and lines stay crisp; everything else draws in CSS
    // pixels under a matching transform.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      viewWidth = window.innerWidth
      viewHeight = window.innerHeight
      canvas.width = Math.round(viewWidth * dpr)
      canvas.height = Math.round(viewHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = generateStars(STAR_COUNT, viewWidth, viewHeight)
      frame.shipXRatio = shipScreenXRatio()
      redrawWhilePaused = true
    }
    resize()
    window.addEventListener('resize', resize)

    let animationFrame = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      animationFrame = requestAnimationFrame(loop)
      const realDt = Math.min((now - lastTime) / 1000, MAX_FRAME_SECONDS)
      lastTime = now
      const store = useGameStore.getState()

      // paused: freeze the frame exactly as it is; silence the hole's rumble
      if (store.paused) {
        audioEngine.setRumble(0)
        if (redrawWhilePaused && lastRender) renderFrame({ ...lastRender, stars })
        redrawWhilePaused = false
        return
      }

      if (store.shipWorldX < world.prevWorldX - 1) resetWorldForRun(world)
      world.prevWorldX = store.shipWorldX

      const level = getLevel(store.level)
      const segments = computeLevelSegments(level)
      const layout = activeSegment(segments, store.shipWorldX)

      // crossing from one hole's segment into the next — re-arm the warning,
      // the fuel cache and the skim tracking for the new approach
      if (world.lastSegmentHoleX !== null && world.lastSegmentHoleX !== layout.blackHoleX) {
        world.approachArmed = false
        world.fuelCacheTaken = false
        world.segmentMinGap = Infinity
      }
      world.lastSegmentHoleX = layout.blackHoleX

      // hit-stop and slow-mo scale the simulation, never the real clock
      const dt = realDt * stepFeedback(world.feedback, realDt, now / 1000)
      world.simTime += dt

      if (store.status === 'playing') {
        updatePlaying(world, {
          level,
          layout,
          segments,
          levelEndX: segments[segments.length - 1].levelEndX,
          dt,
        })
      } else if (store.status === 'sucked-in') {
        updateSuckedIn(world, dt)
      }
      world.particles.step(dt)
      ageEffects(world)

      const latest = useGameStore.getState()
      updateCameraFrame(
        frame,
        world,
        layout,
        {
          shipWorldX: latest.shipWorldX,
          shipLateral: latest.shipLateral,
          shipSpeed: latest.shipForwardSpeed,
          suckedIn: latest.status === 'sucked-in',
        },
        viewWidth,
        viewHeight,
        realDt,
      )
      world.viewScale = frame.scale
      audioEngine.setRumble(frame.holeShake)

      lastRender = { ctx, frame, world, level, layout, store: latest, sprites, stars, time: world.simTime }
      renderFrame(lastRender)
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
      audioEngine.setRumble(0)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />
}
