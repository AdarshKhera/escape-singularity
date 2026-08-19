import { useEffect, useState, type CSSProperties } from 'react'
import { audioEngine } from '../audio/AudioEngine'
import { TRACKS } from '../audio/tracks'

// Compact left/right track selector rather than every track listed at once.
export function MusicBar() {
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(audioEngine.isMuted)

  const play = (nextIndex: number) => {
    const wrapped = (nextIndex + TRACKS.length) % TRACKS.length
    setIndex(wrapped)
    audioEngine.playTrack(TRACKS[wrapped].id)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'm') {
        setMuted(audioEngine.toggleMute())
        return
      }
      if (key === '[') {
        setIndex((i) => {
          const next = (i - 1 + TRACKS.length) % TRACKS.length
          audioEngine.playTrack(TRACKS[next].id)
          return next
        })
        return
      }
      if (key === ']') {
        setIndex((i) => {
          const next = (i + 1) % TRACKS.length
          audioEngine.playTrack(TRACKS[next].id)
          return next
        })
        return
      }
      const num = Number.parseInt(e.key, 10)
      if (Number.isNaN(num) || num < 1 || num > TRACKS.length) return
      setIndex(num - 1)
      audioEngine.playTrack(TRACKS[num - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={barStyle}>
      <button style={arrowStyle} onClick={() => play(index - 1)} aria-label="Previous track">
        ‹
      </button>
      <span style={titleStyle}>{TRACKS[index].title}</span>
      <button style={arrowStyle} onClick={() => play(index + 1)} aria-label="Next track">
        ›
      </button>
      <button style={muteStyle} onClick={() => setMuted(audioEngine.toggleMute())}>
        {muted ? '♪̸' : '♪'}
      </button>
    </div>
  )
}

const barStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 10,
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  background: 'rgba(8,12,20,0.5)',
  border: '1px solid rgba(191,227,255,0.12)',
  borderRadius: 5,
  backdropFilter: 'blur(3px)',
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: '#bfe3ff',
}

const titleStyle: CSSProperties = {
  minWidth: 96,
  textAlign: 'center',
  opacity: 0.85,
}

const arrowStyle: CSSProperties = {
  width: 20,
  height: 20,
  padding: 0,
  fontFamily: 'monospace',
  fontSize: 13,
  lineHeight: 1,
  background: 'transparent',
  border: '1px solid rgba(191,227,255,0.2)',
  borderRadius: 3,
  color: '#bfe3ff',
  cursor: 'pointer',
}

const muteStyle: CSSProperties = {
  ...arrowStyle,
  marginLeft: 2,
}
