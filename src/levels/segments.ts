import { BLACK_HOLE_RADIUS, computeLevelLayout } from './worldConfig'
import type { HoleSegment, LevelDefinition } from './levelTypes'

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
