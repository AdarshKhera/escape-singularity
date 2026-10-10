import { useEffect, useSyncExternalStore } from 'react'
import { useSettingsStore } from '../state/settingsStore'

// ---------------------------------------------------------------------------
// Touch detection: a coarse primary pointer, or any real touch seen this
// session (covers hybrids and browsers that misreport pointer media queries).
// ---------------------------------------------------------------------------

let touchSeen = false
const touchListeners = new Set<() => void>()

function coarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
}

function onFirstTouch() {
  if (touchSeen) return
  touchSeen = true
  touchListeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', onFirstTouch, { passive: true, once: true })
}

function subscribeTouch(listener: () => void) {
  touchListeners.add(listener)
  const mq = window.matchMedia?.('(pointer: coarse)')
  mq?.addEventListener('change', listener)
  return () => {
    touchListeners.delete(listener)
    mq?.removeEventListener('change', listener)
  }
}

function isTouchDeviceSnapshot(): boolean {
  return touchSeen || coarsePointer()
}

/** True when the device itself looks touch-first, ignoring the user setting. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribeTouch, isTouchDeviceSnapshot, () => false)
}

/** True when touch UI (on-screen controls, touch copy) should be shown. */
export function useTouchMode(): boolean {
  const device = useIsTouchDevice()
  const mode = useSettingsStore((s) => s.touchControls)
  if (mode === 'on') return true
  if (mode === 'off') return false
  return device
}

// ---------------------------------------------------------------------------
// Orientation
// ---------------------------------------------------------------------------

function subscribeOrientation(listener: () => void) {
  const mq = window.matchMedia('(orientation: portrait)')
  mq.addEventListener('change', listener)
  window.addEventListener('resize', listener)
  return () => {
    mq.removeEventListener('change', listener)
    window.removeEventListener('resize', listener)
  }
}

function portraitSnapshot(): boolean {
  return window.innerHeight > window.innerWidth
}

export function useIsPortrait(): boolean {
  return useSyncExternalStore(subscribeOrientation, portraitSnapshot, () => false)
}

// ---------------------------------------------------------------------------
// Immersive mode: fullscreen plus a landscape lock. Both APIs only work from a
// user gesture and are missing or throw on many browsers (iOS Safari has no
// orientation lock at all), so every step is optional.
// ---------------------------------------------------------------------------

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> }

export async function enterImmersiveMode(): Promise<void> {
  try {
    const root = document.documentElement
    if (!document.fullscreenElement && typeof root.requestFullscreen === 'function') {
      await root.requestFullscreen({ navigationUI: 'hide' })
    }
  } catch {
    // fullscreen refused: carry on windowed
  }
  try {
    const orientation = screen.orientation as LockableOrientation | undefined
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape')
    }
  } catch {
    // lock unsupported or refused: the rotate screen covers portrait instead
  }
}

/** Block the long-press context menu while mounted (play surface only). */
export function useSuppressContextMenu(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const block = (e: Event) => e.preventDefault()
    window.addEventListener('contextmenu', block)
    return () => window.removeEventListener('contextmenu', block)
  }, [active])
}
