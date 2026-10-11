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

/** Distance score toward `dir`; null when the candidate is not that way. */
function directionalScore(from: DOMRect, to: DOMRect, dir: Direction): number | null {
  const a = center(from)
  const b = center(to)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy
  const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
  if (along <= 4) return null
  return along + across * 2.5
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
