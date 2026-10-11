import { useEffect, useState } from 'react'
import { useReducedMotion } from './motion'

interface CountUpOptions {
  delayMs?: number
  durationMs?: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

/** Animates from 0 to `target` once; jumps straight there under reduced motion. */
export function useCountUp(target: number, { delayMs = 0, durationMs = 900 }: CountUpOptions = {}): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (reduced || target <= 0) {
      setValue(target)
      return
    }
    let frame = 0
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / durationMs)
      setValue(Math.round(target * easeOutCubic(t)))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(step)
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [target, delayMs, durationMs, reduced])

  return value
}
