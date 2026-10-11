import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../state/gameStore'
import { createTutorialState, updateTutorial, type TutorialInputs } from './tutorialSystem'

const DT = 1 / 60

function inputs(over: Partial<TutorialInputs> = {}): TutorialInputs {
  return {
    level: 1,
    phase: 'cruise',
    shipWorldX: 500,
    speedRatio: 0.3,
    attemptSeconds: 3,
    approachWarned: false,
    boostReady: true,
    boosting: false,
    ...over,
  }
}

function run(state: ReturnType<typeof createTutorialState>, seconds: number, over: Partial<TutorialInputs> = {}) {
  for (let t = 0; t < seconds; t += DT) updateTutorial(state, inputs(over), DT)
}

describe('tutorial prompts', () => {
  beforeEach(() => {
    useGameStore.setState({ throttleInput: 0, bankInput: 0, ammo: 0, tutorialPrompt: null })
  })

  it('asks for thrust after launch and clears once the player holds it', () => {
    const state = createTutorialState()
    run(state, 0.1)
    expect(useGameStore.getState().tutorialPrompt?.action).toBe('thrust')
    expect(useGameStore.getState().tutorialPrompt?.text).not.toMatch(/[\u2014\u2013]/)
    useGameStore.setState({ throttleInput: 1 })
    run(state, 0.5)
    expect(useGameStore.getState().tutorialPrompt).toBeNull()
  })

  it('warns to steer on the first approach, interrupting anything else', () => {
    const state = createTutorialState()
    run(state, 0.1)
    run(state, 0.1, { approachWarned: true })
    expect(useGameStore.getState().tutorialPrompt?.action).toBe('steer')
  })

  it('times out, and never repeats a prompt in the same level load', () => {
    const state = createTutorialState()
    run(state, 8)
    expect(useGameStore.getState().tutorialPrompt).toBeNull()
    run(state, 3)
    expect(useGameStore.getState().tutorialPrompt?.action).not.toBe('thrust')
  })

  it('stays silent after the early levels', () => {
    const state = createTutorialState()
    useGameStore.setState({ ammo: 3 })
    run(state, 3, { level: 4, approachWarned: true, shipWorldX: 5000, speedRatio: 1 })
    expect(useGameStore.getState().tutorialPrompt).toBeNull()
  })

  it('gives every prompt a fresh, increasing id', () => {
    const state = createTutorialState()
    run(state, 0.1)
    const first = useGameStore.getState().tutorialPrompt?.id ?? 0
    run(state, 0.1, { approachWarned: true })
    expect(useGameStore.getState().tutorialPrompt?.id ?? 0).toBeGreaterThan(first)
  })
})
