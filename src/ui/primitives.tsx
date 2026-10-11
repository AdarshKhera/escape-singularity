import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { STAR_PATH } from './icons'

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  icon?: boolean
}

export function Button({ variant = 'default', block, icon, className, type, ...rest }: ButtonProps) {
  const classes = [
    'es-btn',
    variant !== 'default' && `es-btn--${variant}`,
    block && 'es-btn--block',
    icon && 'es-btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type={type ?? 'button'} className={classes} {...rest} />
}

interface OverlayProps {
  children: ReactNode
  /** label read by screen readers for the dialog */
  label: string
  width?: number
}

// Overlays can appear mid-touch (a level ends while a thumb is on Thrust),
// so they ignore taps briefly; otherwise a finger lifting from a control
// could press whatever button just appeared under it.
const OVERLAY_ARM_MS = 350

export function Overlay({ children, label, width }: OverlayProps) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), OVERLAY_ARM_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="es-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div
        className="es-overlay__card es-panel"
        style={{ width: width ? `min(${width}px, 100%)` : undefined, pointerEvents: armed ? undefined : 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="es-toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (next: T) => void
  label: string
}

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="es-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="es-segmented__item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface SettingRowProps {
  name: string
  hint?: string
  children: ReactNode
}

export function SettingRow({ name, hint, children }: SettingRowProps) {
  return (
    <div className="es-setting">
      <div className="es-setting__text">
        <span className="es-setting__name">{name}</span>
        {hint && <span className="es-setting__hint">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

interface StarRowProps {
  stars: number
  size?: number
  animated?: boolean
}

export function StarRow({ stars, size = 14, animated }: StarRowProps) {
  return (
    <span
      className={`es-stars${animated ? ' es-stars--animated' : ''}`}
      style={{ fontSize: size }}
      role="img"
      aria-label={`${stars} of 3 stars`}
    >
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`es-star${i < stars ? ' es-star--on' : ''}`}
          style={animated ? { animationDelay: `${250 + i * 220}ms` } : undefined}
          aria-hidden="true"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  )
}
