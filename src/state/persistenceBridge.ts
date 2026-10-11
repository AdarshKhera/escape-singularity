import { useGameStore } from './gameStore'
import { useProgressStore } from './progressStore'
import { totalStars } from './starTotals'
import { DEFAULT_SHIP_ID, isShipIdUnlocked } from '../ui/shipAdapter'

// Keeps the game store's ship skin and the persisted progress in step without
// touching gameStore.ts: the saved skin is applied once at boot, and any later
// change in the game store is written back. A skin the player has not earned
// (old save, progress reset) falls back to the starter ship.
let installed = false

function allowedSkin(id: string): string {
  return isShipIdUnlocked(id, totalStars(useProgressStore.getState().best)) ? id : DEFAULT_SHIP_ID
}

function enforceUnlocked(): void {
  const current = useGameStore.getState().shipSkinId
  const allowed = allowedSkin(current)
  if (allowed !== current) useGameStore.getState().setShipSkinId(allowed)
}

export function installPersistenceBridge(): void {
  if (installed) return
  installed = true

  const savedSkin = allowedSkin(useProgressStore.getState().shipSkinId)
  if (useGameStore.getState().shipSkinId !== savedSkin) {
    useGameStore.getState().setShipSkinId(savedSkin)
  }
  if (useProgressStore.getState().shipSkinId !== savedSkin) {
    useProgressStore.getState().setShipSkinId(savedSkin)
  }

  useGameStore.subscribe((state, previous) => {
    if (state.shipSkinId === previous.shipSkinId) return
    const allowed = allowedSkin(state.shipSkinId)
    if (allowed !== state.shipSkinId) {
      state.setShipSkinId(allowed)
      return
    }
    useProgressStore.getState().setShipSkinId(state.shipSkinId)
  })

  useProgressStore.subscribe((state, previous) => {
    if (state.best !== previous.best) enforceUnlocked()
  })
}
