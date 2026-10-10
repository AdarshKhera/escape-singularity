import type { EscortDefinition, PlanetDefinition } from './planets'

export type PlanetSeed = Omit<PlanetDefinition, 'worldX' | 'worldY'> & {
  /** 'debris' surrounds it with rubble, 'moon' gives it one small companion */
  escort?: 'debris' | 'moon'
}

export function pullFromGravity(gees: number): number {
  return Math.round(gees * 300)
}

// Spreads a hand-authored list of planets evenly across a level's own cruise
// span. Deliberately kept CLOSE to the centreline (not far off to the side):
// a planet only matters as an obstacle if it sits in or near the ship's
// default line, close enough on screen to actually see and to feel its pull.
// Optionally attaches an escort — a scatter of debris or a small moon.
export function buildPlanetSystem(
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
export function spreadBlockades(count: number, start: number, end: number): number[] {
  if (count === 0) return []
  return Array.from({ length: count }, (_, i) =>
    Math.round(start + ((end - start) * (i + 1)) / (count + 1)),
  )
}
