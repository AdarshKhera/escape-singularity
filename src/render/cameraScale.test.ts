import { describe, expect, it } from 'vitest'
import { LEVELS, computeLevelSegments } from '../levels/levels'
import { CRUISE_LANE_BOUND, laneBoundForHole } from '../levels/worldConfig'
import {
  SHIP_FRAME_MARGIN_PX,
  computeCameraView,
  computeScreenCentreY,
  computeTopUiMargin,
} from './cameraScale'

// Desktop, tablet and landscape/portrait phones.
const VIEWPORTS = [
  [1440, 900],
  [1024, 768],
  [844, 390],
  [740, 360],
  [390, 844],
] as const

const SHIP_HALF_PX = 19

describe('camera framing', () => {
  it('keeps the ship inside the visible band for any reachable lateral', () => {
    for (const level of [LEVELS[0], LEVELS[LEVELS.length - 1]]) {
      for (const seg of computeLevelSegments(level)) {
        const xs: number[] = []
        for (let x = seg.revealStartX - 3000; x <= seg.levelEndX; x += 400) xs.push(x)
        for (const [w, h] of VIEWPORTS) {
          const top = computeTopUiMargin(h)
          for (const x of xs) {
            const bound = x <= seg.revealStartX ? CRUISE_LANE_BOUND : laneBoundForHole(seg.holeRadius)
            for (const lateral of [-bound, -bound / 2, 0, bound / 3, bound]) {
              const view = computeCameraView(x, lateral, w, h, seg, seg.holeRadius)
              const y = computeScreenCentreY(h) + (lateral - view.cameraWorldY) * view.scale
              expect(y - SHIP_HALF_PX).toBeGreaterThanOrEqual(top)
              expect(y + SHIP_HALF_PX).toBeLessThanOrEqual(h)
            }
          }
        }
      }
    }
  })

  it('keeps a frame margin bigger than the drawn ship', () => {
    expect(SHIP_FRAME_MARGIN_PX).toBeGreaterThan(SHIP_HALF_PX)
  })

  it('reserves less HUD room on short screens', () => {
    expect(computeTopUiMargin(390)).toBeLessThan(computeTopUiMargin(900))
    expect(computeTopUiMargin(900)).toBe(120)
  })
})
