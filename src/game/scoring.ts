// Pure scoring and star-rating rules. No store, no DOM: the store calls
// these on level completion and tests pin them down.

export interface RunStats {
  /** rocks, blockades, moons, derelicts and comets destroyed by rockets */
  asteroidsDestroyed: number
  /** every pickup flown through: fuel, super fuel, rockets, shields, cache */
  pickupsCollected: number
  /** time on this attempt at the level, ms (game time, so pauses don't count) */
  timeMs: number
  /**
   * Smallest gap between the hull and any event horizon this attempt, in
   * world units; null until a hole's pull has been entered.
   */
  closestApproach: number | null
  /** smallest horizon gap as a fraction of that hole's radius; fair across hole sizes */
  closestApproachFraction: number | null
  /** hazards that passed within a hair of the hull without touching it */
  nearMisses: number
  /** planet slingshots completed */
  slingshots: number
  /** running score for this attempt, including bonuses already earned */
  score: number
}

export function createRunStats(): RunStats {
  return {
    asteroidsDestroyed: 0,
    pickupsCollected: 0,
    timeMs: 0,
    closestApproach: null,
    closestApproachFraction: null,
    nearMisses: 0,
    slingshots: 0,
    score: 0,
  }
}

export const SCORE = {
  kill: 100,
  pickup: 50,
  nearMiss: 25,
  slingshot: 250,
  /** per world unit flown, paid out on completion */
  distancePerUnit: 0.05,
  perLifeLeft: 500,
  /** times the fuel fraction left at the finish */
  fuelBonus: 1000,
  /** the most a single perfect horizon skim can pay */
  maxSkimBonus: 2000,
} as const

// Skimming the horizon pays, on a curve: nothing past 35% of the hole's
// radius, the full bonus for brushing the photon ring itself. Only paid out
// once the hole is actually cleared, so it rewards nerve, not suicide.
export const SKIM_BONUS_RANGE = 0.35

export function computeSkimBonus(clearance: number, holeRadius: number): number {
  if (clearance < 0 || holeRadius <= 0) return 0
  const t = 1 - clearance / (holeRadius * SKIM_BONUS_RANGE)
  if (t <= 0) return 0
  return Math.round(SCORE.maxSkimBonus * t * t)
}

// ---- stars ----
//
// One star for escaping at all. One for doing it without losing a life on
// this level. One for style: either finishing with a healthy tank
// (STYLE_FUEL_FRACTION) or skimming a horizon within STYLE_SKIM_FRACTION of
// its radius. Either style route is fine, so careful pilots and daredevils
// can both earn three.
export const STYLE_FUEL_FRACTION = 0.2
export const STYLE_SKIM_FRACTION = 0.15

export interface StarInputs {
  completed: boolean
  livesLost: number
  /** 0..1 */
  fuelFraction: number
  /** best (smallest) horizon gap as a fraction of that hole's radius; null if none */
  bestSkimFraction: number | null
}

export interface StarReasons {
  escaped: boolean
  flawless: boolean
  style: boolean
}

export function computeStarReasons(input: StarInputs): StarReasons {
  const escaped = input.completed
  const flawless = escaped && input.livesLost <= 0
  const skimmed =
    input.bestSkimFraction !== null && input.bestSkimFraction <= STYLE_SKIM_FRACTION
  const style = escaped && (input.fuelFraction >= STYLE_FUEL_FRACTION || skimmed)
  return { escaped, flawless, style }
}

export function computeStars(input: StarInputs): 0 | 1 | 2 | 3 {
  const r = computeStarReasons(input)
  return ((r.escaped ? 1 : 0) + (r.flawless ? 1 : 0) + (r.style ? 1 : 0)) as 0 | 1 | 2 | 3
}

export interface CompletionBonusInputs {
  distance: number
  livesLeft: number
  fuelFraction: number
}

export function computeCompletionBonus(input: CompletionBonusInputs): number {
  return Math.round(
    input.distance * SCORE.distancePerUnit +
      input.livesLeft * SCORE.perLifeLeft +
      Math.max(0, Math.min(1, input.fuelFraction)) * SCORE.fuelBonus,
  )
}
