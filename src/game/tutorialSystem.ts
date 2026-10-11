import { useGameStore, type TutorialAction } from '../state/gameStore'
import type { LevelPhase } from '../levels/worldConfig'

// Contextual coaching on the first few levels. Each prompt appears at the
// moment it is useful (the first launch, the first approach, the first
// rockets, the first chance to boost), clears as soon as the player does
// the thing or after a timeout, and shows at most once per level load. The
// copy is input-neutral: the UI adds the key or touch specific hint.

export const TUTORIAL_LAST_LEVEL = 3

type PromptKey = 'thrust' | 'boost' | 'steer' | 'fire'

interface PromptDef {
  text: string
  action: TutorialAction
  /** seconds before it gives up and clears itself */
  timeout: number
  /** seconds the action must be held to count (0 = a single press) */
  hold: number
}

const PROMPTS: Record<PromptKey, PromptDef> = {
  thrust: { text: 'Thrust to pick up speed.', action: 'thrust', timeout: 7, hold: 0.35 },
  boost: { text: 'Boost for a short burst of speed.', action: 'boost', timeout: 6, hold: 0 },
  steer: { text: 'Steer early. The pull only grows.', action: 'steer', timeout: 6, hold: 0.5 },
  fire: { text: 'Rockets loaded. Fire to clear a path.', action: 'fire', timeout: 7, hold: 0 },
}

// the launch prompt waits for the warp-in to settle
const THRUST_PROMPT_DELAY = 1.6
// the boost prompt waits until the ship is up to speed and clear of the start
const BOOST_PROMPT_MIN_X = 3200
const BOOST_PROMPT_SPEED_RATIO = 0.85

export interface TutorialState {
  /** level these prompts belong to; a new level resets what has been seen */
  level: number
  seen: Set<PromptKey>
  active: PromptKey | null
  elapsed: number
  /** seconds the taught action has been held so far */
  held: number
  /** request ids when the prompt appeared, to spot a fresh press */
  startFireId: number
  startBoostId: number
}

export function createTutorialState(): TutorialState {
  return {
    level: 0,
    seen: new Set(),
    active: null,
    elapsed: 0,
    held: 0,
    startFireId: 0,
    startBoostId: 0,
  }
}

export interface TutorialInputs {
  level: number
  phase: LevelPhase
  shipWorldX: number
  /** forward speed as a fraction of the ship's top speed */
  speedRatio: number
  /** seconds since the attempt began */
  attemptSeconds: number
  /** the approach warning just fired */
  approachWarned: boolean
  boostReady: boolean
  boosting: boolean
}

function show(state: TutorialState, key: PromptKey): void {
  const store = useGameStore.getState()
  state.seen.add(key)
  state.active = key
  state.elapsed = 0
  state.held = 0
  state.startFireId = store.fireRequestId
  state.startBoostId = store.boostRequestId
  const def = PROMPTS[key]
  store.setTutorialPrompt({ text: def.text, action: def.action })
}

export function clearTutorialPrompt(state: TutorialState): void {
  state.active = null
  if (useGameStore.getState().tutorialPrompt) useGameStore.getState().setTutorialPrompt(null)
}

function actionPerformed(state: TutorialState, key: PromptKey, inputs: TutorialInputs, dt: number): boolean {
  const store = useGameStore.getState()
  let pressing = false
  if (key === 'thrust') pressing = store.throttleInput > 0
  else if (key === 'steer') pressing = store.bankInput !== 0
  else if (key === 'boost') return inputs.boosting || store.boostRequestId !== state.startBoostId
  else if (key === 'fire') return store.fireRequestId !== state.startFireId
  state.held = pressing ? state.held + dt : 0
  return state.held >= PROMPTS[key].hold
}

function nextPrompt(state: TutorialState, inputs: TutorialInputs): PromptKey | null {
  const store = useGameStore.getState()
  const unseen = (key: PromptKey) => !state.seen.has(key)
  // the approach matters most: it may interrupt anything
  if (unseen('steer') && inputs.approachWarned) return 'steer'
  if (state.active) return null
  if (unseen('thrust') && inputs.attemptSeconds >= THRUST_PROMPT_DELAY && store.throttleInput <= 0) return 'thrust'
  if (unseen('fire') && store.ammo > 0) return 'fire'
  if (
    unseen('boost') &&
    state.seen.has('thrust') &&
    inputs.phase === 'cruise' &&
    inputs.boostReady &&
    inputs.shipWorldX >= BOOST_PROMPT_MIN_X &&
    inputs.speedRatio >= BOOST_PROMPT_SPEED_RATIO
  ) {
    return 'boost'
  }
  return null
}

export function updateTutorial(state: TutorialState, inputs: TutorialInputs, dt: number): void {
  if (state.level !== inputs.level) {
    state.level = inputs.level
    state.seen.clear()
    clearTutorialPrompt(state)
  }
  if (inputs.level > TUTORIAL_LAST_LEVEL) return

  if (state.active) {
    state.elapsed += dt
    const done = actionPerformed(state, state.active, inputs, dt)
    if (done || state.elapsed >= PROMPTS[state.active].timeout) clearTutorialPrompt(state)
  }
  // already flying hard by the time the launch prompt would appear: they know
  if (inputs.attemptSeconds >= THRUST_PROMPT_DELAY && useGameStore.getState().throttleInput > 0) {
    state.seen.add('thrust')
  }
  const next = nextPrompt(state, inputs)
  if (next) show(state, next)
}
