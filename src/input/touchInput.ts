// Pure helpers behind the on-screen controls, kept free of React and the DOM
// so the mapping from finger position to game input is easy to reason about.

export type Axis = -1 | 0 | 1

/** Vertical offset of the finger from the pad centre (px, down positive) to a steer input. */
export function steerFromOffset(offsetY: number, deadzone: number): Axis {
  if (offsetY < -deadzone) return -1
  if (offsetY > deadzone) return 1
  return 0
}

/** Same rule as the keyboard: thrust and brake held together cancel out. */
export function resolveThrottle(thrust: boolean, brake: boolean): Axis {
  if (thrust === brake) return 0
  return thrust ? 1 : -1
}

export function isDoubleTap(previousTapMs: number, nowMs: number, windowMs: number): boolean {
  return previousTapMs > 0 && nowMs - previousTapMs < windowMs
}

/** Clamp the visual knob travel inside the pad. */
export function clampKnob(offsetY: number, travel: number): number {
  return Math.max(-travel, Math.min(travel, offsetY))
}
