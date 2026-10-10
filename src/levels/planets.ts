export interface PlanetWander {
  /** lateral swing either side of worldY, world units */
  amplitude: number
  /** radians per second */
  speed: number
}

export interface PlanetDefinition {
  id: string
  name: string
  designation: string
  /** display only, e.g. "1.4 g" */
  gravity: string
  note: string
  worldX: number
  worldY: number
  radius: number
  spriteIndex: number
  /**
   * Surface gravity in g. Drives the real pull (see computePlanetAccel):
   * acceleration at the surface is this times PLANET_G, falling off with the
   * square of distance, so a small dense world can bend the ship harder than
   * a big gassy one of the same size on screen.
   */
  surfaceGravity: number
  /** world units a planet's gravity reaches; defaults to radius * PLANET_INFLUENCE_RADII */
  influenceRadius?: number
  /** a rogue world: drifts back and forth across the lane instead of holding still */
  wander?: PlanetWander
}

// How close (in world units along the flight path) the ship must be for the
// flyby readout to show at full opacity.
export const FLYBY_TRIGGER_RANGE = 2600

export interface EscortDefinition {
  worldX: number
  worldY: number
  kind: 'debris' | 'moon'
  seed: number
}
