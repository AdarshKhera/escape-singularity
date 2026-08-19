import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'
import { DOUBLE_TAP_WINDOW_MS } from '../levels/worldConfig'

const FORWARD_KEYS = new Set(['d', 'D', 'ArrowRight'])
const BRAKE_KEYS = new Set(['a', 'A', 'ArrowLeft'])

// Forward flight is throttle-held: Right/D accelerates, Left/A brakes.
// Double-tapping forward within the window requests a brief speed boost.
export function useThrottleController() {
  const setThrottleInput = useGameStore((s) => s.setThrottleInput)
  const requestBoost = useGameStore((s) => s.requestBoost)
  const lastForwardPressRef = useRef(0)

  useEffect(() => {
    const pressed = new Set<string>()

    const resolveInput = () => {
      const forward = [...pressed].some((k) => FORWARD_KEYS.has(k))
      const brake = [...pressed].some((k) => BRAKE_KEYS.has(k))
      if (forward === brake) return 0
      return forward ? 1 : -1
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (FORWARD_KEYS.has(e.key) && !pressed.has(e.key)) {
        const now = performance.now()
        if (now - lastForwardPressRef.current < DOUBLE_TAP_WINDOW_MS) {
          requestBoost()
        }
        lastForwardPressRef.current = now
      }
      pressed.add(e.key)
      setThrottleInput(resolveInput())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.key)
      setThrottleInput(resolveInput())
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [setThrottleInput, requestBoost])
}
