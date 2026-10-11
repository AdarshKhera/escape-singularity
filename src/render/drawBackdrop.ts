import { cachedGradient } from './gradientCache'
import type { NebulaPalette } from './nebulaBackdrop'

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
  6: { top: 'rgba(12,18,34,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(90,130,230,0.10)' },
  7: { top: 'rgba(30,20,10,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(220,150,60,0.10)' },
  8: { top: 'rgba(18,10,30,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(160,90,230,0.11)' },
  9: { top: 'rgba(30,12,12,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(230,80,60,0.11)' },
  10: { top: 'rgba(8,8,14,0.6)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(120,110,170,0.09)' },
  11: { top: 'rgba(10,24,22,0.55)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(60,200,170,0.10)' },
  12: { top: 'rgba(24,8,24,0.6)', bottom: 'rgba(0,0,0,0)', bloom: 'rgba(230,70,200,0.10)' },
}

// Nebula gas per level, matching each backdrop's mood: dominant gas,
// secondary gas, hot accent. Every few levels a distant galaxy hangs there too.
export const NEBULA_PALETTES: Record<number, NebulaPalette> = {
  1: { colours: ['70,120,200', '120,90,200', '200,220,255'], galaxy: true, seed: 11 },
  2: { colours: ['150,80,190', '80,90,200', '255,170,220'], galaxy: false, seed: 23 },
  3: { colours: ['200,90,50', '150,60,90', '255,200,140'], galaxy: false, seed: 37 },
  4: { colours: ['50,170,150', '60,110,190', '190,255,230'], galaxy: true, seed: 41 },
  5: { colours: ['200,60,90', '120,50,140', '255,170,150'], galaxy: false, seed: 53 },
  6: { colours: ['90,130,230', '60,70,160', '220,230,255'], galaxy: false, seed: 67 },
  7: { colours: ['220,150,60', '160,80,50', '255,230,170'], galaxy: true, seed: 71 },
  8: { colours: ['160,90,230', '90,60,180', '230,190,255'], galaxy: false, seed: 83 },
  9: { colours: ['230,80,60', '140,40,60', '255,190,120'], galaxy: false, seed: 97 },
  10: { colours: ['110,105,160', '60,60,100', '200,200,240'], galaxy: true, seed: 101 },
  11: { colours: ['60,200,170', '40,120,140', '200,255,240'], galaxy: false, seed: 113 },
  12: { colours: ['220,70,200', '110,50,170', '255,190,240'], galaxy: true, seed: 127 },
}

export function getNebulaPalette(level: number): NebulaPalette {
  return NEBULA_PALETTES[level] ?? NEBULA_PALETTES[1]
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
