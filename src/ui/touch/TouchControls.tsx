import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import { useGameStore } from '../../state/gameStore'
import { DOUBLE_TAP_WINDOW_MS } from '../../levels/worldConfig'
import { isDoubleTap, resolveThrottle, type Axis } from '../../input/touchInput'
import { usePointerHold } from '../../input/usePointerHold'
import { SteerPad, type SteerPadHandle } from './SteerPad'
import './touch.css'

// On-screen controls for touch play: steer pad under the left thumb, thrust,
// brake and fire under the right. Mounted only while a run is live and not
// paused; every input is released on unmount, blur and tab switch so the ship
// can never be left thrusting or turning on its own.
export function TouchControls() {
  const setBankInput = useGameStore((s) => s.setBankInput)
  const setThrottleInput = useGameStore((s) => s.setThrottleInput)
  const requestBoost = useGameStore((s) => s.requestBoost)
  const requestFire = useGameStore((s) => s.requestFire)
  const hasWeapon = useGameStore((s) => s.hasWeapon)
  const ammo = useGameStore((s) => s.ammo)

  const thrustRef = useRef(false)
  const brakeRef = useRef(false)
  const steerActiveRef = useRef(false)
  const lastThrustTapRef = useRef(0)
  const steerPadRef = useRef<SteerPadHandle>(null)

  const pushThrottle = useCallback(() => {
    setThrottleInput(resolveThrottle(thrustRef.current, brakeRef.current))
  }, [setThrottleInput])

  const onThrust = useCallback(
    (held: boolean) => {
      thrustRef.current = held
      pushThrottle()
    },
    [pushThrottle],
  )

  const onBrake = useCallback(
    (held: boolean) => {
      brakeRef.current = held
      pushThrottle()
    },
    [pushThrottle],
  )

  const onThrustTap = useCallback(() => {
    const now = performance.now()
    if (isDoubleTap(lastThrustTapRef.current, now, DOUBLE_TAP_WINDOW_MS)) {
      requestBoost()
      lastThrustTapRef.current = 0
      return
    }
    lastThrustTapRef.current = now
  }, [requestBoost])

  const onSteer = useCallback(
    (axis: Axis) => {
      steerActiveRef.current = axis !== 0
      setBankInput(axis)
    },
    [setBankInput],
  )

  const thrust = usePointerHold(onThrust, onThrustTap)
  const brake = usePointerHold(onBrake)
  const releaseThrust = thrust.release
  const releaseBrake = brake.release

  useEffect(() => {
    const releaseAll = () => {
      releaseThrust()
      releaseBrake()
      steerPadRef.current?.release()
    }
    const onVisibility = () => {
      if (document.hidden) releaseAll()
    }
    window.addEventListener('blur', releaseAll)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', releaseAll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [releaseThrust, releaseBrake])

  // unmount (pause, overlay, quit): zero whatever touch was still driving
  useEffect(
    () => () => {
      if (thrustRef.current || brakeRef.current) setThrottleInput(0)
      if (steerActiveRef.current) setBankInput(0)
    },
    [setBankInput, setThrottleInput],
  )

  const canFire = hasWeapon && ammo > 0
  const onFire = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    requestFire()
  }

  return (
    <div className="es-touch" aria-label="Touch controls">
      <div className="es-touch__left">
        <SteerPad ref={steerPadRef} onSteer={onSteer} />
      </div>

      <div className="es-touch__right">
        {canFire && (
          <button type="button" className="es-tbtn es-tbtn--fire" onPointerDown={onFire} aria-label={`Fire, ${ammo} rockets`}>
            <span className="es-tbtn__label">Fire</span>
            <span className="es-tbtn__count">{ammo}</span>
          </button>
        )}
        <div className="es-touch__row">
          <button
            type="button"
            className="es-tbtn es-tbtn--brake"
            data-active={brake.held}
            aria-label="Brake"
            {...brake.handlers}
          >
            <span className="es-tbtn__label">Brake</span>
          </button>
          <button
            type="button"
            className="es-tbtn es-tbtn--thrust"
            data-active={thrust.held}
            aria-label="Thrust, double tap to boost"
            {...thrust.handlers}
          >
            <svg className="es-tbtn__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 6l6 6-6 6M12 6l6 6-6 6" />
            </svg>
            <span className="es-tbtn__label">Thrust</span>
            <span className="es-tbtn__hint">tap tap boost</span>
          </button>
        </div>
      </div>
    </div>
  )
}
