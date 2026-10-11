import { useGameStore } from '../state/gameStore'

// UI-facing views of the scoring and haptic fields on the game store
// (levelResult, runStats, hapticEvent). Kept in one place so the overlays and
// level select never depend on the store's full scoring shape.

export interface LevelResultView {
  stars: number
  score: number | null
  /** ships lost on this level; null when not reported */
  livesLost: number | null
  timeMs: number | null
  isNewBest: boolean
}

export interface RunStatsView {
  asteroidsDestroyed: number | null
  pickupsCollected: number | null
  timeMs: number | null
  nearMisses: number | null
  slingshots: number | null
}

export type HapticKind = 'hit' | 'explosion' | 'pickup' | 'boost' | 'death' | 'escape'

export interface HapticEventView {
  id: number
  kind: HapticKind
}

const HAPTIC_KINDS: readonly HapticKind[] = ['hit', 'explosion', 'pickup', 'boost', 'death', 'escape']

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function toLevelResult(raw: unknown): LevelResultView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const stars = finiteOrNull(rec.stars)
  if (stars === null) return null
  return {
    stars: Math.min(3, Math.max(0, Math.round(stars))),
    score: finiteOrNull(rec.score),
    livesLost: finiteOrNull(rec.livesLost),
    timeMs: finiteOrNull(rec.timeMs),
    isNewBest: rec.isNewBest === true,
  }
}

export function toRunStats(raw: unknown): RunStatsView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const view: RunStatsView = {
    asteroidsDestroyed: finiteOrNull(rec.asteroidsDestroyed),
    pickupsCollected: finiteOrNull(rec.pickupsCollected),
    timeMs: finiteOrNull(rec.timeMs),
    nearMisses: finiteOrNull(rec.nearMisses),
    slingshots: finiteOrNull(rec.slingshots),
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

/** Fallback when no levelResult was recorded: one star per life remaining. */
export function withStarFallback(result: LevelResultView | null, lives: number): LevelResultView {
  if (result) return result
  return { stars: Math.min(3, Math.max(1, lives)), score: null, livesLost: null, timeMs: null, isNewBest: false }
}

/** Raw selectors return the stored reference so zustand's equality check stays stable. */
export function useLevelResult(): LevelResultView | null {
  const raw = useGameStore((s) => s.levelResult)
  return toLevelResult(raw)
}

export function useRunStats(): RunStatsView | null {
  const raw = useGameStore((s) => s.runStats)
  return toRunStats(raw)
}

/** Identity of the stored levelResult object, for change detection in subscriptions. */
export function rawLevelResult(state: ReturnType<typeof useGameStore.getState>): unknown {
  return state.levelResult
}

export function readLevelResultNow(): LevelResultView | null {
  return toLevelResult(useGameStore.getState().levelResult)
}

/** Calls the listener once per new haptic event id. Returns an unsubscribe. */
export function subscribeHapticEvents(listener: (event: HapticEventView) => void): () => void {
  let lastId = toHapticEvent(useGameStore.getState().hapticEvent)?.id ?? null
  return useGameStore.subscribe((state) => {
    const event = toHapticEvent(state.hapticEvent)
    if (!event || event.id === lastId) return
    lastId = event.id
    listener(event)
  })
}

type GameStateSnapshot = ReturnType<typeof useGameStore.getState>

export function readRunStats(state: GameStateSnapshot): RunStatsView | null {
  return toRunStats(state.runStats)
}

/** Ships lost since the level started, from the store's own bookkeeping when it has it. */
export function readLivesLostNow(): number | null {
  const state = useGameStore.getState()
  const atStart = 'livesAtLevelStart' in state ? finiteOrNull(state.livesAtLevelStart) : null
  const lives = finiteOrNull(state.lives)
  if (atStart === null || lives === null) return null
  return Math.max(0, atStart - lives)
}

// ---- tutorial prompts (contract field, may be absent before the merge) ----

export type TutorialAction = 'steer' | 'thrust' | 'boost' | 'fire' | 'brake'

export interface TutorialPromptView {
  id: number
  text: string
  action: TutorialAction | null
}

const TUTORIAL_ACTIONS: readonly TutorialAction[] = ['steer', 'thrust', 'boost', 'fire', 'brake']

export function toTutorialPrompt(raw: unknown): TutorialPromptView | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const id = finiteOrNull(rec.id)
  const text = typeof rec.text === 'string' ? rec.text.trim() : ''
  if (id === null || !text) return null
  const action =
    typeof rec.action === 'string' && (TUTORIAL_ACTIONS as readonly string[]).includes(rec.action)
      ? (rec.action as TutorialAction)
      : null
  return { id, text, action }
}

function rawTutorialPrompt(state: GameStateSnapshot): unknown {
  return 'tutorialPrompt' in state ? state.tutorialPrompt : null
}

/** Selects the raw stored object (stable identity) and validates it on read. */
export function useTutorialPrompt(): TutorialPromptView | null {
  const raw = useGameStore(rawTutorialPrompt)
  return toTutorialPrompt(raw)
}
