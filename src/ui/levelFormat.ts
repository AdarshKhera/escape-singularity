import { getLevel } from '../levels/levels'

// Level data may use long dashes as separators ("Sol System — Inner Worlds").
// User-facing copy avoids them, so names are normalised for display.
export function displayText(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ': ')
}

export function levelName(level: number): string {
  return displayText(getLevel(level).name)
}

export function levelSubtitle(level: number): string {
  return displayText(getLevel(level).subtitle)
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatScore(score: number): string {
  return Math.round(score).toLocaleString('en-US')
}
