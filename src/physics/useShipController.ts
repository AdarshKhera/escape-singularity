import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

const UP_KEYS = new Set(['w', 'W', 'ArrowUp'])
const DOWN_KEYS = new Set(['s', 'S', 'ArrowDown'])

export function useShipController() {
  const setBankInput = useGameStore((s) => s.setBankInput)

  useEffect(() => {
    const pressed = new Set<string>()

    const resolveInput = () => {
      const up = [...pressed].some((k) => UP_KEYS.has(k))
      const down = [...pressed].some((k) => DOWN_KEYS.has(k))
      if (up === down) return 0
      return up ? -1 : 1
    }

    const onKeyDown = (e: KeyboardEvent) => {
      pressed.add(e.key)
      setBankInput(resolveInput())
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.key)
      setBankInput(resolveInput())
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [setBankInput])
}
