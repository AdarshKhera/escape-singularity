import { useState } from 'react'
import { useSettingsStore, type TouchControlsMode } from '../state/settingsStore'
import { useProgressStore } from '../state/progressStore'
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

export function SettingsPanel({ allowReset }: SettingsPanelProps) {
  const music = useSettingsStore((s) => s.music)
  const sfx = useSettingsStore((s) => s.sfx)
  const haptics = useSettingsStore((s) => s.haptics)
  const touchControls = useSettingsStore((s) => s.touchControls)
  const setMusic = useSettingsStore((s) => s.setMusic)
  const setSfx = useSettingsStore((s) => s.setSfx)
  const setHaptics = useSettingsStore((s) => s.setHaptics)
  const setTouchControls = useSettingsStore((s) => s.setTouchControls)
  const vibrationSupported = canVibrate()

  const handleHaptics = (on: boolean) => {
    setHaptics(on)
    if (on) vibrate(20)
  }

  return (
    <div className="es-stack" style={{ gap: 0 }}>
      <SettingRow name="Music">
        <Toggle label="Music" checked={music} onChange={setMusic} />
      </SettingRow>
      <SettingRow name="Sound effects">
        <Toggle label="Sound effects" checked={sfx} onChange={setSfx} />
      </SettingRow>
      <SettingRow name="Vibration" hint={vibrationSupported ? undefined : 'Not supported on this device'}>
        <Toggle
          label="Vibration"
          checked={haptics && vibrationSupported}
          onChange={handleHaptics}
          disabled={!vibrationSupported}
        />
      </SettingRow>
      <SettingRow name="Touch controls" hint="Auto shows them on touch screens">
        <Segmented
          label="Touch controls"
          value={touchControls}
          options={TOUCH_OPTIONS}
          onChange={setTouchControls}
        />
      </SettingRow>
      {allowReset && <ResetProgressRow />}
    </div>
  )
}

function ResetProgressRow() {
  const resetProgress = useProgressStore((s) => s.resetProgress)
  const [armed, setArmed] = useState(false)
  const [done, setDone] = useState(false)

  const handleClick = () => {
    if (!armed) {
      setArmed(true)
      return
    }
    resetProgress()
    setArmed(false)
    setDone(true)
  }

  return (
    <SettingRow name="Progress" hint={done ? 'Progress cleared' : 'Locks levels and clears stars'}>
      <Button variant="danger" onClick={handleClick} onBlur={() => setArmed(false)} style={{ minHeight: 34 }}>
        {armed ? 'Tap to confirm' : 'Reset'}
      </Button>
    </SettingRow>
  )
}
