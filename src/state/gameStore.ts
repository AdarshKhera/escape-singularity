import { create } from 'zustand'
import { FUEL_MAX, THROTTLE_IDLE_SPEED, type LevelPhase } from '../levels/worldConfig'

export type RunStatus = 'playing' | 'sucked-in' | 'life-lost' | 'level-complete' | 'game-over'
export type DeathCause = 'collision' | 'blackhole'

interface GameState {
  shipWorldX: number
  shipLateral: number
  shipLateralVelocity: number
  shipForwardSpeed: number
  bankInput: -1 | 0 | 1
  throttleInput: -1 | 0 | 1
  boostRequestId: number

  fuel: number
  lives: number
  status: RunStatus
  phase: LevelPhase
  invulnerable: boolean
  bannerMessage: string | null
  deathCause: DeathCause
  shipSkinId: string
  level: number
  paused: boolean

  togglePause: () => void
  hasWeapon: boolean
  ammo: number
  shieldCharges: number
  fireRequestId: number

  requestFire: () => void
  addAmmo: (amount: number) => void
  consumeAmmo: () => void
  addShield: () => void
  consumeShield: () => void
  setShipSkinId: (id: string) => void
  setLevel: (level: number) => void
  advanceLevel: () => void
  setBankInput: (input: -1 | 0 | 1) => void
  setThrottleInput: (input: -1 | 0 | 1) => void
  requestBoost: () => void
  tickShip: (shipWorldX: number, lateral: number, lateralVelocity: number, forwardSpeed: number) => void
  setPhase: (phase: LevelPhase) => void
  setBannerMessage: (message: string | null) => void
  beginSuckIn: () => void
  loseLife: (cause: DeathCause) => void
  addFuel: (amount: number) => void
  drainFuel: (amount: number) => void
  completeLevel: () => void
  respawn: () => void
  resetRun: () => void
}

const INITIAL_LIVES = 3

export const useGameStore = create<GameState>((set) => ({
  shipWorldX: 0,
  shipLateral: 0,
  shipLateralVelocity: 0,
  shipForwardSpeed: THROTTLE_IDLE_SPEED,
  bankInput: 0,
  throttleInput: 0,
  boostRequestId: 0,

  fuel: FUEL_MAX,
  lives: INITIAL_LIVES,
  status: 'playing',
  phase: 'cruise',
  invulnerable: false,
  bannerMessage: null,
  deathCause: 'collision',
  shipSkinId: 'scout',
  level: 1,
  paused: false,

  togglePause: () => set((s) => ({ paused: !s.paused })),

  hasWeapon: false,
  ammo: 0,
  shieldCharges: 0,
  fireRequestId: 0,
  requestFire: () => set((s) => ({ fireRequestId: s.fireRequestId + 1 })),
  // no cap — rockets stack as high as you can collect
  addAmmo: (amount) => set((s) => ({ hasWeapon: true, ammo: s.ammo + amount })),
  consumeAmmo: () => set((s) => ({ ammo: Math.max(0, s.ammo - 1) })),
  addShield: () => set({ shieldCharges: 1 }),
  consumeShield: () => set({ shieldCharges: 0 }),

  setShipSkinId: (shipSkinId) => set({ shipSkinId }),

  setLevel: (level) =>
    set({
      level,
      shipWorldX: 0,
      shipLateral: 0,
      shipLateralVelocity: 0,
      shipForwardSpeed: THROTTLE_IDLE_SPEED,
      fuel: FUEL_MAX,
      status: 'playing',
      phase: 'cruise',
      invulnerable: false,
      bannerMessage: null,
      hasWeapon: false,
      ammo: 0,
      shieldCharges: 0,
      paused: false,
    }),

  advanceLevel: () =>
    set((s) => ({
      level: s.level + 1,
      shipWorldX: 0,
      shipLateral: 0,
      shipLateralVelocity: 0,
      shipForwardSpeed: THROTTLE_IDLE_SPEED,
      fuel: FUEL_MAX,
      status: 'playing',
      phase: 'cruise',
      invulnerable: false,
      bannerMessage: null,
      hasWeapon: false,
      ammo: 0,
      shieldCharges: 0,
      paused: false,
    })),
  setBankInput: (bankInput) => set({ bankInput }),
  setThrottleInput: (throttleInput) => set({ throttleInput }),
  requestBoost: () => set((s) => ({ boostRequestId: s.boostRequestId + 1 })),

  tickShip: (shipWorldX, shipLateral, shipLateralVelocity, shipForwardSpeed) =>
    set({ shipWorldX, shipLateral, shipLateralVelocity, shipForwardSpeed }),

  setPhase: (phase) => set({ phase }),

  setBannerMessage: (bannerMessage) => set({ bannerMessage }),

  beginSuckIn: () => set({ status: 'sucked-in' }),

  loseLife: (cause) =>
    set((s) => {
      const lives = s.lives - 1
      return {
        lives,
        status: lives <= 0 ? 'game-over' : 'life-lost',
        shipLateralVelocity: 0,
        invulnerable: true,
        deathCause: cause,
      }
    }),

  addFuel: (amount) => set((s) => ({ fuel: Math.min(FUEL_MAX, s.fuel + amount) })),
  drainFuel: (amount) => set((s) => ({ fuel: Math.max(0, s.fuel - amount) })),

  completeLevel: () => set({ status: 'level-complete', bannerMessage: null }),

  // restart the run from the beginning of the approach, keeping score
  respawn: () =>
    set({
      shipWorldX: 0,
      shipLateral: 0,
      shipLateralVelocity: 0,
      shipForwardSpeed: THROTTLE_IDLE_SPEED,
      status: 'playing',
      phase: 'cruise',
      bannerMessage: null,
      invulnerable: false,
      paused: false,
    }),

  resetRun: () =>
    set({
      shipWorldX: 0,
      shipLateral: 0,
      shipLateralVelocity: 0,
      shipForwardSpeed: THROTTLE_IDLE_SPEED,
      lives: INITIAL_LIVES,
      fuel: FUEL_MAX,
      status: 'playing',
      phase: 'cruise',
      invulnerable: false,
      bannerMessage: null,
      hasWeapon: false,
      ammo: 0,
      shieldCharges: 0,
      level: 1,
      paused: false,
    }),
}))
