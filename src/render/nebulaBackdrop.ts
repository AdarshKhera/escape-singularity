// A faint nebula (and, on some levels, a distant galaxy) behind the stars,
// different per level. Painted procedurally ONCE into an offscreen canvas
// that tiles horizontally, then drawn each frame as a single slow-scrolling
// image, the furthest parallax layer. Kept dim: the black hole must stay the
// darkest thing on screen and the nebula must never compete with hazards.

export interface NebulaPalette {
  /** three rgb triplets, "r,g,b": dominant gas, secondary gas, hot accent */
  colours: [string, string, string]
  /** draw a distant spiral galaxy smudge on this level */
  galaxy: boolean
  seed: number
}

const TILE_WIDTH = 1024
const TILE_HEIGHT = 512
const TAU = Math.PI * 2
// how much of the camera's motion the nebula follows
export const NEBULA_DEPTH = 0.006

const cache = new Map<number, HTMLCanvasElement | null>()

function rand(seed: number): number {
  const x = Math.sin(seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// a soft blob, wrapped so the tile repeats seamlessly left to right
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  for (const shift of [-TILE_WIDTH, 0, TILE_WIDTH]) {
    const cx = x + shift
    if (cx + r < 0 || cx - r > TILE_WIDTH) continue
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, r)
    g.addColorStop(0, `rgba(${rgb}, ${alpha})`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - r, y - r, r * 2, r * 2)
  }
}

function paintGas(ctx: CanvasRenderingContext2D, palette: NebulaPalette) {
  const { colours, seed } = palette
  // gas gathers along a lazy filament that wanders across the tile
  const phase = rand(seed) * TAU
  const amplitude = 60 + rand(seed + 1) * 90
  for (let i = 0; i < 150; i++) {
    const u = rand(seed + i * 1.37)
    const x = u * TILE_WIDTH
    const spine = TILE_HEIGHT * 0.5 + Math.sin(u * TAU * 2 + phase) * amplitude
    const y = spine + (rand(seed + i * 2.71) - 0.5) * 220
    const r = 40 + rand(seed + i * 3.3) * 150
    const pick = rand(seed + i * 4.1)
    const rgb = pick < 0.55 ? colours[0] : pick < 0.88 ? colours[1] : colours[2]
    blob(ctx, x, y, r, rgb, 0.035 + rand(seed + i * 5.9) * 0.05)
  }
  // dark dust lanes carve structure into the glow
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 40; i++) {
    const x = rand(seed + i * 6.7 + 100) * TILE_WIDTH
    const y = TILE_HEIGHT * 0.5 + (rand(seed + i * 7.3 + 100) - 0.5) * 260
    blob(ctx, x, y, 30 + rand(seed + i * 8.1) * 70, '0,0,0', 0.5)
  }
  ctx.globalCompositeOperation = 'source-over'
}

function paintGalaxy(ctx: CanvasRenderingContext2D, palette: NebulaPalette) {
  const x = 160 + rand(palette.seed + 50) * (TILE_WIDTH - 320)
  const y = 90 + rand(palette.seed + 51) * (TILE_HEIGHT - 180)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rand(palette.seed + 52) * Math.PI)
  ctx.scale(1, 0.32)
  const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, 70)
  disc.addColorStop(0, 'rgba(255, 240, 220, 0.5)')
  disc.addColorStop(0.15, `rgba(${palette.colours[2]}, 0.22)`)
  disc.addColorStop(0.6, `rgba(${palette.colours[1]}, 0.06)`)
  disc.addColorStop(1, `rgba(${palette.colours[1]}, 0)`)
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, 70, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// distant star dust baked into the tile: a free fourth star layer
function paintDust(ctx: CanvasRenderingContext2D, seed: number) {
  for (let i = 0; i < 520; i++) {
    const a = 0.08 + rand(seed + i * 9.1) * 0.28
    ctx.fillStyle = `rgba(220, 228, 255, ${a})`
    const size = rand(seed + i * 3.9) < 0.92 ? 1 : 1.6
    ctx.fillRect(rand(seed + i * 1.1) * TILE_WIDTH, rand(seed + i * 2.2) * TILE_HEIGHT, size, size)
  }
}

function paintNebula(palette: NebulaPalette): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = TILE_WIDTH
  canvas.height = TILE_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  paintGas(ctx, palette)
  if (palette.galaxy) paintGalaxy(ctx, palette)
  paintDust(ctx, palette.seed)
  return canvas
}

function nebulaFor(level: number, palette: NebulaPalette): HTMLCanvasElement | null {
  if (!cache.has(level)) cache.set(level, paintNebula(palette))
  return cache.get(level) ?? null
}

/** Paint a level's nebula ahead of time so the first frame doesn't hitch. */
export function prepareNebula(level: number, palette: NebulaPalette): void {
  nebulaFor(level, palette)
}

export function drawNebula(
  ctx: CanvasRenderingContext2D,
  level: number,
  palette: NebulaPalette,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  alpha: number,
): void {
  if (alpha <= 0.01) return
  const tile = nebulaFor(level, palette)
  if (!tile) return
  // the tile is stretched to cover the height with room to drift vertically
  const scale = (height * 1.3) / TILE_HEIGHT
  const tileW = TILE_WIDTH * scale
  const shiftX = (((offsetX * NEBULA_DEPTH) % tileW) + tileW) % tileW
  const drift = Math.max(-height * 0.14, Math.min(height * 0.14, offsetY * NEBULA_DEPTH))
  const y = -height * 0.15 - drift
  ctx.save()
  ctx.globalAlpha = alpha
  for (let x = -shiftX; x < width; x += tileW) {
    ctx.drawImage(tile, x, y, tileW, TILE_HEIGHT * scale)
  }
  ctx.restore()
}
