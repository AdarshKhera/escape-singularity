import { create } from 'zustand'
import { FUEL_MAX, THROTTLE_IDLE_SPEED, type LevelPhase } from '../levels/worldConfig'
import {
  computeCompletionBonus,
  computeStarReasons,
  computeStars,
  createRunStats,
  type RunStats,
  type StarReasons,
} from '../game/scoring'
import {
  loadBestResults,
  mergeBestResult,
  saveBestResults,
  type BestResults,
} from '../game/bestResults'

export type { RunStats, StarReasons } from '../game/scoring'
export type { BestResult, BestResults } from '../game/bestResults'

export type RunStatus = 'playing' | 'sucked-in' | 'life-lost' | 'level-complete' | 'game-over'
export type DeathCause = 'collision' | 'blackhole'

/** Moments worth a vibration. The UI subscribes and calls navigator.vibrate. */
export type HapticKind = 'hit' | 'explosion' | 'pickup' | 'boost' | 'death' | 'escape'

export interface HapticEvent {
  /** strictly increasing; a new id means a new event even if kind repeats */
  id: number
  kind: HapticKind
}

/**
 * Snapshot taken when a level is completed (status 'level-complete').
 * Stars: 1 for escaping, +1 for losing no lives on this level, +1 for style
 * (finishing with >= 20% fuel OR skimming a horizon within 15% of its
 * radius). See src/game/scoring.ts.
 */
export interface LevelResult {
  level: number
  stars: 0 | 1 | 2 | 3
  reasons: StarReasons
  /** final score for the level, completion bonus included */
  score: number
  completionBonus: number
  timeMs: number
  livesLeft: number
  livesLost: number
  /** 0..1 of the tank */
  fuelFraction: number
  asteroidsDestroyed: number
  pickupsCollected: number
  nearMisses: number
  slingshots: number
  /** closest gap to an event horizon, world units; null if none was approached */
  closestApproach: number | null
  /** beat the stored best score or stars for this level */
  isNewBest: boolean
}

type RunStatsDelta = Partial<
  Omit<RunStats, 'closestApproach' | 'closestApproachFraction' | 'timeMs'>
>

interface GameState {
  shipWorldX: number
  shipLateral: number
  shipLateralVelocity: number
  shipForwardSpeed: number
  bankInput: -1 | 0 | 1
  throttleInput: -1 | 0 | 1
  boostRequestId: number

  fuel: number
  lives: number
  status: RunStatus
  phase: LevelPhase
  invulnerable: boolean
  bannerMessage: string | null
  deathCause: DeathCause
  shipSkinId: string
  level: number
  paused: boolean

  togglePause: () => void
  hasWeapon: boolean
  ammo: number
  shieldCharges: number
  fireRequestId: number

  /** per-attempt stats for the current level; reset on level change and respawn */
  runStats: RunStats
  /** set on level-complete, cleared when the next attempt starts */
  levelResult: LevelResult | null
  /** sum of completed level scores this run; reset by resetRun/setLevel */
  totalScore: number
  /** best stars/score per level id, persisted to localStorage */
  bestResults: BestResults
  /** lives held when the current level started; drives the "flawless" star */
  livesAtLevelStart: number
  /** bumped on every haptic-worthy moment; see HapticKind */
  hapticEvent: HapticEvent

  requestFire: () => void
  addAmmo: (amount: number) => void
  consumeAmmo: () => void
  addShield: () => void
  consumeShield: () => void
  setShipSkinId: (id: string) => void
  setLevel: (level: number) => void
  advanceLevel: () => void
  setBankInput: (input: -1 | 0 | 1) => void
  setThrottleInput: (input: -1 | 0 | 1) => void
  requestBoost: () => void
  tickShip: (shipWorldX: number, lateral: number, lateralVelocity: number, forwardSpeed: number) => void
  setPhase: (phase: LevelPhase) => void
  setBannerMessage: (message: string | null) => void
  beginSuckIn: () => void
  loseLife: (cause: DeathCause) => void
  addFuel: (amount: number) => void
  drainFuel: (amount: number) => void
  completeLevel: () => void
  respawn: () => void
  resetRun: () => void

  /** fire a haptic moment (the UI turns it into a vibration) */
  emitHaptic: (kind: HapticKind) => void
  /** add counters (and score) into runStats */
  addRunStats: (delta: RunStatsDelta) => void
  /** record a horizon gap; keeps the smallest, absolute and relative to radius */
  recordHorizonGap: (gap: number, holeRadius: number) => void
  /** game-time clock for the attempt, pushed at a low rate from the loop */
  setRunTime: (timeMs: number) => void
}

const INITIAL_LIVES = 3

// Fresh-attempt fields shared by every action that (re)starts flight.
function freshFlight() {
  return {
    shipWorldX: 0,
    shipLateral: 0,
    shipLateralVelocity: 0,
    shipForwardSpeed: THROTTLE_IDLE_SPEED,
    status: 'playing' as RunStatus,
    phase: 'cruise' as LevelPhase,
    invulnerable: false,
    bannerMessage: null,
    paused: false,
    runStats: createRunStats(),
    levelResult: null,
  }
}

// A fresh level: full tank, empty loadout.
function freshLevel() {
  return {
    ...freshFlight(),
    fuel: FUEL_MAX,
    hasWeapon: false,
    ammo: 0,
    shieldCharges: 0,
  }
}

