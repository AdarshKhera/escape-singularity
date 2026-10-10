import { useEffect, useRef, useState } from 'react'
import { audioEngine } from '../audio/AudioEngine'
import { TRACKS } from '../audio/tracks'
import { useSettingsStore } from '../state/settingsStore'

function wrapIndex(index: number): number {
  return (index + TRACKS.length) % TRACKS.length
}

// Desktop-only track picker, tucked in the bottom-left corner. On touch
// devices sound lives in the pause menu instead. Keys: [ ] change track,
// 1-9 jump to a track, M toggles all sound.
export function MusicBar() {
  const [index, setIndex] = useState(0)
  const indexRef = useRef(0)
  const music = useSettingsStore((s) => s.music)
  const sfx = useSettingsStore((s) => s.sfx)
  const soundOn = music || sfx

  const play = (raw: number) => {
    const next = wrapIndex(raw)
    indexRef.current = next
    setIndex(next)
    audioEngine.playTrack(TRACKS[next].id)
  }
  const playRef = useRef(play)
  playRef.current = play

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'm') {
        const { music: m, sfx: s, setMusic, setSfx } = useSettingsStore.getState()
        const next = !(m || s)
        setMusic(next)
        setSfx(next)
        return
      }
      if (key === '[') return playRef.current(indexRef.current - 1)
      if (key === ']') return playRef.current(indexRef.current + 1)
      const num = Number.parseInt(e.key, 10)
      if (Number.isNaN(num) || num < 1 || num > TRACKS.length) return
      playRef.current(num - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleSound = () => {
    const { setMusic, setSfx } = useSettingsStore.getState()
    setMusic(!soundOn)
    setSfx(!soundOn)
  }

  return (
    <div className="es-musicbar">
      <button type="button" className="es-musicbar__btn" onClick={() => play(index - 1)} aria-label="Previous track">
        ‹
      </button>
      <span className="es-musicbar__title">{TRACKS[index].title}</span>
      <button type="button" className="es-musicbar__btn" onClick={() => play(index + 1)} aria-label="Next track">
        ›
      </button>
      <button
        type="button"
        className="es-musicbar__btn"
        aria-pressed={soundOn}
        onClick={toggleSound}
        aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
        style={{ opacity: soundOn ? 1 : 0.45, textDecoration: soundOn ? 'none' : 'line-through' }}
      >
        ♪
      </button>
    </div>
  )
}
