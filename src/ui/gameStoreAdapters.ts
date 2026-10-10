import { useGameStore } from '../state/gameStore'

// ---------------------------------------------------------------------------
// Defensive reads of game store fields that the gameplay branch is adding
// (levelResult, runStats, hapticEvent). Everything that reaches into fields
// the current GameState type does not declare lives in this one file, so the
// merge only has to tighten types here. Each value is validated at runtime and
// collapses to null when absent or malformed.
// ---------------------------------------------------------------------------

export interface LevelResultView {
  stars: number
  score: number | null
}

export interface RunStatsView {
  asteroidsDestroyed: number | null
  pickupsCollected: number | null
  timeMs: number | null
}

export type HapticKind = 'hit' | 'explosion' | 'pickup' | 'boost' | 'death' | 'escape'

export interface HapticEventView {
  id: number
  kind: HapticKind
}

const HAPTIC_KINDS: readonly HapticKind[] = ['hit', 'explosion', 'pickup', 'boost', 'death', 'escape']

type LooseState = Record<string, unknown>

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readField(state: unknown, key: string): unknown {
  return (state as LooseState)[key]
}

export function toLevelResult(raw: unknown): LevelResultView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const stars = finiteOrNull(rec.stars)
  if (stars === null) return null
  return { stars: Math.min(3, Math.max(0, Math.round(stars))), score: finiteOrNull(rec.score) }
}

export function toRunStats(raw: unknown): RunStatsView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const view: RunStatsView = {
    asteroidsDestroyed: finiteOrNull(rec.asteroidsDestroyed),
    pickupsCollected: finiteOrNull(rec.pickupsCollected),
    timeMs: finiteOrNull(rec.timeMs),
  }
  const hasAny = Object.values(view).some((v) => v !== null)
  return hasAny ? view : null
}

export function toHapticEvent(raw: unknown): HapticEventView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const id = finiteOrNull(rec.id)
  const kind = rec.kind
  if (id === null || typeof kind !== 'string') return null
  if (!(HAPTIC_KINDS as readonly string[]).includes(kind)) return null
  return { id, kind: kind as HapticKind }
}

/**
 * Until the gameplay branch provides levelResult, rate a clear by the hull
 * that made it out: one star per life remaining.
 */
export function withStarFallback(result: LevelResultView | null, lives: number): LevelResultView {
  if (result) return result
  return { stars: Math.min(3, Math.max(1, lives)), score: null }
}

/** Raw selectors return the stored reference so zustand's equality check stays stable. */
export function useLevelResult(): LevelResultView | null {
  const raw = useGameStore((s) => readField(s, 'levelResult'))
  return toLevelResult(raw)
}

export function useRunStats(): RunStatsView | null {
  const raw = useGameStore((s) => readField(s, 'runStats'))
  return toRunStats(raw)
}

/** Identity of the stored levelResult object, for change detection in subscriptions. */
export function rawLevelResult(state: unknown): unknown {
  return readField(state, 'levelResult')
}

export function readLevelResultNow(): LevelResultView | null {
  return toLevelResult(readField(useGameStore.getState(), 'levelResult'))
}

/** Calls the listener once per new haptic event id. Returns an unsubscribe. */
export function subscribeHapticEvents(listener: (event: HapticEventView) => void): () => void {
  let lastId = toHapticEvent(readField(useGameStore.getState(), 'hapticEvent'))?.id ?? null
  return useGameStore.subscribe((state) => {
    const event = toHapticEvent(readField(state, 'hapticEvent'))
    if (!event || event.id === lastId) return
    lastId = event.id
    listener(event)
  })
}
