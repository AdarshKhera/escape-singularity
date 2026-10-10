import { useEffect } from 'react'
import { useSettingsStore } from '../state/settingsStore'
import { subscribeHapticEvents, type HapticKind } from './gameStoreAdapters'

// Short, distinct buzzes per event. Kept brief: long vibrations feel cheap and
// drain battery, and Android ignores very short pulses on some motors.
const PATTERNS: Record<HapticKind, number | number[]> = {
  hit: 40,
  explosion: [30, 30, 50],
  pickup: 18,
  boost: 25,
  death: [80, 40, 120],
  escape: [30, 50, 30, 50, 70],
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

export function vibrate(pattern: number | number[]): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // some browsers throw when called without a prior user gesture
  }
}

/** Forwards game haptic events to the vibration motor while enabled. */
export function useHaptics(): void {
  const enabled = useSettingsStore((s) => s.haptics)

  useEffect(() => {
    if (!enabled || !canVibrate()) return
    return subscribeHapticEvents((event) => vibrate(PATTERNS[event.kind]))
  }, [enabled])
}
