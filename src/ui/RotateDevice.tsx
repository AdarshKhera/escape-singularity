import './rotate.css'

// Shown instead of the game on touch devices held upright. The game is built
// for landscape; this keeps portrait from ever showing a squashed frame.
export function RotateDevice() {
  return (
    <div className="es-rotate" role="alert" aria-live="polite">
      <svg className="es-rotate__phone" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="20" y="6" width="24" height="52" rx="5" />
        <line x1="29" y1="51" x2="35" y2="51" />
      </svg>
      <svg className="es-rotate__arrow" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M12 30a20 20 0 0 1 36-10" />
        <path d="M49 11l-1 10-10-1" />
      </svg>
      <div className="es-rotate__title">Rotate your device</div>
      <div className="es-rotate__body">Escape Singularity plays in landscape.</div>
    </div>
  )
}
