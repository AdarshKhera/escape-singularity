import type { JingleKind } from '../audio/AudioEngine'
import type { HoleSegment } from '../levels/levels'
import { computeRevealT, computeShakeAmount, computeStruggleT } from '../levels/worldConfig'
import type { RunStatus } from '../state/gameStore'

// What the music should be doing right now, derived from where the ship is.
// Kept pure so the mapping is easy to tune (and to test) on its own.

/** 0 in calm cruise, rising through the reveal and peaking in the struggle */
export function computeMusicTension(
  status: RunStatus,
  shipWorldX: number,
  lateral: number,
  layout: HoleSegment,
): number {
  if (status === 'sucked-in') return 1
  if (status !== 'playing') return 0
  const reveal = computeRevealT(shipWorldX, layout)
  const struggle = computeStruggleT(shipWorldX, layout)
  const shake = computeShakeAmount(shipWorldX, lateral, layout)
  return Math.min(1, reveal * 0.45 + struggle * 0.4 + shake * 0.4)
}

/** the stinger for a status change, if it deserves one */
export function jingleForStatus(previous: RunStatus, next: RunStatus): JingleKind | null {
  if (previous === next) return null
  if (next === 'level-complete') return 'complete'
  if (next === 'game-over') return 'gameOver'
  if (next === 'life-lost') return 'lifeLost'
  return null
}
