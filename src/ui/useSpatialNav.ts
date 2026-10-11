import { useEffect } from 'react'

// Arrow-key focus movement for menus and overlays: picks the nearest
// focusable control in the pressed direction, so grids, lists and button
// rows all navigate the way they look. Tab, Enter and Space stay native.
// Inactive during live play because no menu or overlay is on screen then.

type Direction = 'up' | 'down' | 'left' | 'right'

const KEY_TO_DIRECTION: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

const FOCUSABLE = 'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
const SCOPES = ['.es-overlay', '.es-sheet', '.es-menu'] as const

function activeScope(): HTMLElement | null {
  for (const selector of SCOPES) {
    const all = document.querySelectorAll<HTMLElement>(selector)
    const last = all[all.length - 1]
    if (last) return last
  }
  return null
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/** Gap between two 1D intervals; 0 when they overlap. */
function intervalGap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, b1 - a2, a1 - b2)
}

/** Edge distance from `from` to `to` in `dir`; negative when `to` is not past that edge. */
function edgeDistance(from: DOMRect, to: DOMRect, dir: Direction): number {
  switch (dir) {
    case 'right':
      return to.left - from.right
    case 'left':
      return from.left - to.right
    case 'down':
      return to.top - from.bottom
    case 'up':
      return from.top - to.bottom
  }
}

/** Distance score toward `dir`; null when the candidate is not that way. */
function directionalScore(from: DOMRect, to: DOMRect, dir: Direction): number | null {
  const along = edgeDistance(from, to, dir)
  if (along < -4) return null
  const horizontal = dir === 'left' || dir === 'right'
  const across = horizontal
    ? intervalGap(from.top, from.bottom, to.top, to.bottom)
    : intervalGap(from.left, from.right, to.left, to.right)
  const a = center(from)
  const b = center(to)
  const offset = horizontal ? Math.abs(b.y - a.y) : Math.abs(b.x - a.x)
  const forward = Math.max(0, along)
  // a control that is mostly sideways is not "that way"; stay put instead
  if (across > forward * 1.5 + 4) return null
  // rounded so near-ties fall back to reading order
  return Math.round(forward + across * 3 + offset * 0.1)
}

export function nextFocusTarget(
  current: HTMLElement | null,
  candidates: readonly HTMLElement[],
  dir: Direction,
): HTMLElement | null {
  if (candidates.length === 0) return null
  if (!current || !candidates.includes(current)) return candidates[0]
  const from = current.getBoundingClientRect()
  let best: { el: HTMLElement; score: number } | null = null
  for (const el of candidates) {
    if (el === current) continue
    const score = directionalScore(from, el.getBoundingClientRect(), dir)
    if (score !== null && (!best || score < best.score)) best = { el, score }
  }
  return best?.el ?? null
}

export function useSpatialNav(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIRECTION[e.key]
      if (!dir || e.altKey || e.ctrlKey || e.metaKey) return
      const scope = activeScope()
      if (!scope) return
      const candidates = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isVisible)
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
      const target = nextFocusTarget(active, candidates, dir)
      if (!target) return
      e.preventDefault()
      target.focus({ preventScroll: true })
      target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
