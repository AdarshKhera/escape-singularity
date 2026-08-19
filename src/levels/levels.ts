import type { EscortDefinition, PlanetDefinition } from './planets'
import {
  DEFAULT_APPROACH_LEAD_SECONDS,
  PLANET_RADIUS,
  BLACK_HOLE_RADIUS,
  computeLevelLayout,
  type LevelLayout,
} from './worldConfig'

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

// One or two hole passages, chained end to end. Each is computed completely
// independently via computeLevelLayout — the second just starts its own
// cruise/approach/escape cycle right where the first one's ended (plus a
// breather gap), so none of the single-hole physics has to know a second
// hole exists at all.
export function computeLevelSegments(level: LevelDefinition): HoleSegment[] {
  const first = computeLevelLayout(level.cruiseEndX, level.approachLeadSeconds)
  const segments: HoleSegment[] = [
    {
      ...first,
      holeRadius: BLACK_HOLE_RADIUS,
      holeName: level.blackHoleName,
      holeDescription: level.blackHoleDescription,
    },
  ]

  if (level.secondHole) {
    const second = computeLevelLayout(
      first.levelEndX + level.secondHole.gapX,
      level.secondHole.approachLeadSeconds,
    )
    segments.push({
      ...second,
      holeRadius: BLACK_HOLE_RADIUS * level.secondHole.radiusMultiplier,
      holeName: level.secondHole.name,
      holeDescription: level.secondHole.description,
    })
  }

  return segments
}

// The segment whose hole the player is currently dealing with — the first
// one whose worldX range hasn't been passed yet, or the last one once
// everything has.
export function activeSegment(segments: HoleSegment[], shipWorldX: number): HoleSegment {
  for (const segment of segments) {
    if (shipWorldX <= segment.levelEndX) return segment
  }
  return segments[segments.length - 1]
}

type PlanetSeed = Omit<PlanetDefinition, 'worldX' | 'worldY'> & {
  /** 'debris' surrounds it with rubble, 'moon' gives it one small companion */
  escort?: 'debris' | 'moon'
}

function pullFromGravity(gees: number): number {
  return Math.round(gees * 300)
}

// Spreads a hand-authored list of planets evenly across a level's own cruise
// span. Deliberately kept CLOSE to the centreline (not far off to the side):
// a planet only matters as an obstacle if it sits in or near the ship's
// default line, close enough on screen to actually see and to feel its pull.
// Optionally attaches an escort — a scatter of debris or a small moon.
function buildPlanetSystem(
  seeds: PlanetSeed[],
  start: number,
  end: number,
): { planets: PlanetDefinition[]; escorts: EscortDefinition[] } {
  const n = seeds.length
  const planets: PlanetDefinition[] = []
  const escorts: EscortDefinition[] = []

  seeds.forEach((seed, i) => {
    const t = (i + 0.5) / n
    const worldX = Math.round(start + (end - start) * t)
    const worldY = (i % 2 === 0 ? -1 : 1) * (110 + (i % 3) * 70)
    const { escort, ...rest } = seed
    planets.push({ ...rest, worldX, worldY })

    if (escort === 'debris') {
      for (let k = 0; k < 3; k++) {
        const angle = (k / 3) * Math.PI * 2
        escorts.push({
          worldX: worldX + Math.round(Math.cos(angle) * (seed.radius * 2.6)),
          worldY: worldY + Math.round(Math.sin(angle) * (seed.radius * 2.6)),
          kind: 'debris',
          seed: Math.random() * 10,
        })
      }
    } else if (escort === 'moon') {
      escorts.push({
        worldX: worldX + Math.round(seed.radius * 3.2),
        worldY: worldY - Math.round(seed.radius * 1.4),
        kind: 'moon',
        seed: Math.random() * 10,
      })
    }
  })

  return { planets, escorts }
}

// Evenly spaced blockade positions across a level's cruise span.
function spreadBlockades(count: number, start: number, end: number): number[] {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) =>
    Math.round(start + ((end - start) * (i + 1)) / (count + 1)),
  )
}

