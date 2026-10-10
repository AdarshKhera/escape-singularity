import { create } from 'zustand'
import { MAX_LEVEL } from '../levels/levels'
import { SHIP_SKINS } from '../render/shipSkins'
import { isRecord, readInt, readJson, removeKey, storageKey, writeJson } from './storage'

export interface LevelBest {
  stars: number
  score: number
}

export interface Progress {
  /** highest level the player may start, 1-based, always <= MAX_LEVEL */
  highestUnlocked: number
  /** best result per level id, keyed by String(id) */
  best: Readonly<Record<string, LevelBest>>
  shipSkinId: string
}

interface ProgressState extends Progress {
  recordLevelComplete: (level: number, stars: number, score: number) => void
  setShipSkinId: (id: string) => void
  resetProgress: () => void
}

const PROGRESS_KEY = storageKey('progress', 1)
const MAX_SCORE = 1_000_000_000

export const DEFAULT_PROGRESS: Progress = {
  highestUnlocked: 1,
  best: {},
  shipSkinId: SHIP_SKINS[0].id,
}

function parseBest(raw: unknown): Record<string, LevelBest> {
  if (!isRecord(raw)) return {}
  return Object.entries(raw).reduce<Record<string, LevelBest>>((acc, [key, value]) => {
    const level = Number(key)
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL || !isRecord(value)) return acc
    return {
      ...acc,
      [String(level)]: {
        stars: readInt(value.stars, 0, 3, 0),
        score: readInt(value.score, 0, MAX_SCORE, 0),
      },
    }
  }, {})
}

export function parseProgress(raw: unknown): Progress {
  if (!isRecord(raw)) return DEFAULT_PROGRESS
  const skinId =
    typeof raw.shipSkinId === 'string' && SHIP_SKINS.some((s) => s.id === raw.shipSkinId)
      ? raw.shipSkinId
      : DEFAULT_PROGRESS.shipSkinId
  return {
    highestUnlocked: readInt(raw.highestUnlocked, 1, MAX_LEVEL, 1),
    best: parseBest(raw.best),
    shipSkinId: skinId,
  }
}

export function mergeBest(previous: LevelBest | undefined, stars: number, score: number): LevelBest {
  return {
    stars: Math.max(previous?.stars ?? 0, readInt(stars, 0, 3, 0)),
    score: Math.max(previous?.score ?? 0, readInt(score, 0, MAX_SCORE, 0)),
  }
}

function pickProgress(s: Progress): Progress {
  return { highestUnlocked: s.highestUnlocked, best: s.best, shipSkinId: s.shipSkinId }
}

export const useProgressStore = create<ProgressState>((set) => ({
  ...parseProgress(readJson(PROGRESS_KEY)),

  recordLevelComplete: (level, stars, score) =>
    set((s) => ({
      highestUnlocked: Math.min(MAX_LEVEL, Math.max(s.highestUnlocked, level + 1)),
      best: { ...s.best, [String(level)]: mergeBest(s.best[String(level)], stars, score) },
    })),

  setShipSkinId: (shipSkinId) => set({ shipSkinId }),

  resetProgress: () => {
    removeKey(PROGRESS_KEY)
    set((s) => ({ ...DEFAULT_PROGRESS, shipSkinId: s.shipSkinId }))
  },
}))

useProgressStore.subscribe((state) => writeJson(PROGRESS_KEY, pickProgress(state)))
