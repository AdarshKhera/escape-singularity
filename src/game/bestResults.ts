// Best stars/score per level, kept in localStorage so level select can show
// progress across sessions. Storage can be missing or throw (private mode,
// blocked site data), so every access is guarded and failure just means
// nothing is remembered.

export interface BestResult {
  stars: number
  score: number
}

export type BestResults = Record<number, BestResult>

const STORAGE_KEY = 'escape-singularity:best-results:v1'

function isBestResult(value: unknown): value is BestResult {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.stars === 'number' && typeof v.score === 'number'
}

export function loadBestResults(): BestResults {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const result: BestResults = {}
    for (const [key, value] of Object.entries(parsed)) {
      const level = Number(key)
      if (Number.isInteger(level) && isBestResult(value)) {
        result[level] = { stars: value.stars, score: value.score }
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveBestResults(results: BestResults): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(results))
  } catch {
    // storage unavailable: progress simply isn't remembered this session
  }
}

export function mergeBestResult(
  results: BestResults,
  level: number,
  candidate: BestResult,
): { results: BestResults; isNewBest: boolean } {
  const previous = results[level]
  const isNewBest = !previous || candidate.score > previous.score || candidate.stars > previous.stars
  if (!isNewBest) return { results, isNewBest }
  const merged: BestResult = {
    stars: Math.max(candidate.stars, previous?.stars ?? 0),
    score: Math.max(candidate.score, previous?.score ?? 0),
  }
  return { results: { ...results, [level]: merged }, isNewBest }
}

export function clearSavedBestResults(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // nothing to forget if storage is unavailable
  }
}
