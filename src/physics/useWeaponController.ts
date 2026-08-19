import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

// Spacebar fires a rocket, if one is carried.
export function useWeaponController() {
  const requestFire = useGameStore((s) => s.requestFire)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      e.preventDefault()
      const { hasWeapon, ammo } = useGameStore.getState()
      if (hasWeapon && ammo > 0) requestFire()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestFire])
}
