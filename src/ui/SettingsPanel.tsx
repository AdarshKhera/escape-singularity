import { useState } from 'react'
import { useSettingsStore, type TouchControlsMode } from '../state/settingsStore'
import { useProgressStore } from '../state/progressStore'
import { useRecordsStore } from '../state/recordsStore'
import { Button, Segmented, SettingRow, Toggle } from './primitives'
import { canVibrate, vibrate } from './haptics'

const TOUCH_OPTIONS: readonly { value: TouchControlsMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

interface SettingsPanelProps {
  /** progress reset is only offered from the main menu, never mid-run */
  allowReset?: boolean
}

// Two groups that sit side by side on landscape phones, so the whole panel
// fits a 360px tall screen without scrolling.
export function SettingsPanel({ allowReset }: SettingsPanelProps) {
  return (
    <div className="es-settings">
      <div className="es-settings__group">
        <span className="es-label es-settings__title">Sound and feel</span>
        <AudioRows />
      </div>
      <div className="es-settings__group">
        <span className="es-label es-settings__title">Controls and data</span>
        <ControlRows />
        <ResetTutorialRow />
        {allowReset && <ResetProgressRow />}
      </div>
    </div>
  )
}

function AudioRows() {
  const music = useSettingsStore((s) => s.music)
  const sfx = useSettingsStore((s) => s.sfx)
  const haptics = useSettingsStore((s) => s.haptics)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const setMusic = useSettingsStore((s) => s.setMusic)
  const setSfx = useSettingsStore((s) => s.setSfx)
  const setHaptics = useSettingsStore((s) => s.setHaptics)
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion)
  const vibrationSupported = canVibrate()

  const handleHaptics = (on: boolean) => {
    setHaptics(on)
    if (on) vibrate(20)
  }

  return (
    <>
      <SettingRow name="Music">
        <Toggle label="Music" checked={music} onChange={setMusic} />
      </SettingRow>
      <SettingRow name="Sound effects">
        <Toggle label="Sound effects" checked={sfx} onChange={setSfx} />
      </SettingRow>
      <SettingRow name="Vibration" hint={vibrationSupported ? undefined : 'Not supported here'}>
        <Toggle
          label="Vibration"
          checked={haptics && vibrationSupported}
          onChange={handleHaptics}
          disabled={!vibrationSupported}
        />
      </SettingRow>
      <SettingRow name="Reduced motion" hint="Calmer menus and screens">
        <Toggle label="Reduced motion" checked={reducedMotion} onChange={setReducedMotion} />
      </SettingRow>
    </>
  )
}

function ControlRows() {
  const touchControls = useSettingsStore((s) => s.touchControls)
  const setTouchControls = useSettingsStore((s) => s.setTouchControls)
  return (
    <SettingRow name="Touch controls" hint="Auto: on for touch screens">
      <Segmented label="Touch controls" value={touchControls} options={TOUCH_OPTIONS} onChange={setTouchControls} />
    </SettingRow>
  )
}

function ResetTutorialRow() {
  const seenCount = useSettingsStore((s) => s.seenTips.length)
  const resetTips = useSettingsStore((s) => s.resetTips)
  const [done, setDone] = useState(false)

  const handleClick = () => {
    resetTips()
    setDone(true)
  }

  return (
    <SettingRow name="Tutorial" hint={done ? 'Tips will show again' : 'Replay the in-flight tips'}>
      <Button className="es-setting__btn" onClick={handleClick} disabled={seenCount === 0}>
        Reset
      </Button>
    </SettingRow>
  )
}

function ResetProgressRow() {
  const resetProgress = useProgressStore((s) => s.resetProgress)
  const resetRecords = useRecordsStore((s) => s.resetRecords)
  const [armed, setArmed] = useState(false)
  const [done, setDone] = useState(false)

  const handleClick = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    resetProgress()
    resetRecords()
    setArmed(false)
    setDone(true)
  }

  return (
    <SettingRow name="Progress" hint={done ? 'Progress cleared' : 'Clears stars, ships and records'}>
      <Button
        variant="danger"
        className="es-setting__btn"
        data-sound={armed ? 'denied' : 'tap'}
        onClick={handleClick}
        onBlur={() => setArmed(false)}
      >
        {armed ? 'Confirm' : 'Reset'}
      </Button>
    </SettingRow>
  )
}
