import { create } from 'zustand'
import { isRecord, readBoolean, readJson, storageKey, writeJson } from './storage'

export type TouchControlsMode = 'auto' | 'on' | 'off'

export interface Settings {
  music: boolean
  sfx: boolean
  haptics: boolean
  touchControls: TouchControlsMode
}

interface SettingsState extends Settings {
  setMusic: (on: boolean) => void
  setSfx: (on: boolean) => void
  setHaptics: (on: boolean) => void
  setTouchControls: (mode: TouchControlsMode) => void
}

const SETTINGS_KEY = storageKey('settings', 1)
const TOUCH_MODES: readonly TouchControlsMode[] = ['auto', 'on', 'off']

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sfx: true,
  haptics: true,
  touchControls: 'auto',
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
  }
}

function pickSettings(s: Settings): Settings {
  return { music: s.music, sfx: s.sfx, haptics: s.haptics, touchControls: s.touchControls }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...parseSettings(readJson(SETTINGS_KEY)),
  setMusic: (music) => set({ music }),
  setSfx: (sfx) => set({ sfx }),
  setHaptics: (haptics) => set({ haptics }),
  setTouchControls: (touchControls) => set({ touchControls }),
}))

useSettingsStore.subscribe((state) => writeJson(SETTINGS_KEY, pickSettings(state)))
