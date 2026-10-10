import type { LevelDefinition } from '../levelTypes'
import { buildPlanetSystem, pullFromGravity } from '../levelBuilders'
import { DEFAULT_APPROACH_LEAD_SECONDS, PLANET_RADIUS } from '../worldConfig'

export const level01: LevelDefinition = {
  id: 1,
  name: 'First Light',
  subtitle: 'Learn the turn',
  cruiseEndX: 9000,
  approachLeadSeconds: DEFAULT_APPROACH_LEAD_SECONDS,
  maxPull: 1950,
  pullRange: 9500,
  corridorHalfWidth: 260,
  debrisSpacing: 620,
  blockades: [],
  blackHoleName: 'Cradlefall',
  blackHoleDescription: 'A young collapse. Still small, still learnable.',
  ...buildPlanetSystem(
    [
      {
        id: 'aster-prime',
        name: 'Aster Prime',
        designation: 'HD-001b',
        gravity: '1.0 g',
        note: 'First charted world on this route.',
        radius: PLANET_RADIUS,
        spriteIndex: 0,
        pullStrength: pullFromGravity(1.0),
        escort: 'moon',
      },
      {
        id: 'coldwell',
        name: 'Coldwell',
        designation: 'HD-002c',
        gravity: '0.6 g',
        note: 'Frost-locked, quiet.',
        radius: PLANET_RADIUS * 0.8,
        spriteIndex: 5,
        pullStrength: pullFromGravity(0.6),
      },
    ],
    1400,
    7600,
  ),
}
