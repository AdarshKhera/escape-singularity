import type { ButtonHTMLAttributes, ReactNode } from 'react'

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

export function Overlay({ children, label, width }: OverlayProps) {
  return (
    <div className="es-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <div className="es-overlay__card es-panel" style={width ? { width: `min(${width}px, 100%)` } : undefined}>
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

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'

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
