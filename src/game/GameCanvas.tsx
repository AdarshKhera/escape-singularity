import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'
import { useShipController } from '../physics/useShipController'
import { useThrottleController } from '../physics/useThrottleController'
import { useWeaponController } from '../physics/useWeaponController'
import { usePauseController } from '../physics/usePauseController'
import { computeBlackHolePull, computePlanetPull } from '../physics/gravity'
import { audioEngine } from '../audio/AudioEngine'
import {
  BLOCKADE_RADIUS,
  BOOST_COOLDOWN_SECONDS,
  BOOST_SECONDS,
  BOOST_SPEED_ADD,
  FUEL_CACHE_RADIUS,
  FUEL_MAX,
  GUIDE_FLASH_SECONDS,
  LANE_BOUND,
  CRUISE_LANE_BOUND,
  BELT_ROCK_RADIUS_MIN,
  BELT_ROCK_RADIUS_MAX,
  BELT_ROCK_SPACING,
  BELT_ROCK_COUNT,
  BELT_ROCK_HITS,
  LATERAL_DAMPING,
  PICKUP_BOOST_MULTIPLIER,
  PICKUP_BOOST_SECONDS,
  REFERENCE_SPEED,
  ROCKET_PICKUP_RADIUS,
  ROCKET_SPEED,
  SATELLITE_FUEL_REWARD,
  SHIELD_PICKUP_RADIUS,
  SHIELD_UNLOCK_LEVEL,
  SHIP_RADIUS,
  STEER_ACCEL,
  STEER_FUEL_DRAIN_PER_SECOND,
  SUCK_IN_SECONDS,
  THROTTLE_ACCEL_RATE,
  THROTTLE_BRAKE_FLOOR,
  THROTTLE_BRAKE_RATE,
  THROTTLE_DECAY_RATE,
  THROTTLE_IDLE_SPEED,
  THROTTLE_MAX_SPEED,
  THRUST_FUEL_DRAIN_PER_SECOND,
  STRUGGLE_SHIP_SHRINK,
  WEAPON_UNLOCK_LEVEL,
  VICTORY_SPEED_MULTIPLIER,
  VICTORY_STREAK_RAMP,
  computeApproachT,
  computeExitDrag,
  computeHorizonScale,
  computeOrbitOffset,
  computeRevealT,
  computeShakeAmount,
  computeStruggleT,
  resolvePhase,
} from '../levels/worldConfig'
import { drawBackdrop, getBackdropTheme } from '../render/drawBackdrop'
import {
  applySuckInZoomOut,
  computeCameraScale,
  computeCameraWorldY,
  computeScreenCentreY,
} from '../render/cameraScale'
import { generateStars, drawStarfield, type Star } from '../render/drawStarfield'
import { drawVoidDarkness } from '../render/drawVoidDarkness'
import { drawBlackHole } from '../render/drawBlackHole'
import { drawGuidePath } from '../render/drawGuidePath'
import { drawShip } from '../render/drawShip'
import { drawAsteroid } from '../render/drawAsteroid'
import { drawSatellite } from '../render/drawSatellite'
import { drawSpeedBooster } from '../render/drawSpeedBooster'
import { drawBlockade } from '../render/drawBlockade'
import { drawPlanet } from '../render/drawPlanet'
import { drawSpeedLines } from '../render/drawSpeedLines'
import { drawFuelCache } from '../render/drawFuelCache'
import { drawPlanetLabel } from '../render/drawPlanetLabel'
import { drawBlackHoleLabel } from '../render/drawBlackHoleLabel'
import { drawRocketPickup } from '../render/drawRocketPickup'
import { drawShieldPickup } from '../render/drawShieldPickup'
import { drawShipShield } from '../render/drawShipShield'
import { drawRocketProjectile } from '../render/drawRocketProjectile'
import { drawExplosion } from '../render/drawExplosion'
import { drawPickupLabel } from '../render/drawPickupLabel'
import { drawMoon } from '../render/drawMoon'
import {
  getShipSpriteSet,
  loadSprites,
  pickAsteroidSprite,
  pickPlanetSprite,
  pickMoonSprite,
} from '../render/loadSprites'
import { damageTierForLives } from '../render/shipSkins'
import { getLevel, computeLevelSegments, activeSegment } from '../levels/levels'
import { FLYBY_TRIGGER_RANGE } from '../levels/planets'

