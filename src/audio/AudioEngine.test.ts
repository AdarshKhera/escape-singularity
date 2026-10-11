import { describe, expect, it } from 'vitest'
import { AudioEngine } from './AudioEngine'

// No AudioContext exists under the test runner, which is exactly the
// "before start() / audio refused" situation every call must survive.
describe('AudioEngine without a context', () => {
  it('treats UI sounds, jingles and tension as safe no-ops', () => {
    const engine = new AudioEngine()
    expect(() => {
      for (const kind of ['tap', 'back', 'toggle', 'unlock', 'star', 'denied'] as const) engine.playUi(kind)
      engine.playJingle('complete')
      engine.setTension(1)
      engine.setRumble(1)
      engine.playSfx('explosion')
    }).not.toThrow()
    expect(engine.ready).toBe(false)
  })
})
