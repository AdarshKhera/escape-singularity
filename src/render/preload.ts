import { loadSprites } from './loadSprites'

// Warms the browser cache for every sprite the game draws, so the first level
// never pops in, and reports progress for the boot screen. A sprite that
// fails to load still counts as done: the game already tolerates a missing
// frame, and a broken file must not strand the player on the loader.

function collectImages(value: unknown, out: Set<HTMLImageElement>): void {
  if (value instanceof HTMLImageElement) {
    out.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectImages(item, out)
  } else if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) collectImages(item, out)
  }
}

export interface PreloadHandle {
  done: Promise<void>
}

export function preloadAssets(onProgress: (fraction: number) => void): PreloadHandle {
  const images = new Set<HTMLImageElement>()
  collectImages(loadSprites(), images)
  const fontsReady: Promise<unknown> =
    typeof document !== 'undefined' && 'fonts' in document ? document.fonts.ready : Promise.resolve()

  const total = images.size + 1
  let finished = 0
  const tick = () => {
    finished += 1
    onProgress(Math.min(finished / total, 1))
  }

  const jobs = [...images].map(
    (img) =>
      new Promise<void>((resolve) => {
        const settle = () => {
          tick()
          resolve()
        }
        if (img.complete) settle()
        else {
          img.addEventListener('load', settle, { once: true })
          img.addEventListener('error', settle, { once: true })
        }
      }),
  )
  jobs.push(
    fontsReady.then(
      () => tick(),
      () => tick(),
    ),
  )
  return { done: Promise.all(jobs).then(() => undefined) }
}
