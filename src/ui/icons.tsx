// Small inline glyphs shared across menus. Sized by font-size (1em).

export const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'

export function StarGlyph({ className }: { className?: string }) {
  return (
    <svg className={`es-glyph es-glyph--star${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  )
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={`es-glyph es-glyph--lock${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={`es-glyph es-glyph--check${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={`es-glyph es-glyph--shield${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.6" />
    </svg>
  )
}
