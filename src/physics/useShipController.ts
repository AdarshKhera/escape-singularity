import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { onInputFocusLost } from './keyboardFocus'

// Physical key codes, so Shift or Caps Lock can't make a keyup miss its keydown.
const UP_CODES = new Set(['KeyW', 'ArrowUp'])
const DOWN_CODES = new Set(['KeyS', 'ArrowDown'])

export function useShipController() {
  const setBankInput = useGameStore((s) => s.setBankInput)

  useEffect(() => {
    const pressed = new Set<string>()
    const owns = (code: string) => UP_CODES.has(code) || DOWN_CODES.has(code)

    const resolveInput = (): -1 | 0 | 1 => {
      const up = [...pressed].some((c) => UP_CODES.has(c))
      const down = [...pressed].some((c) => DOWN_CODES.has(c))
      if (up === down) return 0
      return up ? -1 : 1
    }

    // only steering keys touch the steering axis, so firing or pausing never
    // overwrites a steer held on the touch pad
    const onKeyDown = (e: KeyboardEvent) => {
      if (!owns(e.code)) return
      pressed.add(e.code)
      setBankInput(resolveInput())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!owns(e.code)) return
      pressed.delete(e.code)
      setBankInput(resolveInput())
    }
    const releaseAll = () => {
      if (pressed.size === 0) return
      pressed.clear()
      setBankInput(0)
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
  }, [setBankInput])
}
