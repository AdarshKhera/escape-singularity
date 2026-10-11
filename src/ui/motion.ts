import { useEffect, useSyncExternalStore } from 'react'
import { useSettingsStore } from '../state/settingsStore'

// One switch for UI motion: the OS "reduce motion" preference or the in-game
// setting. CSS reads the data-motion attribute on <html>; code that animates
// in JS (count-ups, timed reveals) asks useReducedMotion().

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(listener: () => void): () => void {
  const mq = window.matchMedia?.(QUERY)
  mq?.addEventListener('change', listener)
  return () => mq?.removeEventListener('change', listener)
}

function osPrefersReduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches === true
}

export function useReducedMotion(): boolean {
  const setting = useSettingsStore((s) => s.reducedMotion)
  const os = useSyncExternalStore(subscribe, osPrefersReduced, () => false)
  return setting || os
}

/** Non-reactive read for event handlers and timers. */
export function isMotionReducedNow(): boolean {
  return useSettingsStore.getState().reducedMotion || osPrefersReduced()
}

/** Mirrors the motion preference onto <html data-motion> for the stylesheet. */
export function useMotionAttribute(): void {
  const reduced = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  }, [reduced])
}
