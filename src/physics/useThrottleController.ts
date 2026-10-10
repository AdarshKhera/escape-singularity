import { useEffect, useRef } from 'react'
import { useGameStore } from '../state/gameStore'
import { DOUBLE_TAP_WINDOW_MS } from '../levels/worldConfig'
import { onInputFocusLost } from './keyboardFocus'

// Physical key codes, so Shift or Caps Lock can't make a keyup miss its keydown.
const FORWARD_CODES = new Set(['KeyD', 'ArrowRight'])
const BRAKE_CODES = new Set(['KeyA', 'ArrowLeft'])

// Forward flight is throttle-held: Right/D accelerates, Left/A brakes.
// Double-tapping forward within the window requests a brief speed boost.
export function useThrottleController() {
  const setThrottleInput = useGameStore((s) => s.setThrottleInput)
  const requestBoost = useGameStore((s) => s.requestBoost)
  const lastForwardPressRef = useRef(0)

  useEffect(() => {
    const pressed = new Set<string>()
    const owns = (code: string) => FORWARD_CODES.has(code) || BRAKE_CODES.has(code)

    const resolveInput = (): -1 | 0 | 1 => {
      const forward = [...pressed].some((c) => FORWARD_CODES.has(c))
      const brake = [...pressed].some((c) => BRAKE_CODES.has(c))
      if (forward === brake) return 0
      return forward ? 1 : -1
    }

    // only throttle keys touch the throttle axis, so other keys never
    // overwrite a thrust held on the touch controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (!owns(e.code)) return
      if (FORWARD_CODES.has(e.code) && !pressed.has(e.code)) {
        const now = performance.now()
        if (now - lastForwardPressRef.current < DOUBLE_TAP_WINDOW_MS) requestBoost()
        lastForwardPressRef.current = now
      }
      pressed.add(e.code)
      setThrottleInput(resolveInput())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!owns(e.code)) return
      pressed.delete(e.code)
      setThrottleInput(resolveInput())
    }
    const releaseAll = () => {
      if (pressed.size === 0) return
      pressed.clear()
      setThrottleInput(0)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    const stopFocusWatch = onInputFocusLost(releaseAll)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      stopFocusWatch()
      releaseAll()
    }
  }, [setThrottleInput, requestBoost])
}
