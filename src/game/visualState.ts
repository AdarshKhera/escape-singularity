// Purely cosmetic per-frame state: the engine ribbon, parallax scroll, the
// warp-in and exit flourishes, and the ghost of the previous attempt. None
// of it feeds back into the simulation. Fixed-size typed arrays throughout,
// so updating it allocates nothing.

/** points in the engine ribbon, sampled at RIBBON_SAMPLE_HZ */
export const RIBBON_POINTS = 22
export const RIBBON_SAMPLE_HZ = 60
/** world units between recorded ghost samples */
export const GHOST_SPACING = 70
const GHOST_CAPACITY = 2400

export interface VisualState {
  /** engine ribbon in screen px, newest first */
  ribbonX: Float32Array
  ribbonY: Float32Array
  ribbonCount: number
  ribbonCarry: number
  /** accumulated parallax scroll at depth 1, screen px */
  parallaxX: number
  parallaxY: number
  /** seconds since this attempt started: drives the warp-in */
  warpIn: number
  /** the warp-in arrival beat has fired */
  warpArrived: boolean
  /** seconds since the level was completed: drives the exit flourish */
  exit: number
  /** the path flown this attempt, worldX/lateral pairs */
  pathX: Float32Array
  pathY: Float32Array
  pathCount: number
  /** level the current path was flown on */
  pathLevel: number
  /** the previous attempt's path on this level, drawn as a ghost */
  ghostX: Float32Array
  ghostY: Float32Array
  ghostCount: number
  /** the ghost's attempt ended in a death (it gets a marker where it ended) */
  ghostEndedInDeath: boolean
  /** how the latest attempt ended so far: still flying, died or cleared */
  outcome: 'flying' | 'died' | 'cleared'
  /** fractional damage-smoke particles carried between frames */
  smokeCarry: number
}

export function createVisualState(): VisualState {
  return {
    ribbonX: new Float32Array(RIBBON_POINTS),
    ribbonY: new Float32Array(RIBBON_POINTS),
    ribbonCount: 0,
    ribbonCarry: 0,
    parallaxX: 0,
    parallaxY: 0,
    warpIn: 0,
    warpArrived: false,
    exit: 0,
    pathX: new Float32Array(GHOST_CAPACITY),
    pathY: new Float32Array(GHOST_CAPACITY),
    pathCount: 0,
    pathLevel: 0,
    ghostX: new Float32Array(GHOST_CAPACITY),
    ghostY: new Float32Array(GHOST_CAPACITY),
    ghostCount: 0,
    ghostEndedInDeath: false,
    outcome: 'flying',
    smokeCarry: 0,
  }
}

// A new attempt: the path just flown becomes the ghost if it was on the same
// level (a respawn or a retry), otherwise there is nothing to compare with.
export function beginAttempt(v: VisualState, level: number): void {
  if (v.pathLevel === level && v.pathCount > 1) {
    v.ghostX.set(v.pathX.subarray(0, v.pathCount))
    v.ghostY.set(v.pathY.subarray(0, v.pathCount))
    v.ghostCount = v.pathCount
    v.ghostEndedInDeath = v.outcome === 'died'
  } else {
    v.ghostCount = 0
  }
  v.outcome = 'flying'
  v.pathCount = 0
  v.pathLevel = level
  v.ribbonCount = 0
  v.ribbonCarry = 0
  v.warpIn = 0
  v.warpArrived = false
  v.exit = 0
  v.smokeCarry = 0
}

export function recordPath(v: VisualState, worldX: number, lateral: number): void {
  const last = v.pathCount - 1
  if (last >= 0 && worldX - v.pathX[last] < GHOST_SPACING) return
  if (v.pathCount >= GHOST_CAPACITY) return
  v.pathX[v.pathCount] = worldX
  v.pathY[v.pathCount] = lateral
  v.pathCount++
}

// Ribbon points drift backwards at a fixed screen speed, so the trail keeps
// a constant on-screen length whatever the zoom, and bends wherever the ship
// changed course.
export function stepRibbon(
  v: VisualState,
  tailX: number,
  tailY: number,
  driftPx: number,
  dt: number,
): void {
  if (dt <= 0) return
  for (let i = 0; i < v.ribbonCount; i++) v.ribbonX[i] -= driftPx * dt
  v.ribbonCarry += dt * RIBBON_SAMPLE_HZ
  while (v.ribbonCarry >= 1) {
    v.ribbonCarry -= 1
    v.ribbonX.copyWithin(1, 0, RIBBON_POINTS - 1)
    v.ribbonY.copyWithin(1, 0, RIBBON_POINTS - 1)
    v.ribbonCount = Math.min(v.ribbonCount + 1, RIBBON_POINTS)
  }
  if (v.ribbonCount === 0) v.ribbonCount = 1
  v.ribbonX[0] = tailX
  v.ribbonY[0] = tailY
}

export function clearRibbon(v: VisualState): void {
  v.ribbonCount = 0
  v.ribbonCarry = 0
}

/** first ghost index at or beyond worldX (the path is sorted by worldX) */
export function ghostIndexAt(v: VisualState, worldX: number): number {
  let lo = 0
  let hi = v.ghostCount
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (v.ghostX[mid] < worldX) lo = mid + 1
    else hi = mid
  }
  return lo
}
