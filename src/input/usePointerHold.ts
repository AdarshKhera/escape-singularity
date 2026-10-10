import { useCallback, useRef, useState, type PointerEvent } from 'react'

interface PointerHoldHandlers {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onPointerUp: (e: PointerEvent<HTMLElement>) => void
  onPointerCancel: (e: PointerEvent<HTMLElement>) => void
  onLostPointerCapture: (e: PointerEvent<HTMLElement>) => void
}

/**
 * Tracks a single held pointer on one element with pointer capture, so a
 * finger that slides off the button still releases it cleanly. Other fingers
 * on other controls are unaffected (multi-touch safe).
 */
export function usePointerHold(onChange: (held: boolean) => void, onPress?: () => void) {
  const pointerRef = useRef<number | null>(null)
  const [held, setHeld] = useState(false)

  const release = useCallback(() => {
    if (pointerRef.current === null) return
    pointerRef.current = null
    setHeld(false)
    onChange(false)
  }, [onChange])

  const handlers: PointerHoldHandlers = {
    onPointerDown: (e) => {
      if (pointerRef.current !== null) return
      e.preventDefault()
      pointerRef.current = e.pointerId
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // capture can fail if the pointer already lifted; release covers it
      }
      setHeld(true)
      onChange(true)
      onPress?.()
    },
    onPointerUp: (e) => {
      if (e.pointerId === pointerRef.current) release()
    },
    onPointerCancel: (e) => {
      if (e.pointerId === pointerRef.current) release()
    },
    onLostPointerCapture: (e) => {
      if (e.pointerId === pointerRef.current) release()
    },
  }

  return { held, handlers, release }
}
