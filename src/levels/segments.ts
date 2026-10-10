import { BLACK_HOLE_RADIUS, computeLevelLayout, computeRevealLead } from './worldConfig'
import type { HoleSegment, LevelDefinition } from './levelTypes'

// One or more hole passages, chained end to end. Each is computed completely
// independently via computeLevelLayout: the next starts its own
// cruise/approach/escape cycle after the previous one ends (plus a breather
// gap and its own debris run), so none of the single-hole physics has to
// know another hole exists at all.
//
// Segments are pure functions of the level definition, so they are built
// once per level and shared (callers treat them as read-only).
const cache = new WeakMap<LevelDefinition, HoleSegment[]>()

export function computeLevelSegments(level: LevelDefinition): HoleSegment[] {
  const cached = cache.get(level)
  if (cached) return cached
  const segments = buildSegments(level)
  cache.set(level, segments)
  return segments
}

function buildSegments(level: LevelDefinition): HoleSegment[] {
  const first = computeLevelLayout(level.cruiseEndX, level.approachLeadSeconds)
  const segments: HoleSegment[] = [
    {
      ...first,
      holeRadius: BLACK_HOLE_RADIUS,
      holeName: level.blackHoleName,
      holeDescription: level.blackHoleDescription,
    },
  ]

  for (const extra of level.extraHoles ?? []) {
    const previous = segments[segments.length - 1]
    // the next reveal only begins after a calm gap past the previous level end
    const cruiseEndX =
      previous.levelEndX + extra.gapX + computeRevealLead(extra.approachLeadSeconds)
    const next = computeLevelLayout(cruiseEndX, extra.approachLeadSeconds)
    segments.push({
      ...next,
      holeRadius: BLACK_HOLE_RADIUS * extra.radiusMultiplier,
      holeName: extra.name,
      holeDescription: extra.description,
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
