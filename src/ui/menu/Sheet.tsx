import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '../primitives'

interface SheetProps {
  title: string
  onBack: () => void
  aside?: ReactNode
  children: ReactNode
}

// Full-screen sub-screen over the menu backdrop, with a back control that
// also answers to Escape / Backspace on desktop.
export function Sheet({ title, onBack, aside, children }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  // land keyboard focus on the first control of the new screen
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const first = bodyRef.current?.querySelector<HTMLElement>('button:not(:disabled), [tabindex="0"]')
    first?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="es-sheet" aria-label={title}>
      <header className="es-sheet__header">
        <Button icon className="es-sheet__back" onClick={onBack} aria-label="Back">
          ‹
        </Button>
        <h2 className="es-heading">{title}</h2>
        {aside && <div className="es-sheet__aside">{aside}</div>}
      </header>
      <div ref={bodyRef} className="es-sheet__body">{children}</div>
    </section>
  )
}
