// Each black hole burns in its own colour: the same disk, a different
// temperature. A palette is just the hot inner edge, the body of the disk and
// the cool outer rim; everything else (arcs, Doppler glow, photon bloom,
// infalling matter) is derived from those three.

export type Rgb = readonly [number, number, number]

export interface HolePalette {
  id: string
  hot: Rgb
  mid: Rgb
  cool: Rgb
}

export const EMBER: HolePalette = {
  id: 'ember',
  hot: [255, 236, 205],
  mid: [255, 176, 96],
  cool: [214, 92, 48],
}

export const HOLE_PALETTES: readonly HolePalette[] = [
  EMBER,
  { id: 'gold', hot: [255, 246, 208], mid: [255, 208, 100], cool: [196, 128, 40] },
  { id: 'rose', hot: [255, 230, 236], mid: [255, 142, 172], cool: [186, 62, 112] },
  { id: 'violet', hot: [242, 230, 255], mid: [178, 142, 255], cool: [102, 62, 192] },
  { id: 'ice', hot: [230, 246, 255], mid: [124, 192, 255], cool: [52, 104, 204] },
  { id: 'teal', hot: [224, 255, 246], mid: [98, 222, 192], cool: [32, 134, 124] },
]

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}

function hashName(name: string): number {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Assigned by hand so neighbouring levels never share a tone ("Sol" is gold on
// purpose: it is what the Sun became). Unknown names fall back to a hash.
const ASSIGNED: Readonly<Record<string, string>> = {
  Cradlefall: 'ember',
  'The Tithe': 'gold',
  'Ashfall Dark': 'rose',
  Sol: 'gold',
  'Cygnus Null': 'ice',
  Velatine: 'violet',
  'The Rimward Dark': 'ember',
  "The Rim's End": 'violet',
  'The Fault': 'rose',
  'The Deeper Fault': 'teal',
  'The Maw': 'ice',
  "The Maw's Throat": 'gold',
  'The Drifter': 'violet',
  'The Drifter Prime': 'ember',
  'The Outer Horizon': 'rose',
  'The Middle Horizon': 'ice',
  'The Singularity': 'teal',
}

/** Stable per hole: the same name always burns the same colour. */
export function paletteForHole(name: string): HolePalette {
  const assigned = HOLE_PALETTES.find((p) => p.id === ASSIGNED[name])
  return assigned ?? HOLE_PALETTES[hashName(name) % HOLE_PALETTES.length]
}
