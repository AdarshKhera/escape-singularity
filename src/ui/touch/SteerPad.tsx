import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type PointerEvent } from 'react'
import { clampKnob, steerFromOffset, type Axis } from '../../input/touchInput'

const DEADZONE_PX = 12
const KNOB_TRAVEL_PX = 52

export interface SteerPadHandle {
  release: () => void
}

interface SteerPadProps {
  onSteer: (axis: Axis) => void
}

// Vertical steer pad for the left thumb. Pressing above the centre steers up,
// below steers down; sliding the thumb across the centre switches direction
// without lifting. Pointer capture keeps tracking even off the pad.
export const SteerPad = forwardRef<SteerPadHandle, SteerPadProps>(function SteerPad({ onSteer }, ref) {
  const padRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<number | null>(null)
  const axisRef = useRef<Axis>(0)
  const [knob, setKnob] = useState(0)
  const [active, setActive] = useState(false)
  const [axis, setAxis] = useState<Axis>(0)

  const emit = useCallback(
    (axis: Axis) => {
      if (axis === axisRef.current) return
      axisRef.current = axis
      setAxis(axis)
      onSteer(axis)
    },
    [onSteer],
  )

  const release = useCallback(() => {
    pointerRef.current = null
    setActive(false)
    setKnob(0)
    emit(0)
  }, [emit])

  useImperativeHandle(ref, () => ({ release }), [release])

  const track = (clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect()
    if (!rect) return
    const offset = clientY - (rect.top + rect.height / 2)
    setKnob(clampKnob(offset, KNOB_TRAVEL_PX))
    emit(steerFromOffset(offset, DEADZONE_PX))
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerRef.current !== null) return
    e.preventDefault()
    pointerRef.current = e.pointerId
    setActive(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore: release handlers still fire on pointerup
    }
    track(e.clientY)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === pointerRef.current) track(e.clientY)
  }

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === pointerRef.current) release()
  }

  return (
    <div
      ref={padRef}
      className="es-steer"
      data-active={active}
      role="slider"
      aria-label="Steer"
      aria-orientation="vertical"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={axis}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      <div className="es-steer__track">
        <Chevron up active={axis === -1} />
        <Chevron active={axis === 1} />
        <div className="es-steer__knob" style={{ transform: `translate(-50%, calc(-50% + ${knob}px))` }} />
      </div>
    </div>
  )
})

function Chevron({ up, active }: { up?: boolean; active: boolean }) {
  return (
    <svg
      className={`es-steer__chevron es-steer__chevron--${up ? 'up' : 'down'}`}
      data-active={active}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}
