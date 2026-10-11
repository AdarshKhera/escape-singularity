import { useCallback, useEffect, useState } from 'react'
import { useGameStore } from '../state/gameStore'
import { useSettingsStore } from '../state/settingsStore'
import type { InputMode } from './ControlsGuide'
import { CheckIcon } from './icons'
import { useCoachStore } from './coachStore'
import { coachHint, tipKey } from './coachHints'
import { useTutorialPrompt } from './gameStoreAdapters'
import { useLevelIntroStore } from './levelIntroStore'
import { useActionDetector } from './useActionDetector'

// In-flight coach mark for the game's tutorial prompts. Shows the prompt with
// the right keys (or points at the right touch control), confirms with a
// check when the player does it, and remembers it so it never nags again.

const DONE_FLASH_MS = 700
const NO_ACTION_SEEN_MS = 3500

export function CoachMark({ inputMode }: { inputMode: InputMode }) {
  const prompt = useTutorialPrompt()
  const seenTips = useSettingsStore((s) => s.seenTips)
  const markTipSeen = useSettingsStore((s) => s.markTipSeen)
  const introVisible = useLevelIntroStore((s) => s.visible)
  const live = useGameStore((s) => s.status === 'playing' && !s.paused)
  const setHighlight = useCoachStore((s) => s.setHighlight)
  const [doneId, setDoneId] = useState<number | null>(null)
  const [hiddenId, setHiddenId] = useState<number | null>(null)

  const key = prompt ? tipKey(prompt.text) : null
  const alreadySeen = key !== null && seenTips.includes(key) && doneId !== prompt?.id
  const showing = prompt !== null && !alreadySeen && hiddenId !== prompt.id && live && !introVisible
  const action = prompt?.action ?? null

  const complete = useCallback(() => {
    if (!prompt || !key) return
    setDoneId(prompt.id)
    markTipSeen(key)
  }, [prompt, key, markTipSeen])

  useActionDetector(action, showing && doneId !== prompt?.id, complete)

  // a done tip lingers briefly as a check mark, then gets out of the way
  useEffect(() => {
    if (doneId === null) return
    const timer = window.setTimeout(() => setHiddenId(doneId), DONE_FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [doneId])

  // tips with no action to perform count as seen once they have been read
  useEffect(() => {
    if (!showing || action || !key) return
    const timer = window.setTimeout(() => markTipSeen(key), NO_ACTION_SEEN_MS)
    return () => window.clearTimeout(timer)
  }, [showing, action, key, markTipSeen])

  useEffect(() => {
    const target = showing && inputMode === 'touch' && doneId !== prompt?.id ? action : null
    setHighlight(target)
  }, [showing, inputMode, action, doneId, prompt?.id, setHighlight])

  useEffect(() => () => setHighlight(null), [setHighlight])

  if (!prompt || !showing) return null
  const done = doneId === prompt.id
  const hint = coachHint(action, inputMode)

  return (
    <div key={prompt.id} className={`es-coach${done ? ' es-coach--done' : ''}`} role="status" aria-live="polite">
      <span className="es-coach__text">{prompt.text}</span>
      {done ? (
        <span className="es-coach__hint es-coach__hint--done">
          <CheckIcon />
          Nice
        </span>
      ) : (
        hint && (
          <span className="es-coach__hint">
            {hint.keys.map((k, i) => (
              <kbd key={`${k}-${i}`} className="es-kbd">
                {k}
              </kbd>
            ))}
            {hint.note}
          </span>
        )
      )}
    </div>
  )
}
