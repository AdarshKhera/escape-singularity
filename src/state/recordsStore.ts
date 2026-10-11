import { create } from 'zustand'
import { MAX_LEVEL } from '../levels/levels'
import { isRecord, readInt, readIntSet, readJson, removeKey, storageKey, writeJson } from './storage'

// Lifetime counters for the Records screen and achievements. Only things the
// game actually reports are tracked, so every number shown is real.

export interface LifetimeCounters {
  asteroidsDestroyed: number
  pickupsCollected: number
  nearMisses: number
  slingshots: number
  /** every level clear, replays included */
  levelsCleared: number
  /** ships lost, black holes included */
  shipsLost: number
}

export interface Records extends LifetimeCounters {
  /** level ids cleared at least once without losing a ship */
  flawlessLevels: readonly number[]
  /** fastest clear per level id, ms of game time */
  fastestMs: Readonly<Record<string, number>>
}

export interface ClearReport {
  level: number
  /** null when the game did not report it */
  livesLost: number | null
  timeMs: number | null
}

interface RecordsState extends Records {
  addCounters: (delta: Partial<LifetimeCounters>) => void
  recordClear: (report: ClearReport) => void
  resetRecords: () => void
}

const RECORDS_KEY = storageKey('records', 1)
const MAX_COUNT = 100_000_000
const MAX_TIME_MS = 24 * 60 * 60 * 1000

export const COUNTER_KEYS: readonly (keyof LifetimeCounters)[] = [
  'asteroidsDestroyed',
  'pickupsCollected',
  'nearMisses',
  'slingshots',
  'levelsCleared',
  'shipsLost',
]

export const DEFAULT_RECORDS: Records = {
  asteroidsDestroyed: 0,
  pickupsCollected: 0,
  nearMisses: 0,
  slingshots: 0,
  levelsCleared: 0,
  shipsLost: 0,
  flawlessLevels: [],
  fastestMs: {},
}

function parseFastest(raw: unknown): Record<string, number> {
  if (!isRecord(raw)) return {}
  return Object.entries(raw).reduce<Record<string, number>>((acc, [key, value]) => {
    const level = Number(key)
    const ms = readInt(value, 0, MAX_TIME_MS, 0)
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL || ms <= 0) return acc
    return { ...acc, [String(level)]: ms }
  }, {})
}

export function parseRecords(raw: unknown): Records {
  if (!isRecord(raw)) return DEFAULT_RECORDS
  const counters = COUNTER_KEYS.reduce<LifetimeCounters>(
    (acc, key) => ({ ...acc, [key]: readInt(raw[key], 0, MAX_COUNT, 0) }),
    DEFAULT_RECORDS,
  )
  return {
    ...counters,
    flawlessLevels: readIntSet(raw.flawlessLevels, 1, MAX_LEVEL),
    fastestMs: parseFastest(raw.fastestMs),
  }
}

export function applyCounters(records: Records, delta: Partial<LifetimeCounters>): Records {
  return COUNTER_KEYS.reduce<Records>((acc, key) => {
    const add = delta[key]
    if (typeof add !== 'number' || !Number.isFinite(add) || add <= 0) return acc
    return { ...acc, [key]: Math.min(MAX_COUNT, acc[key] + Math.round(add)) }
  }, records)
}

export function applyClear(records: Records, report: ClearReport): Records {
  const key = String(report.level)
  const flawless = report.livesLost === 0 && !records.flawlessLevels.includes(report.level)
  const previous = records.fastestMs[key]
  const time = report.timeMs !== null && report.timeMs > 0 ? Math.min(MAX_TIME_MS, Math.round(report.timeMs)) : null
  const faster = time !== null && (previous === undefined || time < previous)
  return {
    ...applyCounters(records, { levelsCleared: 1 }),
    flawlessLevels: flawless ? [...records.flawlessLevels, report.level].sort((a, b) => a - b) : records.flawlessLevels,
    fastestMs: faster ? { ...records.fastestMs, [key]: time } : records.fastestMs,
  }
}

function pickRecords(s: Records): Records {
  return {
    ...COUNTER_KEYS.reduce<LifetimeCounters>((acc, key) => ({ ...acc, [key]: s[key] }), DEFAULT_RECORDS),
    flawlessLevels: s.flawlessLevels,
    fastestMs: s.fastestMs,
  }
}

export const useRecordsStore = create<RecordsState>((set) => ({
  ...parseRecords(readJson(RECORDS_KEY)),
  addCounters: (delta) => set((s) => applyCounters(pickRecords(s), delta)),
  recordClear: (report) => set((s) => applyClear(pickRecords(s), report)),
  resetRecords: () => {
    removeKey(RECORDS_KEY)
    set(DEFAULT_RECORDS)
  },
}))

useRecordsStore.subscribe((state) => writeJson(RECORDS_KEY, pickRecords(state)))
