import type { LevelDefinition } from './levelTypes'
import { level01 } from './data/level01'
import { level02 } from './data/level02'
import { level03 } from './data/level03'
import { level04 } from './data/level04'
import { level05 } from './data/level05'
import { level06 } from './data/level06'
import { level07 } from './data/level07'
import { level08 } from './data/level08'
import { level09 } from './data/level09'
import { level10 } from './data/level10'
import { level11 } from './data/level11'
import { level12 } from './data/level12'

export type {
  ExtraHoleDefinition,
  HoleSegment,
  LevelDefinition,
  SecondHoleDefinition,
} from './levelTypes'
export { computeLevelSegments, activeSegment } from './segments'

// Difficulty escalates on several axes at once: the pull widens its reach and
// strengthens, the reaction window has to stretch to compensate, the safe
// corridor narrows, scripted blockades (mandatory dodges) become more
// frequent, and — per level — there are simply more worlds to cross, spread
// across a longer cruise. The core mechanic never changes; only how early the
// player has to commit and how little room there is to be careless.
//
// Each level's data lives in its own file under ./data.
export const LEVELS: LevelDefinition[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
  level10,
  level11,
  level12,
]

export const MAX_LEVEL = LEVELS.length

export function getLevel(id: number): LevelDefinition {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]
}
