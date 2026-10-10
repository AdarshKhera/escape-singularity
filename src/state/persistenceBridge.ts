import { useGameStore } from './gameStore'
import { useProgressStore } from './progressStore'

// Keeps the game store's ship skin and the persisted progress in step without
// touching gameStore.ts: the saved skin is applied once at boot, and any later
// change in the game store is written back.
let installed = false

export function installPersistenceBridge(): void {
  if (installed) return
  installed = true

  const savedSkin = useProgressStore.getState().shipSkinId
  if (useGameStore.getState().shipSkinId !== savedSkin) {
    useGameStore.getState().setShipSkinId(savedSkin)
  }

  useGameStore.subscribe((state, previous) => {
    if (state.shipSkinId !== previous.shipSkinId) {
      useProgressStore.getState().setShipSkinId(state.shipSkinId)
    }
  })
}
