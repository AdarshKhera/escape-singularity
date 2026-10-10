import type { EscortDefinition, PlanetDefinition } from './planets'
import type { LevelLayout } from './worldConfig'

export interface SecondHoleDefinition {
  /** empty stretch of cruise between the first hole's escape and this one's approach */
  gapX: number
  approachLeadSeconds: number
  /** relative to the standard hole radius — this is the "exponentially bigger" second pass */
  radiusMultiplier: number
  name: string
  description: string
}

export interface LevelDefinition {
  id: number
  name: string
  subtitle: string
  /** where the planet tour ends and the run toward the hole begins */
  cruiseEndX: number
  /** seconds of reaction time before the hole, once the pull window opens —
   * grows with level so a bigger, harder hole still leaves time to commit */
  approachLeadSeconds: number
  /** lateral drag toward the centreline at its strongest */
  maxPull: number
  /** how far along the flight path the pull reaches */
  pullRange: number
  /** clear central corridor half-width during the cruise */
  corridorHalfWidth: number
  /** spacing between debris spawns; smaller = denser */
  debrisSpacing: number
  planets: PlanetDefinition[]
  escorts: EscortDefinition[]
  blackHoleName: string
  blackHoleDescription: string
  /**
   * worldX positions of scripted, dead-centre hazards the player must
   * actively dodge — unlike random corridor debris, these are guaranteed.
   * Count escalates with level; empty early on.
   */
  blockades: number[]
  /**
   * worldX positions of rock belts — a true wall spanning the ship's full
   * cruise reach, passable only by blasting a reinforced rock open. Rare and
   * deliberately scoped to a handful of levels, not every one.
   */
  belts?: number[]
  /**
   * The last few levels don't end at one hole — clear it, cross a calm
   * stretch, then face a second, deliberately bigger one before the level
   * actually ends.
   */
  secondHole?: SecondHoleDefinition
}

export interface HoleSegment extends LevelLayout {
  holeRadius: number
  holeName: string
  holeDescription: string
}
