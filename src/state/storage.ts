// Thin, failure-proof wrapper around localStorage. Storage can be missing
// (private mode, blocked site data, embedded webviews) or full, and whatever
// it returns is user-controlled, so every read is parsed defensively and then
// handed to a validator by the caller.

const KEY_PREFIX = 'escape-singularity'

export function storageKey(name: string, version: number): string {
  return `${KEY_PREFIX}:${name}:v${version}`
}

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota exceeded or storage disabled: progress simply is not saved
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore, nothing to clean up
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function readInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}
