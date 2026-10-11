import { useEffect, useState } from 'react'
import { isMotionReducedNow } from './motion'

export interface ScreenTransition<T> {
  /** the screen to render right now */
  shown: T
  /** true while the previous screen plays its exit */
  leaving: boolean
}

/**
 * Lets the outgoing screen play a short exit before the next one mounts and
 * plays its own entrance. Instant under reduced motion.
 */
export function useScreenTransition<T>(target: T, exitMs = 140): ScreenTransition<T> {
  const [shown, setShown] = useState(target)

  useEffect(() => {
    if (Object.is(target, shown)) return
    if (isMotionReducedNow()) {
      setShown(target)
      return
    }
    const timer = window.setTimeout(() => setShown(target), exitMs)
    return () => window.clearTimeout(timer)
  }, [target, shown, exitMs])

  return { shown, leaving: !Object.is(target, shown) }
}
