import { MAX_LEVEL } from '../../levels/levels'
import { useProgressStore } from '../../state/progressStore'
import { totalStars } from '../../state/starTotals'
import { StarGlyph } from '../icons'

/** "14 / 36" with a star, for sheet headers. */
export function StarTotal() {
  const stars = useProgressStore((s) => totalStars(s.best))
  return (
    <span className="es-startotal" aria-label={`${stars} of ${MAX_LEVEL * 3} stars`}>
      <StarGlyph />
      <span className="es-startotal__value">{stars}</span>
      <span className="es-startotal__max">/ {MAX_LEVEL * 3}</span>
    </span>
  )
}
