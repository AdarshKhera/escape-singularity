// Adaptive quality: watches real frame times and steps the effects budget
// down when a device can't hold its refresh rate, and back up once it has
// clearly recovered. Hysteresis is wide on purpose: a GC pause or a tab
// switch must never flap the quality, only a sustained struggle does.

export type QualityLevel = 0 | 1 | 2

export interface QualitySettings {
  /** particles alive at once */
  particleBudget: number
  /** infalling matter streams on the accretion disk */
  matterStreams: number
  /** fraction of the starfield drawn */
  starFraction: number
  /** backing-store pixel ratio cap */
  maxDpr: number
  /** motion-blurred streaks for fast particles */
  particleStreaks: boolean
  /** the nebula backdrop layer */
  nebula: boolean
}

export const QUALITY_SETTINGS: Record<QualityLevel, QualitySettings> = {
  0: { particleBudget: 280, matterStreams: 0, starFraction: 0.5, maxDpr: 1, particleStreaks: false, nebula: false },
  1: { particleBudget: 520, matterStreams: 14, starFraction: 0.75, maxDpr: 1.5, particleStreaks: false, nebula: true },
  2: { particleBudget: 900, matterStreams: 30, starFraction: 1, maxDpr: 2, particleStreaks: true, nebula: true },
}

// a frame slower than this counts against the device (~45 fps)
const SLOW_FRAME_MS = 22
// a frame faster than this counts toward recovery (~66 fps budget)
const FAST_FRAME_MS = 17.5
const DOWNGRADE_AFTER_SECONDS = 2
const UPGRADE_AFTER_SECONDS = 8
// frames longer than this are hitches (tab switch, GC), not a trend
const IGNORE_FRAME_MS = 250
const EMA = 0.08

export interface QualityMonitor {
  level: QualityLevel
  /** smoothed frame time, ms */
  averageMs: number
  slowSeconds: number
  fastSeconds: number
  /** a level forced from the URL (?quality=0..2), never adapted */
  pinned: boolean
  /** times each level has been stepped down from; twice and it's off limits */
  failures: [number, number, number]
}

const MAX_FAILURES = 2

function pinnedFromUrl(): QualityLevel | null {
  try {
    const raw = new URLSearchParams(globalThis.location?.search ?? '').get('quality')
    if (raw === '0' || raw === '1' || raw === '2') return Number(raw) as QualityLevel
  } catch {
    // no location (tests): adapt as normal
  }
  return null
}

export function createQualityMonitor(): QualityMonitor {
  const pinned = pinnedFromUrl()
  return {
    level: pinned ?? 2,
    averageMs: 16.7,
    slowSeconds: 0,
    fastSeconds: 0,
    pinned: pinned !== null,
    failures: [0, 0, 0],
  }
}

/** Feed one real frame; returns true when the level changed. */
export function sampleFrame(monitor: QualityMonitor, frameMs: number): boolean {
  if (monitor.pinned || frameMs > IGNORE_FRAME_MS || frameMs <= 0) return false
  monitor.averageMs += (frameMs - monitor.averageMs) * EMA
  const seconds = frameMs / 1000
  monitor.slowSeconds = monitor.averageMs > SLOW_FRAME_MS ? monitor.slowSeconds + seconds : 0
  monitor.fastSeconds = monitor.averageMs < FAST_FRAME_MS ? monitor.fastSeconds + seconds : 0

  if (monitor.slowSeconds >= DOWNGRADE_AFTER_SECONDS && monitor.level > 0) {
    monitor.failures[monitor.level] += 1
    monitor.level = (monitor.level - 1) as QualityLevel
    monitor.slowSeconds = 0
    return true
  }
  // a level that has already failed twice is never retried: no flapping
  const next = monitor.level + 1
  if (
    monitor.fastSeconds >= UPGRADE_AFTER_SECONDS &&
    next <= 2 &&
    monitor.failures[next] < MAX_FAILURES
  ) {
    monitor.level = (monitor.level + 1) as QualityLevel
    monitor.fastSeconds = 0
    return true
  }
  return false
}

export function qualitySettings(monitor: QualityMonitor): QualitySettings {
  return QUALITY_SETTINGS[monitor.level]
}
