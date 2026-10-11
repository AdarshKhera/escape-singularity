import { useEffect } from 'react'
import { useSettingsStore } from '../state/settingsStore'
import { playUiSound, unlockAudio, type UiSound } from './audioAdapter'
import { vibrate } from './haptics'

// Every menu and overlay button gets a sound and, on touch, a tiny haptic
// tick, without each component wiring it up. Buttons opt out or pick a
// specific sound with data-sound="none" | "back" | "toggle" | ...
// In-game touch controls are inputs, not UI, so they are left alone.

const UI_SOUNDS: readonly UiSound[] = ['tap', 'back', 'toggle', 'unlock', 'star', 'denied']
const TAP_HAPTIC_MS = 10

function uiButtonFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const button = target.closest<HTMLElement>('button, [role="button"]')
  if (!button || button.closest('.es-touch')) return null
  return button
}

function soundFor(button: HTMLElement): UiSound | null {
  const explicit = button.dataset.sound
  if (explicit === 'none') return null
  if (explicit && (UI_SOUNDS as readonly string[]).includes(explicit)) return explicit as UiSound
  const role = button.getAttribute('role')
  if (role === 'switch' || role === 'radio' || button.hasAttribute('aria-pressed')) return 'toggle'
  if (button.getAttribute('aria-label') === 'Back') return 'back'
  return 'tap'
}

export function useUiFeedback(): void {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const button = uiButtonFrom(e.target)
      if (!button) return
      unlockAudio()
      if (e.pointerType === 'touch' && useSettingsStore.getState().haptics && !button.matches(':disabled')) {
        vibrate(TAP_HAPTIC_MS)
      }
    }
    const onClick = (e: MouseEvent) => {
      const button = uiButtonFrom(e.target)
      if (!button) return
      const sound = soundFor(button)
      if (sound) playUiSound(sound)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])
}
