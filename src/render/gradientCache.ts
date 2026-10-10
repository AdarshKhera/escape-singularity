// Canvas gradients are tied to the context that made them, and building a
// fresh one every frame for every large glow is measurable churn on
// mid-range phones. Gradients that never change shape are built once in
// unit space (radius 1, centred on the origin) and drawn under a
// translate/scale transform instead; only alpha varies, via globalAlpha.

const caches = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasGradient>>()

export function cachedGradient(
  ctx: CanvasRenderingContext2D,
  key: string,
  build: (ctx: CanvasRenderingContext2D) => CanvasGradient,
): CanvasGradient {
  let cache = caches.get(ctx)
  if (!cache) {
    cache = new Map()
    caches.set(ctx, cache)
  }
  let gradient = cache.get(key)
  if (!gradient) {
    gradient = build(ctx)
    cache.set(key, gradient)
  }
  return gradient
}

// Picks a frame from an animated sprite list without allocating, falling
// back to any loaded frame while the rest are still decoding.
export function pickReadyFrame(
  frames: HTMLImageElement[],
  index: number,
): HTMLImageElement | null {
  const count = frames.length
  if (count === 0) return null
  for (let i = 0; i < count; i++) {
    const frame = frames[(index + i) % count]
    if (frame.complete && frame.naturalWidth > 0) return frame
  }
  return null
}
