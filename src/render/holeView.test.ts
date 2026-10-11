import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments } from '../levels/levels'
import { computeHoleView } from './holeView'
import { HOLE_PALETTES, paletteForHole } from './holePalette'

const seg = computeLevelSegments(LEVELS[0])[0]

function viewAt(distance: number) {
  return computeHoleView(
    {
      shipWorldX: seg.blackHoleX - distance,
      holeRadius: seg.holeRadius,
      blackHoleX: seg.blackHoleX,
      width: 1200,
      scale: 0.2,
      shipScreenX: 200,
      screenCentreY: 400,
      cameraWorldY: 0,
    },
    seg,
  )
}

describe('computeHoleView', () => {
  it('grows monotonically as the ship closes in', () => {
    let last = 0
    // inside one radius the drawing is the plain world mapping (constant here)
    for (const d of [60000, 30000, 15000, 8000, 5000, 3500]) {
      const r = viewAt(d).radius
      expect(r).toBeGreaterThan(last)
      last = r
    }
  })

  it('is a quiet backdrop far away and in full focus when it looms', () => {
    expect(viewAt(seg.holeRadius * 12).focus).toBe(0)
    expect(viewAt(seg.holeRadius * 2).focus).toBe(1)
    const mid = viewAt(seg.holeRadius * 5).focus
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
  })

  it('fades out entirely when very far', () => {
    expect(viewAt(seg.holeRadius * 20).opacity).toBe(0)
    expect(viewAt(seg.holeRadius * 3).opacity).toBe(1)
  })
})

describe('hole palettes', () => {
  it('is stable per name and spreads holes across several tones', () => {
    expect(paletteForHole('The Maw').id).toBe(paletteForHole('The Maw').id)
    const names = LEVELS.flatMap((l) => computeLevelSegments(l).map((s) => s.holeName))
    const used = new Set(names.map((n) => paletteForHole(n).id))
    expect(used.size).toBeGreaterThanOrEqual(4)
    expect(HOLE_PALETTES.every((p) => p.hot[0] >= p.cool[0] - 80)).toBe(true)
  })
})
