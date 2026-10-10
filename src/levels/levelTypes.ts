import type { EscortDefinition, PlanetDefinition } from './planets'
import type { LevelLayout } from './worldConfig'

export interface ExtraHoleDefinition {
  /** empty stretch of cruise between the first hole's escape and this one's approach */
  gapX: number
  approachLeadSeconds: number
  /** relative to the standard hole radius — this is the "exponentially bigger" second pass */
  radiusMultiplier: number
  name: string
  description: string
}

/** A drifting ion storm: flying through it saps steering and burns fuel. */
export interface IonCloudDefinition {
  /** centre along the flight path */
  worldX: number
  /** lateral centre */
  worldY: number
  /** full extent along the flight path */
  length: number
  /** lateral half-extent */
  halfHeight: number
}

/** A pulsing micro-singularity: pulls hard while charged, lethal core. */
export interface GravityWellDefinition {
  worldX: number
  worldY: number
  /** peak lateral pull at the edge of the core, u/s^2 (kept below steering) */
  strength: number
  /** seconds for one full charge/discharge cycle */
  period: number
  /** phase offset in radians, so neighbouring wells don't pulse in lockstep */
  phase?: number
}

export interface HazardConfig {
  /** max lateral drift speed of cruise asteroids, u/s (0 or absent = static) */
  driftSpeed?: number
  /** chance (0..1) that a hazard spawn in the debris stream is a spinning derelict */
  derelictChance?: number
  /** worldX positions where a telegraphed meteor shower begins */
  showers?: number[]
  /** worldX positions where a comet crosses the lane diagonally */
  comets?: number[]
  ionClouds?: IonCloudDefinition[]
  gravityWells?: GravityWellDefinition[]
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
   * stretch, then face another, deliberately bigger one before the level
   * actually ends. Chained in order after the first hole.
   */
  extraHoles?: ExtraHoleDefinition[]
  /** cruise hazards beyond plain debris, introduced one per level */
  hazards?: HazardConfig
  /** banner shown at the start of the level, e.g. "NEW: Comets cross your lane" */
  intro?: string
  /** scales thrust/steer fuel burn; > 1 tightens the tank on later levels */
  fuelDrainMultiplier?: number
}

/** @deprecated kept as an alias; levels now chain any number of extra holes */
export type SecondHoleDefinition = ExtraHoleDefinition

export interface HoleSegment extends LevelLayout {
  holeRadius: number
  holeName: string
  holeDescription: string
}