// Difficulty escalates on several axes at once: the pull widens its reach and
// strengthens, the reaction window has to stretch to compensate, the safe
// corridor narrows, scripted blockades (mandatory dodges) become more
// frequent, and — per level — there are simply more worlds to cross, spread
// across a longer cruise. The core mechanic never changes; only how early the
// player has to commit and how little room there is to be careless.
export const LEVELS: LevelDefinition[] = [
  {
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
  },
  {
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
  },
  {
    id: 3,
    name: 'Ashfall Run',
    subtitle: 'The pull reaches further',
    cruiseEndX: 15000,
    approachLeadSeconds: DEFAULT_APPROACH_LEAD_SECONDS,
    maxPull: 2350,
    pullRange: 11000,
    corridorHalfWidth: 195,
    debrisSpacing: 500,
    blockades: spreadBlockades(1, 5000, 13000),
    blackHoleName: 'Ashfall Dark',
    blackHoleDescription: 'Sits where a star used to burn.',
    ...buildPlanetSystem(
      [
        {
          id: 'ashfall',
          name: 'Ashfall',
          designation: 'GX-77',
          gravity: '2.1 g',
          note: 'Volcanic. Unsurveyed.',
          radius: PLANET_RADIUS * 1.3,
          spriteIndex: 9,
          pullStrength: pullFromGravity(2.1),
          escort: 'debris',
        },
        {
          id: 'lumen',
          name: 'Lumen',
          designation: 'PSR-2b',
          gravity: '0.9 g',
          note: 'Ice shell over liquid ocean.',
          radius: PLANET_RADIUS,
          spriteIndex: 6,
          pullStrength: pullFromGravity(0.9),
          escort: 'moon',
        },
        {
          id: 'halcyon',
          name: 'Halcyon',
          designation: 'KX-22a',
          gravity: '0.4 g',
          note: 'Low mass. Trace atmosphere.',
          radius: PLANET_RADIUS * 0.8,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.4),
        },
        {
          id: 'morrow',
          name: 'Morrow',
          designation: 'LP-6631',
          gravity: '1.6 g',
          note: 'Storm bands. High albedo.',
          radius: PLANET_RADIUS * 1.2,
          spriteIndex: 4,
          pullStrength: pullFromGravity(1.6),
          escort: 'debris',
        },
      ],
      1400,
      13600,
    ),
  },
  {
    id: 4,
    name: 'Sol System — Inner Worlds',
    subtitle: 'The Sun long since collapsed',
    cruiseEndX: 22000,
    approachLeadSeconds: 12,
    maxPull: 2400,
    pullRange: 11800,
    corridorHalfWidth: 175,
    debrisSpacing: 460,
    blockades: spreadBlockades(2, 5000, 20000),
    blackHoleName: 'Sol',
    blackHoleDescription: 'What the Sun became. Nothing else remains of home.',
    ...buildPlanetSystem(
      [
        {
          id: 'mercury',
          name: 'Mercury',
          designation: 'Sol I',
          gravity: '0.38 g',
          note: 'Closest world. No real atmosphere.',
          radius: PLANET_RADIUS * 0.55,
          spriteIndex: 1,
          pullStrength: pullFromGravity(0.38),
        },
        {
          id: 'venus',
          name: 'Venus',
          designation: 'Sol II',
          gravity: '0.9 g',
          note: 'Thick sulfuric clouds. Hottest world by far.',
          radius: PLANET_RADIUS * 0.95,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.9),
          escort: 'debris',
        },
        {
          id: 'earth',
          name: 'Earth',
          designation: 'Sol III',
          gravity: '1.0 g',
          note: 'Home, once. Still blue from here.',
          radius: PLANET_RADIUS,
          spriteIndex: 9,
          pullStrength: pullFromGravity(1.0),
          escort: 'moon',
        },
        {
          id: 'mars',
          name: 'Mars',
          designation: 'Sol IV',
          gravity: '0.38 g',
          note: 'Rust and thin, cold air.',
          radius: PLANET_RADIUS * 0.53,
          spriteIndex: 11,
          pullStrength: pullFromGravity(0.38),
          escort: 'moon',
        },
      ],
      1600,
      20200,
    ),
  },
  {
    id: 5,
    name: 'Sol System — Outer Worlds',
    subtitle: 'Past the asteroid belt',
    cruiseEndX: 27000,
    approachLeadSeconds: 13,
    maxPull: 2500,
    pullRange: 13200,
    corridorHalfWidth: 155,
    debrisSpacing: 420,
    blockades: spreadBlockades(2, 5000, 25000),
    blackHoleName: 'Sol',
    blackHoleDescription: 'Wider out now. It has only gotten bigger.',
    ...buildPlanetSystem(
      [
        {
          id: 'jupiter',
          name: 'Jupiter',
          designation: 'Sol V',
          gravity: '2.5 g',
          note: 'A gas giant with no floor to land on. Largest world in the system.',
          radius: PLANET_RADIUS * 2.4,
          spriteIndex: 8,
          pullStrength: pullFromGravity(2.5),
          escort: 'moon',
        },
        {
          id: 'saturn',
          name: 'Saturn',
          designation: 'Sol VI',
          gravity: '1.1 g',
          note: 'Rings of ice and rock, wider than the planet itself.',
          radius: PLANET_RADIUS * 2.1,
          spriteIndex: 3,
          pullStrength: pullFromGravity(1.1),
          escort: 'debris',
        },
        {
          id: 'uranus',
          name: 'Uranus',
          designation: 'Sol VII',
          gravity: '0.9 g',
          note: 'Tilted on its side. Pale cyan haze.',
          radius: PLANET_RADIUS * 1.5,
          spriteIndex: 4,
          pullStrength: pullFromGravity(0.9),
        },
        {
          id: 'neptune',
          name: 'Neptune',
          designation: 'Sol VIII',
          gravity: '1.1 g',
          note: 'Last world before the dark. Fastest winds in the system.',
          radius: PLANET_RADIUS * 1.45,
          spriteIndex: 0,
          pullStrength: pullFromGravity(1.1),
          escort: 'moon',
        },
      ],
      1600,
      25200,
    ),
  },
  {
    id: 6,
    name: 'Cygnus Reach',
    subtitle: 'Past the charted edge',
    cruiseEndX: 31000,
    approachLeadSeconds: 15,
    maxPull: 2600,
    pullRange: 14000,
    corridorHalfWidth: 140,
    debrisSpacing: 390,
    blockades: spreadBlockades(3, 5000, 29000),
    belts: [20000],
    blackHoleName: 'Cygnus Null',
    blackHoleDescription: 'Twice the mass anything before it had.',
    ...buildPlanetSystem(
      [
        {
          id: 'cygnus-a',
          name: 'Cygnus-A',
          designation: 'CY-441',
          gravity: '1.9 g',
          note: 'Binary shadow world.',
          radius: PLANET_RADIUS * 1.2,
          spriteIndex: 0,
          pullStrength: pullFromGravity(1.9),
          escort: 'debris',
        },
        {
          id: 'reach',
          name: 'The Reach',
          designation: 'CY-441c',
          gravity: '0.5 g',
          note: 'Fractured, half-formed.',
          radius: PLANET_RADIUS * 0.7,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.5),
        },
        {
          id: 'wintermere',
          name: 'Wintermere',
          designation: 'CY-508b',
          gravity: '1.5 g',
          note: 'Frozen nitrogen oceans.',
          radius: PLANET_RADIUS * 1.05,
          spriteIndex: 8,
          pullStrength: pullFromGravity(1.5),
          escort: 'moon',
        },
        {
          id: 'ferrous',
          name: 'Ferrous',
          designation: 'CY-620',
          gravity: '2.3 g',
          note: 'Exposed metallic core.',
          radius: PLANET_RADIUS * 1.3,
          spriteIndex: 3,
          pullStrength: pullFromGravity(2.3),
          escort: 'debris',
        },
        {
          id: 'palewind',
          name: 'Palewind',
          designation: 'CY-702',
          gravity: '0.7 g',
          note: 'Constant high-altitude gales.',
          radius: PLANET_RADIUS * 0.85,
          spriteIndex: 11,
          pullStrength: pullFromGravity(0.7),
        },
        {
          id: 'darkmoor',
          name: 'Darkmoor',
          designation: 'CY-810b',
          gravity: '2.0 g',
          note: 'Never faces its own star.',
          radius: PLANET_RADIUS * 1.25,
          spriteIndex: 9,
          pullStrength: pullFromGravity(2.0),
          escort: 'moon',
        },
      ],
      1600,
      29400,
    ),
  },
  {
    id: 7,
    name: 'Vela Drift',
    subtitle: 'Debris on every line',
    cruiseEndX: 35000,
    approachLeadSeconds: 17,
    maxPull: 2700,
    pullRange: 14800,
    corridorHalfWidth: 128,
    debrisSpacing: 365,
    blockades: spreadBlockades(3, 5000, 33000),
    blackHoleName: 'Velatine',
    blackHoleDescription: 'The Drift is what is left orbiting it.',
    ...buildPlanetSystem(
      [
        {
          id: 'vela-prime',
          name: 'Vela Prime',
          designation: 'VL-002',
          gravity: '2.0 g',
          note: 'Supernova remnant, still hot.',
          radius: PLANET_RADIUS * 1.25,
          spriteIndex: 9,
          pullStrength: pullFromGravity(2.0),
          escort: 'debris',
        },
        {
          id: 'ashgrave',
          name: 'Ashgrave',
          designation: 'VL-114',
          gravity: '0.6 g',
          note: 'Ash-choked, dim.',
          radius: PLANET_RADIUS * 0.75,
          spriteIndex: 1,
          pullStrength: pullFromGravity(0.6),
        },
        {
          id: 'pallor',
          name: 'Pallor',
          designation: 'VL-233c',
          gravity: '1.2 g',
          note: 'Pale, thin-aired.',
          radius: PLANET_RADIUS,
          spriteIndex: 6,
          pullStrength: pullFromGravity(1.2),
          escort: 'moon',
        },
        {
          id: 'graven',
          name: 'Graven',
          designation: 'VL-350',
          gravity: '2.4 g',
          note: 'Dense, cratered, unlit.',
          radius: PLANET_RADIUS * 1.35,
          spriteIndex: 10,
          pullStrength: pullFromGravity(2.4),
          escort: 'debris',
        },
        {
          id: 'thinspire',
          name: 'Thinspire',
          designation: 'VL-419',
          gravity: '0.5 g',
          note: 'Needle-thin mountain spires.',
          radius: PLANET_RADIUS * 0.7,
          spriteIndex: 2,
          pullStrength: pullFromGravity(0.5),
        },
        {
          id: 'redshank',
          name: 'Redshank',
          designation: 'VL-501b',
          gravity: '1.8 g',
          note: 'Iron oxide dust storms.',
          radius: PLANET_RADIUS * 1.15,
          spriteIndex: 3,
          pullStrength: pullFromGravity(1.8),
          escort: 'moon',
        },
        {
          id: 'farlight',
          name: 'Farlight',
          designation: 'VL-618',
          gravity: '0.9 g',
          note: 'Faint auroras, no known cause.',
          radius: PLANET_RADIUS * 0.9,
          spriteIndex: 5,
          pullStrength: pullFromGravity(0.9),
          escort: 'debris',
        },
      ],
      1600,
      33400,
    ),
  },
  {
    id: 8,
    name: "Orion's Rim",
    subtitle: 'Everything is closer than it looks',
    cruiseEndX: 39000,
    approachLeadSeconds: 19,
    maxPull: 2800,
    pullRange: 15600,
    corridorHalfWidth: 118,
    debrisSpacing: 345,
    blockades: spreadBlockades(4, 5000, 37000),
    blackHoleName: 'The Rimward Dark',
    blackHoleDescription: 'Nobody has mapped what is past it.',
    secondHole: {
      gapX: 7000,
      approachLeadSeconds: 21,
      radiusMultiplier: 1.5,
      name: "The Rim's End",
      description: 'What the Rimward Dark was hiding. Larger than the first by far.',
    },
    ...buildPlanetSystem(
      [
        {
          id: 'rim-alpha',
          name: 'Rim Alpha',
          designation: 'OR-01',
          gravity: '1.7 g',
          note: 'Nebula-lit, always twilight.',
          radius: PLANET_RADIUS * 1.15,
          spriteIndex: 2,
          pullStrength: pullFromGravity(1.7),
          escort: 'debris',
        },
        {
          id: 'hollowmoor',
          name: 'Hollowmoor',
          designation: 'OR-77b',
          gravity: '0.5 g',
          note: 'Hollow-sounding when struck.',
          radius: PLANET_RADIUS * 0.7,
          spriteIndex: 5,
          pullStrength: pullFromGravity(0.5),
        },
        {
          id: 'quietus',
          name: 'Quietus',
          designation: 'OR-140',
          gravity: '2.1 g',
          note: 'No signal ever returned.',
          radius: PLANET_RADIUS * 1.3,
          spriteIndex: 11,
          pullStrength: pullFromGravity(2.1),
          escort: 'moon',
        },
        {
          id: 'brackish',
          name: 'Brackish',
          designation: 'OR-206c',
          gravity: '0.8 g',
          note: 'Slush oceans, faint tides.',
          radius: PLANET_RADIUS * 0.9,
          spriteIndex: 8,
          pullStrength: pullFromGravity(0.8),
          escort: 'debris',
        },
        {
          id: 'umbral',
          name: 'Umbral',
          designation: 'OR-311',
          gravity: '2.5 g',
          note: 'Permanent eclipse world.',
          radius: PLANET_RADIUS * 1.4,
          spriteIndex: 4,
          pullStrength: pullFromGravity(2.5),
          escort: 'moon',
        },
        {
          id: 'lowtide',
          name: 'Lowtide',
          designation: 'OR-402',
          gravity: '0.6 g',
          note: 'Oceans mostly gone.',
          radius: PLANET_RADIUS * 0.75,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.6),
        },
        {
          id: 'redoubt',
          name: 'Redoubt',
          designation: 'OR-519b',
          gravity: '2.2 g',
          note: 'Fortress-like ridgelines.',
          radius: PLANET_RADIUS * 1.3,
          spriteIndex: 3,
          pullStrength: pullFromGravity(2.2),
          escort: 'debris',
        },
        {
          id: 'lastlight',
          name: 'Lastlight',
          designation: 'OR-640',
          gravity: '1.0 g',
          note: 'Final outpost on the Rim.',
          radius: PLANET_RADIUS,
          spriteIndex: 6,
          pullStrength: pullFromGravity(1.0),
          escort: 'moon',
        },
      ],
      1600,
      37400,
    ),
  },
  {
    id: 9,
    name: 'Perseus Fault',
    subtitle: 'The margin is gone',
    cruiseEndX: 44000,
    approachLeadSeconds: 21,
    maxPull: 2900,
    pullRange: 16400,
    corridorHalfWidth: 110,
    debrisSpacing: 328,
    blockades: spreadBlockades(4, 5000, 42000),
    belts: [29000],
    blackHoleName: 'The Fault',
    blackHoleDescription: 'Space itself reads wrong this close to it.',
    secondHole: {
      gapX: 7000,
      approachLeadSeconds: 23,
      radiusMultiplier: 1.7,
      name: 'The Deeper Fault',
      description: 'The Fault was only the outer edge of this one.',
    },
    ...buildPlanetSystem(
      [
        {
          id: 'fault-line',
          name: 'Fault Line',
          designation: 'PF-009',
          gravity: '2.2 g',
          note: 'Split down the middle, still moving.',
          radius: PLANET_RADIUS * 1.3,
          spriteIndex: 3,
          pullStrength: pullFromGravity(2.2),
          escort: 'debris',
        },
        {
          id: 'cindergate',
          name: 'Cindergate',
          designation: 'PF-140b',
          gravity: '1.9 g',
          note: 'Ember-lit crust.',
          radius: PLANET_RADIUS * 1.15,
          spriteIndex: 9,
          pullStrength: pullFromGravity(1.9),
          escort: 'moon',
        },
        {
          id: 'null-mara',
          name: 'Null Mara',
          designation: 'PF-266',
          gravity: '0.4 g',
          note: 'Almost nothing holding it together.',
          radius: PLANET_RADIUS * 0.65,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.4),
        },
        {
          id: 'obsidian-reach',
          name: 'Obsidian Reach',
          designation: 'PF-390',
          gravity: '2.6 g',
          note: 'Glassy crust, razor terrain.',
          radius: PLANET_RADIUS * 1.4,
          spriteIndex: 10,
          pullStrength: pullFromGravity(2.6),
          escort: 'debris',
        },
        {
          id: 'last-echo',
          name: 'Last Echo',
          designation: 'PF-501c',
          gravity: '1.1 g',
          note: 'Final relay before the fault.',
          radius: PLANET_RADIUS,
          spriteIndex: 6,
          pullStrength: pullFromGravity(1.1),
          escort: 'moon',
        },
        {
          id: 'greywater',
          name: 'Greywater',
          designation: 'PF-612',
          gravity: '0.8 g',
          note: 'Perpetual overcast.',
          radius: PLANET_RADIUS * 0.85,
          spriteIndex: 8,
          pullStrength: pullFromGravity(0.8),
        },
        {
          id: 'thornwell',
          name: 'Thornwell',
          designation: 'PF-704b',
          gravity: '2.0 g',
          note: 'Jagged crystalline growths.',
          radius: PLANET_RADIUS * 1.2,
          spriteIndex: 2,
          pullStrength: pullFromGravity(2.0),
          escort: 'debris',
        },
        {
          id: 'hushline',
          name: 'Hushline',
          designation: 'PF-810',
          gravity: '0.5 g',
          note: 'No wind, no sound.',
          radius: PLANET_RADIUS * 0.7,
          spriteIndex: 5,
          pullStrength: pullFromGravity(0.5),
        },
        {
          id: 'brimstone',
          name: 'Brimstone',
          designation: 'PF-920c',
          gravity: '2.3 g',
          note: 'Sulphur clouds, acid rain.',
          radius: PLANET_RADIUS * 1.25,
          spriteIndex: 4,
          pullStrength: pullFromGravity(2.3),
          escort: 'moon',
        },
      ],
      1600,
      42400,
    ),
  },
  {
    id: 10,
    name: 'The Maw',
    subtitle: 'It has been waiting',
    cruiseEndX: 49000,
    approachLeadSeconds: 23,
    maxPull: 3000,
    pullRange: 17200,
    corridorHalfWidth: 102,
    debrisSpacing: 312,
    blockades: spreadBlockades(5, 5000, 47000),
    blackHoleName: 'The Maw',
    blackHoleDescription: 'Not the last one. There is worse still ahead.',
    secondHole: {
      gapX: 7500,
      approachLeadSeconds: 26,
      radiusMultiplier: 2.0,
      name: "The Maw's Throat",
      description: 'Past the first Maw, the real one waits. There is no chart past this.',
    },
    ...buildPlanetSystem(
      [
        {
          id: 'gatekeep',
          name: 'Gatekeep',
          designation: 'MW-001',
          gravity: '2.4 g',
          note: 'The last named world before the dark.',
          radius: PLANET_RADIUS * 1.35,
          spriteIndex: 4,
          pullStrength: pullFromGravity(2.4),
          escort: 'debris',
        },
        {
          id: 'threadbare',
          name: 'Threadbare',
          designation: 'MW-090',
          gravity: '0.5 g',
          note: 'Atmosphere all but gone.',
          radius: PLANET_RADIUS * 0.7,
          spriteIndex: 1,
          pullStrength: pullFromGravity(0.5),
        },
        {
          id: 'deadlight',
          name: 'Deadlight',
          designation: 'MW-188b',
          gravity: '2.7 g',
          note: 'No star reaches it directly.',
          radius: PLANET_RADIUS * 1.4,
          spriteIndex: 10,
          pullStrength: pullFromGravity(2.7),
          escort: 'moon',
        },
        {
          id: 'susurrus',
          name: 'Susurrus',
          designation: 'MW-266',
          gravity: '0.9 g',
          note: 'Thin winds, constant static.',
          radius: PLANET_RADIUS * 0.85,
          spriteIndex: 8,
          pullStrength: pullFromGravity(0.9),
          escort: 'debris',
        },
        {
          id: 'final-approach',
          name: 'Final Approach',
          designation: 'MW-340c',
          gravity: '1.8 g',
          note: 'Nothing charted past this point.',
          radius: PLANET_RADIUS * 1.1,
          spriteIndex: 11,
          pullStrength: pullFromGravity(1.8),
          escort: 'moon',
        },
        {
          id: 'hollow-king',
          name: 'Hollow King',
          designation: 'MW-455',
          gravity: '2.6 g',
          note: 'Massive, dark, unmoving.',
          radius: PLANET_RADIUS * 1.45,
          spriteIndex: 9,
          pullStrength: pullFromGravity(2.6),
          escort: 'debris',
        },
        {
          id: 'vantage',
          name: 'Vantage',
          designation: 'MW-560b',
          gravity: '0.7 g',
          note: 'Last clear view of the hole.',
          radius: PLANET_RADIUS * 0.8,
          spriteIndex: 7,
          pullStrength: pullFromGravity(0.7),
        },
        {
          id: 'threshold',
          name: 'Threshold',
          designation: 'MW-680',
          gravity: '2.2 g',
          note: 'Orbit already decaying.',
          radius: PLANET_RADIUS * 1.25,
          spriteIndex: 3,
          pullStrength: pullFromGravity(2.2),
          escort: 'debris',
        },
        {
          id: 'nocturne',
          name: 'Nocturne',
          designation: 'MW-790c',
          gravity: '1.0 g',
          note: 'Permanent night side.',
          radius: PLANET_RADIUS,
          spriteIndex: 6,
          pullStrength: pullFromGravity(1.0),
          escort: 'moon',
        },
        {
          id: 'the-sill',
          name: 'The Sill',
          designation: 'MW-899',
          gravity: '2.9 g',
          note: 'The last thing before the Maw.',
          radius: PLANET_RADIUS * 1.5,
          spriteIndex: 10,
          pullStrength: pullFromGravity(2.9),
          escort: 'debris',
        },
      ],
      1600,
      47400,
    ),
  },
]

export const MAX_LEVEL = LEVELS.length

export function getLevel(id: number): LevelDefinition {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}
