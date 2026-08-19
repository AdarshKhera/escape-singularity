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
   * Actual gravitational pull, independent of radius and visual size — a
   * small dense world can pull harder than a big gassy one. Always far
   * weaker than the hole; this is flavour and light slingshot assistance,
   * never a threat on its own.
   */
  pullStrength: number
  /** world units a planet's gravity reaches; defaults to radius * 6 */
  influenceRadius?: number
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
