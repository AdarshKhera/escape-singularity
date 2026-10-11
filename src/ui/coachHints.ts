import type { InputMode } from './ControlsGuide'
import type { TutorialAction } from './gameStoreAdapters'

// Input-specific half of a coach mark. The game supplies neutral text
// ("Thrust to build speed"); this adds which keys or which on-screen control.

export interface CoachHint {
  keys: readonly string[]
  /** short words after the keys, e.g. "double tap" */
  note: string
}

const KEYBOARD: Readonly<Record<TutorialAction, CoachHint>> = {
  steer: { keys: ['W', 'S'], note: 'or arrow keys to steer' },
  thrust: { keys: ['D'], note: 'hold to thrust' },
  brake: { keys: ['A'], note: 'hold to brake' },
  boost: { keys: ['D', 'D'], note: 'double tap to boost' },
  fire: { keys: ['Space'], note: 'to fire a rocket' },
}

const TOUCH: Readonly<Record<TutorialAction, CoachHint>> = {
  steer: { keys: [], note: 'Slide the left pad up or down' },
  thrust: { keys: [], note: 'Hold Thrust' },
  brake: { keys: [], note: 'Hold Brake' },
  boost: { keys: [], note: 'Double tap Thrust' },
  fire: { keys: [], note: 'Tap Fire' },
}

export function coachHint(action: TutorialAction | null, mode: InputMode): CoachHint | null {
  if (!action) return null
  return mode === 'touch' ? TOUCH[action] : KEYBOARD[action]
}

/** Stable key for "seen" bookkeeping: the prompt's own words. */
export function tipKey(text: string): string {
  return `tip:${text.trim().toLowerCase().replace(/\s+/g, ' ')}`
}
