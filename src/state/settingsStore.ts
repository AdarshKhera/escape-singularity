import { create } from 'zustand'
import { isRecord, readBoolean, readJson, readStringList, storageKey, writeJson } from './storage'

export type TouchControlsMode = 'auto' | 'on' | 'off'

export interface Settings {
  music: boolean
  sfx: boolean
  haptics: boolean
  touchControls: TouchControlsMode
  /** turns off UI animation even when the OS does not ask for it */
  reducedMotion: boolean
  /** tutorial coach marks already shown, so they never nag twice */
  seenTips: readonly string[]
}

interface SettingsState extends Settings {
  setMusic: (on: boolean) => void
  setSfx: (on: boolean) => void
  setHaptics: (on: boolean) => void
  setTouchControls: (mode: TouchControlsMode) => void
  setReducedMotion: (on: boolean) => void
  markTipSeen: (key: string) => void
  resetTips: () => void
}

const SETTINGS_KEY = storageKey('settings', 1)
const TOUCH_MODES: readonly TouchControlsMode[] = ['auto', 'on', 'off']
const MAX_TIPS = 40
const MAX_TIP_KEY_LENGTH = 120

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sfx: true,
  haptics: true,
  touchControls: 'auto',
  reducedMotion: false,
  seenTips: [],
}

function isTouchMode(value: unknown): value is TouchControlsMode {
  return typeof value === 'string' && (TOUCH_MODES as readonly string[]).includes(value)
}

export function parseSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return DEFAULT_SETTINGS
  return {
    music: readBoolean(raw.music, DEFAULT_SETTINGS.music),
    sfx: readBoolean(raw.sfx, DEFAULT_SETTINGS.sfx),
    haptics: readBoolean(raw.haptics, DEFAULT_SETTINGS.haptics),
    touchControls: isTouchMode(raw.touchControls) ? raw.touchControls : DEFAULT_SETTINGS.touchControls,
    reducedMotion: readBoolean(raw.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    seenTips: readStringList(raw.seenTips, MAX_TIPS, MAX_TIP_KEY_LENGTH),
  }
}

/** Adds a tip key once, keeping the list bounded (oldest dropped first). */
export function addSeenTip(seen: readonly string[], key: string): readonly string[] {
  const trimmed = key.slice(0, MAX_TIP_KEY_LENGTH)
  if (!trimmed || seen.includes(trimmed)) return seen
  return [...seen, trimmed].slice(-MAX_TIPS)
}

function pickSettings(s: Settings): Settings {
  return {
    music: s.music,
    sfx: s.sfx,
    haptics: s.haptics,
    touchControls: s.touchControls,
    reducedMotion: s.reducedMotion,
    seenTips: s.seenTips,
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...parseSettings(readJson(SETTINGS_KEY)),
  setMusic: (music) => set({ music }),
  setSfx: (sfx) => set({ sfx }),
  setHaptics: (haptics) => set({ haptics }),
  setTouchControls: (touchControls) => set({ touchControls }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  markTipSeen: (key) => set((s) => ({ seenTips: addSeenTip(s.seenTips, key) })),
  resetTips: () => set({ seenTips: [] }),
}))

useSettingsStore.subscribe((state) => writeJson(SETTINGS_KEY, pickSettings(state)))
