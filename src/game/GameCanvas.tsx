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
import { qualitySettings, sampleFrame } from './quality'
import { beginAttempt } from './visualState'
import { stepFlourish } from './flourish'
import { computeVictoryT } from './renderBackground'
import { clearTutorialPrompt } from './tutorialSystem'

const STAR_COUNT = 360
// clamp long frames (tab switches, GC pauses) so physics never tunnels
const MAX_FRAME_SECONDS = 0.05
// extra star scroll on the victory burn, px/s at parallax depth 1
const VICTORY_SCROLL = 14000

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

    const { boostRequestId, fireRequestId, level: startLevel } = useGameStore.getState()
    const world = createWorld({ boost: boostRequestId, fire: fireRequestId })
    beginAttempt(world.visuals, startLevel)
    world.particles.limit = qualitySettings(world.quality).particleBudget
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
      const dpr = Math.min(window.devicePixelRatio || 1, qualitySettings(world.quality).maxDpr)
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
    let lastCameraY = 0

    // how the attempt ended, so a retry's ghost knows whether to mark a crash
    const trackOutcome = (status: string) => {
      if (status === 'life-lost' || status === 'game-over' || status === 'sucked-in') {
        world.visuals.outcome = 'died'
      } else if (status === 'level-complete') {
        world.visuals.outcome = 'cleared'
      }
    }

    // a device that can't hold the frame rate sheds effects, then pixels
    const adaptQuality = (frameMs: number) => {
      // a hidden or backgrounded page is throttled by the browser, not slow
      if (document.hidden || !document.hasFocus()) return
      if (!sampleFrame(world.quality, frameMs)) return
      const settings = qualitySettings(world.quality)
      world.particles.limit = settings.particleBudget
      resize()
    }

    const loop = (now: number) => {
      animationFrame = requestAnimationFrame(loop)
      const frameMs = now - lastTime
      const realDt = Math.min(frameMs / 1000, MAX_FRAME_SECONDS)
      lastTime = now
      const store = useGameStore.getState()

      // paused: freeze the frame exactly as it is; silence the hole's rumble
      if (store.paused) {
        audioEngine.setRumble(0)
        if (redrawWhilePaused && lastRender) renderFrame({ ...lastRender, stars, dt: 0 })
        redrawWhilePaused = false
        return
      }
      adaptQuality(frameMs)

      // the run rewound: a respawn, a retry or a new level
      if (store.shipWorldX < world.prevWorldX - 1) {
        resetWorldForRun(world)
        beginAttempt(world.visuals, store.level)
      }
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
      trackOutcome(latest.status)
      if (latest.status !== 'playing' && world.tutorial.active) clearTutorialPrompt(world.tutorial)
      const travelled = latest.shipWorldX - store.shipWorldX
      if (dt > 0) frame.cameraVx = travelled / dt
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

      // parallax follows the camera's real travel, plus extra rush on streaks
      const streakScroll = stepFlourish(world, latest.status, latest.shipWorldX, latest.shipLateral, realDt)
      world.visuals.parallaxX +=
        travelled * frame.scale + streakScroll + computeVictoryT(latest, layout) * VICTORY_SCROLL * realDt
      world.visuals.parallaxY += (frame.cameraWorldY - lastCameraY) * frame.scale
      lastCameraY = frame.cameraWorldY

      lastRender = { ctx, frame, world, level, layout, store: latest, sprites, stars, time: world.simTime, dt }
      renderFrame(lastRender)
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
      audioEngine.setRumble(0)
      clearTutorialPrompt(world.tutorial)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />
}