function addStats(stats: RunStats, delta: RunStatsDelta): RunStats {
  return {
    ...stats,
    asteroidsDestroyed: stats.asteroidsDestroyed + (delta.asteroidsDestroyed ?? 0),
    pickupsCollected: stats.pickupsCollected + (delta.pickupsCollected ?? 0),
    nearMisses: stats.nearMisses + (delta.nearMisses ?? 0),
    slingshots: stats.slingshots + (delta.slingshots ?? 0),
    score: stats.score + (delta.score ?? 0),
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  ...freshLevel(),
  bankInput: 0,
  throttleInput: 0,
  boostRequestId: 0,
  lives: INITIAL_LIVES,
  deathCause: 'collision',
  shipSkinId: 'scout',
  level: 1,
  fireRequestId: 0,
  totalScore: 0,
  bestResults: loadBestResults(),
  livesAtLevelStart: INITIAL_LIVES,
  hapticEvent: { id: 0, kind: 'hit' },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  requestFire: () => set((s) => ({ fireRequestId: s.fireRequestId + 1 })),
  // no cap — rockets stack as high as you can collect
  addAmmo: (amount) => set((s) => ({ hasWeapon: true, ammo: s.ammo + amount })),
  consumeAmmo: () => set((s) => ({ ammo: Math.max(0, s.ammo - 1) })),
  addShield: () => set({ shieldCharges: 1 }),
  consumeShield: () => set({ shieldCharges: 0 }),

  setShipSkinId: (shipSkinId) => set({ shipSkinId }),

  setLevel: (level) =>
    set((s) => ({ ...freshLevel(), level, totalScore: 0, livesAtLevelStart: s.lives })),

  advanceLevel: () =>
    set((s) => ({ ...freshLevel(), level: s.level + 1, livesAtLevelStart: s.lives })),

  setBankInput: (bankInput) => set({ bankInput }),
  setThrottleInput: (throttleInput) => set({ throttleInput }),
  requestBoost: () => set((s) => ({ boostRequestId: s.boostRequestId + 1 })),

  tickShip: (shipWorldX, shipLateral, shipLateralVelocity, shipForwardSpeed) =>
    set({ shipWorldX, shipLateral, shipLateralVelocity, shipForwardSpeed }),

  setPhase: (phase) => set({ phase }),

  setBannerMessage: (bannerMessage) => set({ bannerMessage }),

  beginSuckIn: () => set({ status: 'sucked-in' }),

  loseLife: (cause) =>
    set((s) => {
      const lives = s.lives - 1
      return {
        lives,
        status: lives <= 0 ? 'game-over' : 'life-lost',
        shipLateralVelocity: 0,
        invulnerable: true,
        deathCause: cause,
        hapticEvent: { id: s.hapticEvent.id + 1, kind: 'death' },
      }
    }),

  addFuel: (amount) => set((s) => ({ fuel: Math.min(FUEL_MAX, s.fuel + amount) })),
  drainFuel: (amount) => set((s) => ({ fuel: Math.max(0, s.fuel - amount) })),

  completeLevel: () => {
    const s = get()
    const fuelFraction = Math.max(0, Math.min(1, s.fuel / FUEL_MAX))
    const livesLost = Math.max(0, s.livesAtLevelStart - s.lives)
    const completionBonus = computeCompletionBonus({
      distance: s.shipWorldX,
      livesLeft: s.lives,
      fuelFraction,
    })
    const score = s.runStats.score + completionBonus
    const starInputs = {
      completed: true,
      livesLost,
      fuelFraction,
      bestSkimFraction: s.runStats.closestApproachFraction,
    }
    const stars = computeStars(starInputs)
    const { results, isNewBest } = mergeBestResult(s.bestResults, s.level, { stars, score })
    if (isNewBest) saveBestResults(results)
    set({
      status: 'level-complete',
      bannerMessage: null,
      runStats: { ...s.runStats, score },
      totalScore: s.totalScore + score,
      bestResults: results,
      levelResult: {
        level: s.level,
        stars,
        reasons: computeStarReasons(starInputs),
        score,
        completionBonus,
        timeMs: s.runStats.timeMs,
        livesLeft: s.lives,
        livesLost,
        fuelFraction,
        asteroidsDestroyed: s.runStats.asteroidsDestroyed,
        pickupsCollected: s.runStats.pickupsCollected,
        nearMisses: s.runStats.nearMisses,
        slingshots: s.runStats.slingshots,
        closestApproach: s.runStats.closestApproach,
        isNewBest,
      },
    })
  },

  // restart the run from the beginning of the level, keeping lives lost
  respawn: () => set(freshFlight()),

  resetRun: () =>
    set({
      ...freshLevel(),
      lives: INITIAL_LIVES,
      level: 1,
      totalScore: 0,
      livesAtLevelStart: INITIAL_LIVES,
    }),

  emitHaptic: (kind) => set((s) => ({ hapticEvent: { id: s.hapticEvent.id + 1, kind } })),

  addRunStats: (delta) => set((s) => ({ runStats: addStats(s.runStats, delta) })),

  recordHorizonGap: (gap, holeRadius) => {
    const { closestApproach, closestApproachFraction } = get().runStats
    const clampedGap = Math.max(0, gap)
    const fraction = clampedGap / holeRadius
    const closer = closestApproach === null || clampedGap < closestApproach
    const relativelyCloser = closestApproachFraction === null || fraction < closestApproachFraction
    if (!closer && !relativelyCloser) return
    set((s) => ({
      runStats: {
        ...s.runStats,
        closestApproach: closer ? clampedGap : closestApproach,
        closestApproachFraction: relativelyCloser ? fraction : closestApproachFraction,
      },
    }))
  },

  setRunTime: (timeMs) => set((s) => ({ runStats: { ...s.runStats, timeMs } })),
}))
