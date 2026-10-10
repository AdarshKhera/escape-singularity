import type { LevelDefinition } from '../levelTypes'
import { buildPlanetSystem, pullFromGravity } from '../levelBuilders'
import { DEFAULT_APPROACH_LEAD_SECONDS, PLANET_RADIUS } from '../worldConfig'

export const level02: LevelDefinition = {
  id: 2,
  name: 'Kepler Drift',
  subtitle: 'Tighter lane',
  cruiseEndX: 12000,
  approachLeadSeconds: DEFAULT_APPROACH_LEAD_SECONDS,
  maxPull: 2150,
  pullRange: 10200,
  corridorHalfWidth: 220,
  debrisSpacing: 560,
  blockades: [],
  blackHoleName: 'The Tithe',
  blackHoleDescription: 'Named for the ships it has already taken.',
  ...buildPlanetSystem(
    [
      {
        id: 'kepler-tau',
        name: 'Kepler-Tau',
        designation: 'KT-119b',
        gravity: '1.4 g',
        note: 'Tidally locked. Iron core.',
        radius: PLANET_RADIUS * 1.1,
        spriteIndex: 2,
        pullStrength: pullFromGravity(1.4),
        escort: 'debris',
      },
      {
        id: 'vesper',
        name: 'Vesper',
        designation: 'HD-4410c',
        gravity: '0.6 g',
        note: 'Thin methane haze.',
        radius: PLANET_RADIUS * 0.85,
        spriteIndex: 5,
        pullStrength: pullFromGravity(0.6),
        escort: 'moon',
      },
      {
        id: 'corvid',
        name: 'Corvid',
        designation: 'TR-3819',
        gravity: '1.1 g',
        note: 'Debris ring. Approach with care.',
        radius: PLANET_RADIUS * 1.15,
        spriteIndex: 3,
        pullStrength: pullFromGravity(1.1),
        escort: 'debris',
      },
    ],
    1400,
    10600,
  ),
}
