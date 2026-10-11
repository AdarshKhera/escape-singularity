import type { HoleSegment } from '../levels/levels'
import { REFERENCE_SPEED } from '../levels/worldConfig'

export interface HorizonProgress {
  /** 0..1 of the way from the start of this stretch to the active hole */
  fraction: number
  seconds: number
  /** 1-based index of the active hole, and how many there are */
  holeIndex: number
  holeCount: number
}

// Progress toward the hole the player is currently dealing with. Each hole's
// stretch starts where the previous one's escape ended (or at the launch).
export function horizonProgress(segments: readonly HoleSegment[], shipWorldX: number): HorizonProgress {
  let index = segments.findIndex((s) => shipWorldX <= s.levelEndX)
  if (index < 0) index = segments.length - 1
  const segment = segments[index]
  const start = index === 0 ? 0 : segments[index - 1].levelEndX
  const span = Math.max(segment.blackHoleX - start, 1)
  const fraction = Math.min(Math.max((shipWorldX - start) / span, 0), 1)
  return {
    fraction,
    seconds: Math.max((segment.blackHoleX - shipWorldX) / REFERENCE_SPEED, 0),
    holeIndex: index + 1,
    holeCount: segments.length,
  }
}

/** Filled cells of a segmented gauge: any fuel at all shows at least one. */
export function gaugeCells(fraction: number, cells: number): number {
  const clamped = Math.min(Math.max(fraction, 0), 1)
  if (clamped <= 0) return 0
  return Math.max(1, Math.round(clamped * cells))
}
