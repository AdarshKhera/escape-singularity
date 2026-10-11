import { useEffect } from 'react'
import { useProgressStore } from '../../state/progressStore'
import { totalStars } from '../../state/starTotals'

/** Opening the hangar counts as seeing every ship unlocked so far. */
export function useMarkHangarSeen(): void {
  const stars = useProgressStore((s) => totalStars(s.best))
  const markHangarSeen = useProgressStore((s) => s.markHangarSeen)
  useEffect(() => {
    markHangarSeen(stars)
  }, [stars, markHangarSeen])
}
