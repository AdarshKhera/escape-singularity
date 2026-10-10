import type { LevelDefinition } from '../levelTypes'
import { buildPlanetSystem } from '../levelBuilders'
import { PLANET_RADIUS } from '../worldConfig'

export const level01: LevelDefinition = {
  id: 1,
  name: 'First Light',
  subtitle: 'Learn the turn',
  cruiseEndX: 9000,
  approachLeadSeconds: 10,
  maxPull: 1820,
  pullRange: 9000,
  corridorHalfWidth: 255,
  debrisSpacing: 600,
  blockades: [],
  fuelDrainMultiplier: 1.04,
  intro: 'Skim a planet to slingshot. Never touch its core.',
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
        surfaceGravity: 1.0,
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
        surfaceGravity: 0.6,
      },
    ],
    1400,
    7600,
  ),
}
