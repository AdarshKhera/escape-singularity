import { describe, expect, it } from 'vitest'
import { createQualityMonitor, sampleFrame } from './quality'

function run(monitor: ReturnType<typeof createQualityMonitor>, frameMs: number, seconds: number) {
  let changed = 0
  for (let t = 0; t < seconds * 1000; t += frameMs) if (sampleFrame(monitor, frameMs)) changed++
  return changed
}

describe('adaptive quality', () => {
  it('holds full quality at 60 fps', () => {
    const m = createQualityMonitor()
    run(m, 16.6, 20)
    expect(m.level).toBe(2)
  })

  it('steps down under a sustained struggle and ignores single hitches', () => {
    const m = createQualityMonitor()
    sampleFrame(m, 400)
    run(m, 16.6, 1)
    expect(m.level).toBe(2)
    run(m, 33, 3)
    expect(m.level).toBeLessThan(2)
  })

  it('recovers, but stops retrying a level that keeps failing', () => {
    const m = createQualityMonitor()
    for (let i = 0; i < 2; i++) {
      run(m, 33, 3)
      run(m, 14, 12)
    }
    expect(m.level).toBe(1)
    expect(m.failures[2]).toBe(2)
  })
})
