import { cachedGradient } from './gradientCache'

export interface BackdropTheme {
  /** two stops, top and bottom, both very low alpha */
  top: string
  bottom: string
  /** faint off-centre bloom colour */
  bloom: string
}

// One backdrop per level so each run reads as a different region of space.
// Kept extremely subtle on purpose: the black hole has to stay the darkest
// thing on screen, so these never rise above a faint wash.
export const BACKDROP_THEMES: Record<number, BackdropTheme> = {
  1: { top: 'rgba(10,16,28,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(60,110,190,0.10)' },
  2: { top: 'rgba(26,14,34,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(150,80,190,0.10)' },
  3: { top: 'rgba(34,16,12,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(200,90,50,0.11)' },
  4: { top: 'rgba(10,28,26,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(50,180,160,0.10)' },
  5: { top: 'rgba(28,10,18,0.6)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(210,60,90,0.12)' },
}

export function getBackdropTheme(level: number): BackdropTheme {
  return BACKDROP_THEMES[level] ?? BACKDROP_THEMES[1]
}

// Drawn straight after the black fill and before the stars, so starlight sits
// on top of the wash rather than being tinted by it.
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: BackdropTheme,
  fade: number,
) {
  if (fade <= 0.01) return

  ctx.save()
  ctx.globalAlpha = fade

  // rebuilt only when the viewport or theme changes, not every frame
  const key = `${width}x${height}:${theme.top}:${theme.bloom}`
  ctx.fillStyle = cachedGradient(ctx, `backdrop:wash:${key}`, (c) => {
    const wash = c.createLinearGradient(0, 0, 0, height)
    wash.addColorStop(0, theme.top)
    wash.addColorStop(1, theme.bottom)
    return wash
  })
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = cachedGradient(ctx, `backdrop:bloom:${key}`, (c) => {
    const bloom = c.createRadialGradient(
      width * 0.28,
      height * 0.32,
      0,
      width * 0.28,
      height * 0.32,
      Math.max(width, height) * 0.7,
    )
    bloom.addColorStop(0, theme.bloom)
    bloom.addColorStop(1, 'rgba(0,0,0,0)')
    return bloom
  })
  ctx.fillRect(0, 0, width, height)

  ctx.restore()
  ctx.globalAlpha = 1
}