// Deterministic pseudo-random in [0, 1) — used for belt pickup placement so
// it lands somewhere different-feeling per belt, but identically on every
// respawn of the same run rather than re-rolling and possibly stranding the
// player without ammo.
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const INVULNERABLE_SECONDS = 1.4
const SHIP_SCREEN_X_RATIO = 0.16
// the approach warning fires this far ahead of the pull window opening
const EARLY_WARNING_LEAD = 2600

type ObstacleType =
  | 'asteroid'
  | 'satellite'
  | 'booster'
  | 'blockade'
  | 'rocketPickup'
  | 'shieldPickup'
  | 'moon'

interface Obstacle {
  id: number
  type: ObstacleType
  worldX: number
  worldY: number
  radius: number
  seed: number
  reinforced?: boolean
  hitsRemaining?: number
}

interface Projectile {
  id: number
  worldX: number
  worldY: number
}

interface Explosion {
  id: number
  worldX: number
  worldY: number
  startTime: number
}

export function GameCanvas() {
  useShipController()
  useThrottleController()
  useWeaponController()
  usePauseController()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const spritesRef = useRef(loadSprites())
  const obstaclesRef = useRef<Obstacle[]>([])
  const nextSpawnWorldXRef = useRef(2200)
  const nextObstacleIdRef = useRef(0)
  const invulnerableTimerRef = useRef(0)
  const suckInElapsedRef = useRef(0)
  const escapeSideRef = useRef<-1 | 1>(-1)
  const prevWorldXRef = useRef(0)
  const guideFlashRef = useRef(0)
  const approachArmedRef = useRef(false)
  const lastSegmentHoleXRef = useRef<number | null>(null)
  const boostTimerRef = useRef(0)
  const smoothedBoostRef = useRef(0)
  const boostCooldownRef = useRef(0)
  const lastBoostRequestIdRef = useRef(0)
  const fuelCacheTakenRef = useRef(false)
  const refuelMessageTimerRef = useRef(0)
  const pickupBoostTimerRef = useRef(0)
  const spawnedBlockadesRef = useRef<Set<number>>(new Set())
  const spawnedEscortsRef = useRef<Set<number>>(new Set())
  const spawnedBeltsRef = useRef<Set<number>>(new Set())
  const projectilesRef = useRef<Projectile[]>([])
  const nextProjectileIdRef = useRef(0)
  const lastFireRequestIdRef = useRef(0)
  const explosionsRef = useRef<Explosion[]>([])
  const nextExplosionIdRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      starsRef.current = generateStars(320, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    let animationFrame: number
    let lastTime = performance.now()

    const loop = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      const time = now / 1000

      const store = useGameStore.getState()
      const width = canvas.width
      const height = canvas.height

      // paused: freeze the frame exactly as it is, do nothing else
      if (store.paused) {
        animationFrame = requestAnimationFrame(loop)
        return
      }

      // a run restart rewinds worldX; clear the field with it
      if (store.shipWorldX < prevWorldXRef.current - 1) {
        obstaclesRef.current = []
        nextSpawnWorldXRef.current = 2200
        suckInElapsedRef.current = 0
        guideFlashRef.current = 0
        approachArmedRef.current = false
        lastSegmentHoleXRef.current = null
        boostTimerRef.current = 0
        smoothedBoostRef.current = 0
        boostCooldownRef.current = 0
        fuelCacheTakenRef.current = false
        refuelMessageTimerRef.current = 0
        pickupBoostTimerRef.current = 0
        spawnedBlockadesRef.current.clear()
        spawnedEscortsRef.current.clear()
        spawnedBeltsRef.current.clear()
        projectilesRef.current = []
        explosionsRef.current = []
      }
      prevWorldXRef.current = store.shipWorldX

      const levelConfig = getLevel(store.level)
      const segments = computeLevelSegments(levelConfig)
      const layout = activeSegment(segments, store.shipWorldX)

      // crossing from one hole's segment into the next — re-arm the warning
      // and the fuel cache for the new approach rather than treating them as
      // already spent
      if (
        lastSegmentHoleXRef.current !== null &&
        lastSegmentHoleXRef.current !== layout.blackHoleX
      ) {
        approachArmedRef.current = false
        fuelCacheTakenRef.current = false
      }
      lastSegmentHoleXRef.current = layout.blackHoleX

      if (store.status === 'playing') {
        const shipWorldX = store.shipWorldX
        const phase = resolvePhase(shipWorldX, layout)
        if (phase !== store.phase) store.setPhase(phase)

        const distanceToHole = layout.blackHoleX - shipWorldX

        // warn well before the pull window actually opens, so the player has
        // time to read it and choose a line rather than react to it
        if (
          !approachArmedRef.current &&
          shipWorldX >= layout.approachStartX - EARLY_WARNING_LEAD
        ) {
          approachArmedRef.current = true
          guideFlashRef.current = GUIDE_FLASH_SECONDS
        }
        if (guideFlashRef.current > 0) guideFlashRef.current -= delta
        if (refuelMessageTimerRef.current > 0) refuelMessageTimerRef.current -= delta

        let banner: string | null = null
        if (refuelMessageTimerRef.current > 0) {
          banner = 'FUEL CACHE COLLECTED'
        } else if (guideFlashRef.current > 0) {
          banner = 'BLACK HOLE APPROACHING'
        } else if (phase === 'escape') {
          banner = 'ESCAPING'
        } else if (phase === 'clear') {
          banner = 'COURSE CORRECTED'
        }
        if (banner !== store.bannerMessage) store.setBannerMessage(banner)

        // lock in which way the player committed, for the guide path
        if (phase === 'approach' && store.shipLateral !== 0) {
          escapeSideRef.current = store.shipLateral < 0 ? -1 : 1
        }

        const gravityPullY = computeBlackHolePull(
          store.shipLateral,
          distanceToHole,
          levelConfig.maxPull,
          levelConfig.pullRange,
        )

        let planetPullY = 0
        for (const planet of levelConfig.planets) {
          const dxPlanet = shipWorldX - planet.worldX
          const influence = planet.influenceRadius ?? planet.radius * 6
          if (Math.abs(dxPlanet) < influence) {
            const orbitY =
              planet.worldY + computeOrbitOffset(planet.worldX, layout.blackHoleX, time, planet.worldX)
            planetPullY += computePlanetPull(
              store.shipLateral - orbitY,
              dxPlanet,
              planet.pullStrength,
            )
          }
        }

        // the single pre-approach fuel cache — must actually be flown through
        if (!fuelCacheTakenRef.current) {
          const cacheDx = layout.fuelCacheX - shipWorldX
          const cacheDy = 0 - store.shipLateral
          if (Math.hypot(cacheDx, cacheDy) < FUEL_CACHE_RADIUS + SHIP_RADIUS) {
            fuelCacheTakenRef.current = true
            store.addFuel(FUEL_MAX)
            refuelMessageTimerRef.current = 1.6
          }
        }

        // Fuel drains from thrusting and from steering — braking is the only
        // free state. There is no passive regen: once spent, fuel stays spent
        // until a pickup or the scripted top-off restores it. Run dry and
        // steering simply stops working; thrust still decays toward idle on
        // its own via the throttle model below, so an empty tank does not
        // strand the ship, just leaves it unable to fight the pull.
        const wantsToSteer = store.bankInput !== 0
        const wantsToThrust = store.throttleInput > 0
        const pickupBoosting = pickupBoostTimerRef.current > 0
        if (pickupBoostTimerRef.current > 0) pickupBoostTimerRef.current -= delta
        const drainRate =
          (wantsToThrust && !pickupBoosting ? THRUST_FUEL_DRAIN_PER_SECOND : 0) +
          (wantsToSteer ? STEER_FUEL_DRAIN_PER_SECOND : 0)

        if (drainRate > 0 && store.fuel > 0) {
          store.drainFuel(drainRate * delta)
        }

        const steerAccelY = wantsToSteer && store.fuel > 0 ? store.bankInput * STEER_ACCEL : 0

        // breaking free costs extra drag for a short stretch, so clearing the
        // hole takes visible effort rather than snapping to a fast coast
        const exitDrag = computeExitDrag(shipWorldX, layout.blackHoleX)

        let lateralVelocity = store.shipLateralVelocity
        lateralVelocity += (gravityPullY + planetPullY + steerAccelY) * delta
        lateralVelocity -= lateralVelocity * LATERAL_DAMPING * (1 + exitDrag) * delta

        let lateral = store.shipLateral + lateralVelocity * delta
        // the camera can't follow this far off-centre before the approach
        // opens up, so cruise flight gets a tighter lane than the escape does
        const laneBound = shipWorldX <= layout.revealStartX ? CRUISE_LANE_BOUND : LANE_BOUND
        if (Math.abs(lateral) > laneBound) {
          lateral = Math.sign(lateral) * laneBound
          lateralVelocity = 0
        }

        // throttle: forward flight is held, not automatic — releasing it
        // bleeds speed toward an idle drift, braking bleeds it further
        if (
          store.boostRequestId !== lastBoostRequestIdRef.current &&
          boostTimerRef.current <= 0 &&
          boostCooldownRef.current <= 0
        ) {
          boostTimerRef.current = BOOST_SECONDS
        }
        lastBoostRequestIdRef.current = store.boostRequestId

        const wasBoosting = boostTimerRef.current > 0
        if (boostTimerRef.current > 0) boostTimerRef.current -= delta
        if (wasBoosting && boostTimerRef.current <= 0) {
          boostCooldownRef.current = BOOST_COOLDOWN_SECONDS
        }
        if (boostCooldownRef.current > 0) boostCooldownRef.current -= delta
        const boosting = boostTimerRef.current > 0

        let forwardSpeed = store.shipForwardSpeed
        // both boost sources stack: a picked-up booster raises the floor, a
        // double-tap on top of it pushes even faster rather than being capped
        const speedCeiling =
          THROTTLE_MAX_SPEED +
          (pickupBoosting ? THROTTLE_MAX_SPEED * (PICKUP_BOOST_MULTIPLIER - 1) : 0) +
          (boosting ? BOOST_SPEED_ADD : 0)
        if (phase === 'clear') {
          // clear of the hole: the burn is automatic, not player-held, so it
          // reads as a constant hard run rather than something that can stall
          forwardSpeed = THROTTLE_MAX_SPEED
        } else if (store.throttleInput > 0) {
          forwardSpeed = Math.min(speedCeiling, forwardSpeed + THROTTLE_ACCEL_RATE * delta)
        } else if (store.throttleInput < 0) {
          forwardSpeed = Math.max(THROTTLE_BRAKE_FLOOR, forwardSpeed - THROTTLE_BRAKE_RATE * delta)
        } else {
          const target = THROTTLE_IDLE_SPEED
          forwardSpeed +=
            (target - forwardSpeed) * Math.min(THROTTLE_DECAY_RATE * delta / REFERENCE_SPEED, 1)
        }
        if (boosting || pickupBoosting) {
          forwardSpeed = Math.min(speedCeiling, forwardSpeed + THROTTLE_ACCEL_RATE * delta)
        }

        const victoryBurn = phase === 'clear' ? VICTORY_SPEED_MULTIPLIER : 1

        const nextWorldX = shipWorldX + forwardSpeed * victoryBurn * delta
        store.tickShip(nextWorldX, lateral, lateralVelocity, forwardSpeed)

        if (invulnerableTimerRef.current > 0) {
          invulnerableTimerRef.current -= delta
          if (invulnerableTimerRef.current <= 0) {
            useGameStore.setState({ invulnerable: false })
          }
        }

        // debris flanks the clear central corridor, only during the cruise
        while (
          nextSpawnWorldXRef.current < Math.min(nextWorldX + 2600, levelConfig.cruiseEndX)
        ) {
          const roll = Math.random()
          const weaponsUnlocked = store.level >= WEAPON_UNLOCK_LEVEL
          const shieldsUnlocked = store.level >= SHIELD_UNLOCK_LEVEL
          let type: ObstacleType
          if (shieldsUnlocked && roll < 0.05) type = 'shieldPickup'
          else if (weaponsUnlocked && roll < 0.16) type = 'rocketPickup'
          else if (roll < 0.23) type = 'booster'
          else if (roll < 0.53) type = 'satellite'
          else type = 'asteroid'

          const side = Math.random() < 0.5 ? -1 : 1
          const corridor = levelConfig.corridorHalfWidth
          const offset = corridor + Math.random() * corridor * 1.6
          const radius =
            type === 'asteroid'
              ? 26 + Math.random() * 22
              : type === 'rocketPickup'
                ? ROCKET_PICKUP_RADIUS
                : type === 'shieldPickup'
                  ? SHIELD_PICKUP_RADIUS
                  : 20
          obstaclesRef.current.push({
            id: nextObstacleIdRef.current++,
            type,
            worldX: nextSpawnWorldXRef.current,
            worldY: side * offset,
            radius,
            seed: Math.random() * 10,
          })
          nextSpawnWorldXRef.current +=
            levelConfig.debrisSpacing + Math.random() * levelConfig.debrisSpacing * 0.85
        }

        // scripted blockades: unlike random debris, these must be dodged
        levelConfig.blockades.forEach((blockadeX, index) => {
          if (spawnedBlockadesRef.current.has(index)) return
          if (nextWorldX + 2600 < blockadeX) return
          spawnedBlockadesRef.current.add(index)
          obstaclesRef.current.push({
            id: nextObstacleIdRef.current++,
            type: 'blockade',
            worldX: blockadeX,
            worldY: 0,
            radius: BLOCKADE_RADIUS,
            seed: Math.random() * 10,
          })
        })

        // rock belts: a true wall of reinforced rocks spanning the ship's
        // full cruise reach — only a rocket opens a way through. A rocket
        // pickup is guaranteed somewhere before it, offset by a seeded
        // pseudo-random so it isn't the same trivial spot every time, but is
        // identical across respawns of the same run.
        ;(levelConfig.belts ?? []).forEach((beltX, index) => {
          if (spawnedBeltsRef.current.has(index)) return
          if (nextWorldX + 3200 < beltX) return
          spawnedBeltsRef.current.add(index)

          for (let i = 0; i < BELT_ROCK_COUNT; i++) {
            const worldY = (i - (BELT_ROCK_COUNT - 1) / 2) * BELT_ROCK_SPACING
            const radius =
              BELT_ROCK_RADIUS_MIN + seededRandom(beltX + i) * (BELT_ROCK_RADIUS_MAX - BELT_ROCK_RADIUS_MIN)
            const jitterX = (seededRandom(beltX + i * 1.9) - 0.5) * 80
            obstaclesRef.current.push({
              id: nextObstacleIdRef.current++,
              type: 'asteroid',
              worldX: beltX + jitterX,
              worldY,
              radius,
              seed: seededRandom(beltX + i * 3.7) * 10,
              reinforced: true,
              hitsRemaining: BELT_ROCK_HITS,
            })
          }

          const pickupLead = 900 + seededRandom(beltX * 1.7) * 700
          const pickupLateral = (seededRandom(beltX * 2.3) - 0.5) * 2 * (levelConfig.corridorHalfWidth + 120)
          obstaclesRef.current.push({
            id: nextObstacleIdRef.current++,
            type: 'rocketPickup',
            worldX: beltX - pickupLead,
            worldY: pickupLateral,
            radius: ROCKET_PICKUP_RADIUS,
            seed: seededRandom(beltX * 3.1),
          })
        })

        // planet escorts: rubble or a small moon riding alongside a world
        levelConfig.escorts.forEach((escort, index) => {
          if (spawnedEscortsRef.current.has(index)) return
          if (nextWorldX + 2600 < escort.worldX) return
          spawnedEscortsRef.current.add(index)
          obstaclesRef.current.push({
            id: nextObstacleIdRef.current++,
            type: escort.kind === 'moon' ? 'moon' : 'asteroid',
            worldX: escort.worldX,
            worldY: escort.worldY,
            radius: escort.kind === 'moon' ? 46 : 24,
            seed: escort.seed,
          })
        })

        obstaclesRef.current = obstaclesRef.current.filter((obstacle) => {
          if (obstacle.worldX < nextWorldX - 1200) return false

          const dx = obstacle.worldX - nextWorldX
          const dy = obstacle.worldY - lateral
          if (Math.hypot(dx, dy) > obstacle.radius + SHIP_RADIUS) return true

          if (obstacle.type === 'satellite') {
            useGameStore.getState().addFuel(SATELLITE_FUEL_REWARD)
            return false
          }
          if (obstacle.type === 'booster') {
            pickupBoostTimerRef.current = PICKUP_BOOST_SECONDS
            return false
          }
          if (obstacle.type === 'rocketPickup') {
            useGameStore.getState().addAmmo(3)
            return false
          }
          if (obstacle.type === 'shieldPickup') {
            useGameStore.getState().addShield()
            return false
          }

          // asteroid or blockade: a held shield absorbs the hit for free
          if (!useGameStore.getState().invulnerable) {
            if (useGameStore.getState().shieldCharges > 0) {
              useGameStore.getState().consumeShield()
              invulnerableTimerRef.current = INVULNERABLE_SECONDS
            } else {
              useGameStore.getState().loseLife('collision')
              invulnerableTimerRef.current = INVULNERABLE_SECONDS
            }
            return false
          }
          return true
        })

        // fire request from the weapon controller
        if (store.fireRequestId !== lastFireRequestIdRef.current) {
          lastFireRequestIdRef.current = store.fireRequestId
          if (store.hasWeapon && store.ammo > 0) {
            useGameStore.getState().consumeAmmo()
            projectilesRef.current.push({
              id: nextProjectileIdRef.current++,
              worldX: nextWorldX + SHIP_RADIUS,
              worldY: lateral,
            })
          }
        }

        // projectiles: one-shot kill on the first asteroid, moon, or blockade
        // they reach — reinforced rocks (belt walls) take BELT_ROCK_HITS hits
        // before they actually break — with a blast left behind on every hit
        projectilesRef.current = projectilesRef.current
          .map((p) => ({ ...p, worldX: p.worldX + ROCKET_SPEED * delta }))
          .filter((p) => {
            if (p.worldX > nextWorldX + 4000) return false
            const hitIndex = obstaclesRef.current.findIndex(
              (o) =>
                (o.type === 'asteroid' || o.type === 'blockade' || o.type === 'moon') &&
                Math.hypot(o.worldX - p.worldX, o.worldY - p.worldY) < o.radius + 6,
            )
            if (hitIndex >= 0) {
              const hit = obstaclesRef.current[hitIndex]
              explosionsRef.current.push({
                id: nextExplosionIdRef.current++,
                worldX: hit.worldX,
                worldY: hit.worldY,
                startTime: now,
              })
              if (hit.hitsRemaining && hit.hitsRemaining > 1) {
                hit.hitsRemaining -= 1
              } else {
                obstaclesRef.current.splice(hitIndex, 1)
              }
              return false
            }
            return true
          })

        // explosions burn out after a third of a second
        explosionsRef.current = explosionsRef.current.filter((e) => now - e.startTime < 350)

        // caught by the horizon
        const distanceToCentre = Math.hypot(layout.blackHoleX - nextWorldX, lateral)
        if (distanceToCentre <= layout.holeRadius) {
          suckInElapsedRef.current = 0
          useGameStore.getState().beginSuckIn()
        } else if (nextWorldX >= layout.levelEndX) {
          useGameStore.getState().completeLevel()
        }
      } else if (store.status === 'sucked-in') {
        suckInElapsedRef.current += delta
        if (suckInElapsedRef.current >= SUCK_IN_SECONDS) {
          useGameStore.getState().loseLife('blackhole')
          invulnerableTimerRef.current = INVULNERABLE_SECONDS
        }
      }

      // ---- render ----
      const latest = useGameStore.getState()
      const shipWorldX = latest.shipWorldX
      const approachT = computeApproachT(shipWorldX, layout)
      const revealT = computeRevealT(shipWorldX, layout)
      const struggleT = computeStruggleT(shipWorldX, layout)
      let scale = computeCameraScale(shipWorldX, width, height, layout, layout.holeRadius)
      if (latest.status === 'sucked-in') {
        scale = applySuckInZoomOut(scale, suckInElapsedRef.current / SUCK_IN_SECONDS)
      }
      const boosting = boostTimerRef.current > 0
      const pickupBoostingNow = pickupBoostTimerRef.current > 0
      const thrusting =
        latest.throttleInput > 0 || boosting || pickupBoostingNow || latest.phase === 'clear'
      // either boost source drives the speed-line effect, whichever is stronger
      const boostIntensity = Math.max(
        Math.min(boostTimerRef.current / BOOST_SECONDS, 1),
        Math.min(pickupBoostTimerRef.current / PICKUP_BOOST_SECONDS, 1),
      )
      // pull the camera back a touch at full boost, for a sense of speed —
      // eased both ways so the double-tap doesn't snap the zoom
      smoothedBoostRef.current += (boostIntensity - smoothedBoostRef.current) * Math.min(delta * 5, 1)
      scale *= 1 - 0.1 * smoothedBoostRef.current

      const shake =
        latest.status === 'sucked-in'
          ? 1
          : computeShakeAmount(shipWorldX, latest.shipLateral, layout)
      audioEngine.setRumble(shake)

      const cameraWorldY = computeCameraWorldY(shipWorldX, latest.shipLateral, layout)
      const screenCentreY = computeScreenCentreY(height)
      const shipScreenX = width * SHIP_SCREEN_X_RATIO
      const worldToScreenX = (worldX: number) => shipScreenX + (worldX - shipWorldX) * scale
      const worldToScreenY = (worldY: number) =>
        screenCentreY + (worldY - cameraWorldY) * scale

      const blackHoleScreenX = worldToScreenX(layout.blackHoleX)
      const blackHoleScreenY = worldToScreenY(0)
      // grows as the ship closes in, on top of the camera pull-back
      const blackHoleScreenRadius =
        layout.holeRadius * scale * computeHorizonScale(shipWorldX, layout)

      // the victory burn: once clear, open up to a hard run through the stars
      const victoryT =
        latest.phase === 'clear'
          ? Math.min(
              (shipWorldX - layout.escapeClearX) /
                (layout.levelEndX - layout.escapeClearX) /
                VICTORY_STREAK_RAMP,
              1,
            )
          : 0

      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
      drawBackdrop(ctx, width, height, getBackdropTheme(latest.level), 1 - revealT * 0.8)

      // the hole eats the starlight as it closes in
      drawStarfield(ctx, starsRef.current, {
        time,
        visibleFraction: 1 - revealT * 0.88,
        skipClear: true,
        streak: victoryT,
        scrollSpeed: victoryT * 900,
        warp: {
          x: blackHoleScreenX,
          y: blackHoleScreenY,
          radius: blackHoleScreenRadius * 3.4,
          strength: 0.4 + revealT * 1.8,
        },
      })

      drawVoidDarkness(ctx, {
        x: blackHoleScreenX,
        y: blackHoleScreenY,
        radius: blackHoleScreenRadius,
        revealT,
        width,
        height,
      })

      const sprites = spritesRef.current

      for (const planet of levelConfig.planets) {
        const dx = shipWorldX - planet.worldX
        if (Math.abs(dx) > 12000) continue
        const orbitY =
          planet.worldY + computeOrbitOffset(planet.worldX, layout.blackHoleX, time, planet.worldX)
        const px = worldToScreenX(planet.worldX)
        const py = worldToScreenY(orbitY)
        const pr = planet.radius * scale
        drawPlanet(
          ctx,
          px,
          py,
          pr,
          (planet.influenceRadius ?? planet.radius * 6) * scale,
          pickPlanetSprite(sprites, planet.spriteIndex),
        )

        // flyby readout fades in as the ship draws level with the world
        const labelOpacity = 1 - Math.min(Math.abs(dx) / FLYBY_TRIGGER_RANGE, 1)
        drawPlanetLabel(ctx, planet, px, py, pr, labelOpacity)
      }

      // the pre-approach fuel cache
      if (!fuelCacheTakenRef.current) {
        const cx = worldToScreenX(layout.fuelCacheX)
        if (cx > -200 && cx < width + 200) {
          drawFuelCache(ctx, cx, worldToScreenY(0), FUEL_CACHE_RADIUS * scale, time)
        }
      }

      for (const obstacle of obstaclesRef.current) {
        const sx = worldToScreenX(obstacle.worldX)
        if (sx < -120 || sx > width + 120) continue
        const sy = worldToScreenY(obstacle.worldY)
        if (obstacle.type === 'asteroid') {
          drawAsteroid(
            ctx,
            sx,
            sy,
            obstacle.radius * scale,
            obstacle.seed,
            pickAsteroidSprite(sprites, obstacle.seed / 10),
            obstacle.reinforced,
            obstacle.hitsRemaining,
          )
        } else if (obstacle.type === 'blockade') {
          drawBlockade(
            ctx,
            sx,
            sy,
            obstacle.radius * scale,
            obstacle.seed,
            pickAsteroidSprite(sprites, obstacle.seed / 10),
            time,
          )
        } else if (obstacle.type === 'booster') {
          drawSpeedBooster(ctx, sx, sy, obstacle.radius * scale, time)
          drawPickupLabel(ctx, 'SUPER FUEL', sx, sy, obstacle.radius * scale + 12)
        } else if (obstacle.type === 'rocketPickup') {
          drawRocketPickup(ctx, sx, sy, obstacle.radius * scale, sprites.rocket, time)
          drawPickupLabel(ctx, 'ROCKETS', sx, sy, obstacle.radius * scale + 12)
        } else if (obstacle.type === 'shieldPickup') {
          drawShieldPickup(ctx, sx, sy, obstacle.radius * scale, sprites.shieldIcon, time)
          drawPickupLabel(ctx, 'SHIELD', sx, sy, obstacle.radius * scale + 12)
        } else if (obstacle.type === 'moon') {
          drawMoon(ctx, sx, sy, obstacle.radius * scale, pickMoonSprite(sprites, obstacle.seed))
        } else {
          drawSatellite(ctx, sx, sy, obstacle.radius * scale, time)
          drawPickupLabel(ctx, 'FUEL', sx, sy, obstacle.radius * scale + 12)
        }
      }

      for (const projectile of projectilesRef.current) {
        const sx = worldToScreenX(projectile.worldX)
        if (sx < -80 || sx > width + 80) continue
        drawRocketProjectile(ctx, sx, worldToScreenY(projectile.worldY), sprites.rocket, scale)
      }

      for (const explosion of explosionsRef.current) {
        const sx = worldToScreenX(explosion.worldX)
        if (sx < -160 || sx > width + 160) continue
        const sy = worldToScreenY(explosion.worldY)
        const t = Math.min((now - explosion.startTime) / 350, 1)
        drawExplosion(ctx, sx, sy, scale, t)
      }

      drawBlackHole(ctx, {
        x: blackHoleScreenX,
        y: blackHoleScreenY,
        radius: blackHoleScreenRadius,
        time,
      })
      drawBlackHoleLabel(
        ctx,
        layout.holeName,
        layout.holeDescription,
        blackHoleScreenX,
        blackHoleScreenY,
        blackHoleScreenRadius,
        Math.min(revealT, 1),
      )

      // ship position, including the spiral if it is being swallowed
      let shipDrawX = shipScreenX
      let shipDrawY = worldToScreenY(latest.shipLateral)
      // reads smaller against the hole at the peak of the struggle, selling
      // its true scale, without ever losing the ship
      let shipScaleFactor = 1 - (1 - STRUGGLE_SHIP_SHRINK) * struggleT

      if (latest.status === 'sucked-in') {
        const t = Math.min(suckInElapsedRef.current / SUCK_IN_SECONDS, 1)
        const eased = t * t
        const spiral = t * Math.PI * 3
        const startX = shipScreenX
        const startY = worldToScreenY(latest.shipLateral)
        const radiusNow = Math.hypot(blackHoleScreenX - startX, blackHoleScreenY - startY) * (1 - eased)
        const baseAngle = Math.atan2(startY - blackHoleScreenY, startX - blackHoleScreenX)
        shipDrawX = blackHoleScreenX + Math.cos(baseAngle + spiral) * radiusNow
        shipDrawY = blackHoleScreenY + Math.sin(baseAngle + spiral) * radiusNow
        shipScaleFactor = 1 - eased
      }

      // brief hint at the warning only — never a permanent racing line
      if (latest.status === 'playing' && guideFlashRef.current > 0 && blackHoleScreenRadius > 4) {
        const fade = Math.min(guideFlashRef.current / GUIDE_FLASH_SECONDS, 1)
        ctx.save()
        ctx.globalAlpha = fade
        drawGuidePath(ctx, {
          shipScreenX: shipDrawX,
          shipScreenY: shipDrawY,
          blackHoleScreenX,
          blackHoleScreenY,
          blackHoleScreenRadius,
          escapeSide: escapeSideRef.current,
          urgency: approachT,
          time,
        })
        ctx.restore()
      }

      if (shipScaleFactor > 0.02) {
        const shipSet = getShipSpriteSet(
          sprites,
          latest.shipSkinId,
          damageTierForLives(latest.lives),
        )
        drawShip(ctx, {
          x: shipDrawX,
          y: shipDrawY,
          bankInput: latest.bankInput,
          invulnerable: latest.invulnerable,
          thrusting,
          time,
          thrustFrames: shipSet.thrustFrames,
          idleFrame: shipSet.idleFrame,
          scale: shipScaleFactor,
          shake,
        })

        if (latest.shieldCharges > 0) {
          drawShipShield(ctx, shipDrawX, shipDrawY, 19 * shipScaleFactor, sprites.shieldFrames, time)
        }
      }

      drawSpeedLines(ctx, width, height, time, boostIntensity)

      animationFrame = requestAnimationFrame(loop)
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />
}
