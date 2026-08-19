// All distances are world units. Scale hierarchy is deliberate:
// ship (18) << planet (150) << black hole (3000, ~20x the planet).
export const SHIP_RADIUS = 18
export const PLANET_RADIUS = 150
export const BLACK_HOLE_RADIUS = 3000

// Reference cruising speed — used to lay out level distances/timing at design
// time. Actual runtime speed is throttle-controlled (see THROTTLE below) and
// only approaches this once the player has held the accelerator for a bit.
export const REFERENCE_SPEED = 560

export const CORRIDOR_HALF_WIDTH = 260

// Every level lays out its own cruise length (how far the planet tour runs)
// via LevelDefinition.cruiseEndX — more planets, more distance. Everything
// downstream of that (reveal, approach, the hole itself, the escape run) is
// derived from it, so the pull/escape mechanic — all of it verified relative
// to the hole, never to an absolute position — plays identically at every
// level regardless of how long the cruise is.
//
// The reaction window scales with the level via approachLeadSeconds: bigger,
// harder holes give the same 10s of "pick a line" at low levels but stretch
// out for the later ones, where the pull is strong enough that 10s isn't
// enough time to see it coming and commit. Reveal distance and the overall
// gap to the hole scale with it too, at the same ratio as the original
// 10-second baseline, so the whole build-up — not just the decision window —
// stretches out together.
export const DEFAULT_APPROACH_LEAD_SECONDS = 10
const BASE_LEAD_UNITS = REFERENCE_SPEED * DEFAULT_APPROACH_LEAD_SECONDS // 5600
const REVEAL_LEAD_RATIO = 8000 / BASE_LEAD_UNITS
const GAP_TO_HOLE_RATIO = 9000 / BASE_LEAD_UNITS

// past the hole before the run counts as clear — this is the "give it more
// room before it can escape" distance; the danger doesn't end the instant
// you're technically past the horizon
export const ESCAPE_CLEAR_GAP = 3400

export interface LevelLayout {
  cruiseEndX: number
  revealStartX: number
  approachStartX: number
  blackHoleX: number
  fuelCacheX: number
  escapeClearX: number
  levelEndX: number
  zoomSpan: number
}

export function computeLevelLayout(
  cruiseEndX: number,
  approachLeadSeconds: number = DEFAULT_APPROACH_LEAD_SECONDS,
): LevelLayout {
  const leadUnits = REFERENCE_SPEED * approachLeadSeconds
  const gapToHole = Math.round(leadUnits * GAP_TO_HOLE_RATIO)
  const revealLead = Math.round(leadUnits * REVEAL_LEAD_RATIO)

  const blackHoleX = cruiseEndX + gapToHole
  const revealStartX = cruiseEndX - revealLead
  const approachStartX = blackHoleX - leadUnits
  const fuelCacheX = approachStartX - 1500
  const escapeClearX = blackHoleX + ESCAPE_CLEAR_GAP
  const zoomSpan = approachStartX - revealStartX
  const levelEndX = escapeClearX + zoomSpan
  return {
    cruiseEndX,
    revealStartX,
    approachStartX,
    blackHoleX,
    fuelCacheX,
    escapeClearX,
    levelEndX,
    zoomSpan,
  }
}

export const FUEL_CACHE_RADIUS = 44

// Reachable, but well beyond the clearance actually required — climbing this
// high still demands holding the turn, so it is never a safe perch. Only in
// play once the approach has opened up the camera; see CRUISE_LANE_BOUND for
// the tighter clamp used beforehand.
export const LANE_BOUND = 5200

// During ordinary cruise flight the camera doesn't have room to follow the
// ship as far as the full LANE_BOUND allows, so straying that far would push
// it off-screen among the debris. Clamp cruise steering to a range the
// camera can actually keep in frame — still enough room to dodge, never far
// enough to fly blind.
export const CRUISE_LANE_BOUND = 480

// Gravity is a capped, proximity-driven drag toward the centreline rather than
// a true inverse-square field: a real point mass makes escape impossible once
// you are close, which is accurate but unplayable. This version keeps the
// pressure relentless while leaving an early commit winnable.
//
// Crucially the proximity term is keyed to distance ALONG THE FLIGHT PATH, not
// total distance from the hole — so climbing away buys no relief. The pull
// peaks exactly as the ship draws level with the hole.
export const MAX_PULL = 1950
export const PULL_RANGE = 8000
export const STEER_ACCEL = 2200
export const LATERAL_DAMPING = 2.0

// The outward slingshot momentum used to bleed off almost instantly once past
// the hole, so clearing it read as abrupt: the pull that fought you all the
// way in vanished the moment you were technically past it. This adds extra
// drag on outward drift for a short stretch afterwards, so breaking free
// costs visible time and effort rather than snapping straight to a coast. It
// only ever removes speed, never adds inward pull, so it cannot be what drags
// anyone back in.
export const EXIT_DRAG_RANGE = 2600
export const EXIT_DRAG_MULTIPLIER = 2.2

export function computeExitDrag(shipWorldX: number, blackHoleX: number): number {
  const past = shipWorldX - blackHoleX
  if (past <= 0 || past >= EXIT_DRAG_RANGE) return 0
  const t = 1 - past / EXIT_DRAG_RANGE
  return t * t * (EXIT_DRAG_MULTIPLIER - 1)
}

// Throttle: forward flight is now player-held, not automatic. Letting go of
// the accelerator bleeds speed back toward an idle drift; braking bleeds it
// further, toward a near-stop. Since gravity's pull duration is a function of
// how long the ship lingers near the hole, low speed there is lethal even
// while still steering — this is what makes releasing the accelerator during
// an escape fatal.
export const THROTTLE_MAX_SPEED = REFERENCE_SPEED
export const THROTTLE_IDLE_SPEED = 180
export const THROTTLE_BRAKE_FLOOR = 20
export const THROTTLE_ACCEL_RATE = 900
export const THROTTLE_DECAY_RATE = 500
export const THROTTLE_BRAKE_RATE = 1300

// double-tap the accelerator for a brief burst
export const BOOST_SPEED_ADD = 260
export const BOOST_SECONDS = 1.1
export const DOUBLE_TAP_WINDOW_MS = 320
// cooldown starts once a boost ends, so double-tapping mid-boost can't chain
export const BOOST_COOLDOWN_SECONDS = 2.4

// Speed booster pickups: found in the world, not player-triggered. A flat 3x
// multiplier on top of current speed, free of fuel cost, for a few seconds.
// Double-tapping while one is active stacks the player-triggered boost on top
// rather than being overridden by it — the picked-up speed becomes the new
// floor, not a ceiling.
export const PICKUP_BOOST_MULTIPLIER = 3
export const PICKUP_BOOST_SECONDS = 2.6

// A scripted, unavoidable-by-default obstacle sat dead-centre on the flight
// path: unlike the random corridor debris, missing this one is not an option,
// it must be actively dodged. How many appear per level is what actually
// escalates the cruise's difficulty level over level.
export const BLOCKADE_RADIUS = 70

// A rock belt is a true wall: reinforced rocks spaced tighter than a ship
// width, spanning the full range the ship can reach during cruise, so there
// is no gap to slip through — one of them has to be blasted open. Weapons
// unlock at WEAPON_UNLOCK_LEVEL, so belts never appear before the player can
// actually clear one.
export const BELT_ROCK_RADIUS_MIN = 70
export const BELT_ROCK_RADIUS_MAX = 130
export const BELT_ROCK_SPACING = 150
export const BELT_ROCK_COUNT = 7
export const BELT_ROCK_HITS = 2

// Weapons and shields start appearing from these levels on — reachable early
// enough to actually see, but still framed as a "things get hairier" reward.
export const WEAPON_UNLOCK_LEVEL = 3
export const SHIELD_UNLOCK_LEVEL = 4
export const ROCKET_SPEED = 1400
export const ROCKET_PICKUP_RADIUS = 30
export const SHIELD_PICKUP_RADIUS = 26

// Fuel: the budget for how much flying the ship can do before it has to make
// the final escape. Both thrusting and steering drain it — braking is the only
// free state. There is no passive regeneration: once it's spent it stays
// spent until a pickup or the scripted top-off restores it. Draining is not
// phase-gated: burning fuel dodging debris during the cruise costs the same as
// burning it fighting the hole's pull, and with no regen a careless cruise can
// leave the tank empty well before the guaranteed refill.
//
// Nothing tops the tank off for free. A single distinctive cache sits just
// before the approach — miss it and you go into the escape on whatever you
// have left. FUEL_MAX is sized so a full tank comfortably outlasts the
// required hold with margin for imperfect play.
export const FUEL_MAX = 290
export const THRUST_FUEL_DRAIN_PER_SECOND = 4
export const STEER_FUEL_DRAIN_PER_SECOND = 8
export const SATELLITE_FUEL_REWARD = 22

export const SUCK_IN_SECONDS = 1.3

// the guide line is a brief hint at the warning, not a permanent racing line
export const GUIDE_FLASH_SECONDS = 1.6

export type LevelPhase = 'cruise' | 'approach' | 'escape' | 'clear'

export function resolvePhase(shipWorldX: number, layout: LevelLayout): LevelPhase {
  if (shipWorldX >= layout.escapeClearX) return 'clear'
  if (shipWorldX >= layout.blackHoleX) return 'escape'
  if (shipWorldX >= layout.approachStartX) return 'approach'
  return 'cruise'
}

// 0 while cruising, ramping to 1 as the hole is reached
export function computeApproachT(shipWorldX: number, layout: LevelLayout): number {
  const span = layout.blackHoleX - layout.approachStartX
  return Math.min(Math.max((shipWorldX - layout.approachStartX) / span, 0), 1)
}

// Drives the slow build: camera pull-back, starlight draining, darkness and
// hull vibration. Rises to 1 at the hole, then releases back to 0 as the ship
// pulls clear so the sky refills and normal flight resumes.
export function computeRevealT(shipWorldX: number, layout: LevelLayout): number {
  if (shipWorldX <= layout.blackHoleX) {
    const span = layout.blackHoleX - layout.revealStartX
    return Math.min(Math.max((shipWorldX - layout.revealStartX) / span, 0), 1)
  }
  const recoverySpan = layout.levelEndX - layout.blackHoleX
  const t = (shipWorldX - layout.blackHoleX) / recoverySpan
  return Math.max(1 - t * 1.35, 0)
}

// The hole looms larger the closer the ship gets. This is on top of the camera
// pull-back, so it reads as the hole genuinely swelling rather than the view
// simply zooming: at the start of the run it sits small on the horizon, by the
// approach it dominates.
export const HORIZON_GROWTH = 0.55

export function computeHorizonScale(shipWorldX: number, layout: LevelLayout): number {
  const t = Math.min(Math.max(shipWorldX / layout.blackHoleX, 0), 1)
  return 1 - HORIZON_GROWTH * (1 - Math.pow(t, 1.6))
}

// Victory run: once clear, the ship opens up to a hard burn through the stars.
export const VICTORY_SPEED_MULTIPLIER = 4
export const VICTORY_STREAK_RAMP = 0.9

// The "struggle": as the ship closes on the hole and slingshots across it, the
// camera pushes in and the ship itself reads a little smaller against it,
// selling the hole's true scale, then eases back out afterwards. It is a bell
// curve centred exactly on the hole, spanning the whole approach-to-clear
// window, not just the instant of closest approach.
export const STRUGGLE_ZOOM_IN = 2.05
export const STRUGGLE_SHIP_SHRINK = 0.72

export function computeStruggleT(shipWorldX: number, layout: LevelLayout): number {
  if (shipWorldX <= layout.approachStartX || shipWorldX >= layout.escapeClearX) return 0
  const beforeHole = shipWorldX <= layout.blackHoleX
  const span = beforeHole
    ? layout.blackHoleX - layout.approachStartX
    : layout.escapeClearX - layout.blackHoleX
  const t = beforeHole
    ? (shipWorldX - layout.approachStartX) / span
    : 1 - (shipWorldX - layout.blackHoleX) / span
  return t * t * (3 - 2 * t)
}

// Being swallowed pulls the camera back out rather than in, so the hole's
// scale reads at the moment it actually wins.
export const SUCK_IN_ZOOM_OUT = 0.6

// Planets and their escorts drift in a slow lateral orbit around their own
// position once they're close enough to the hole to plausibly feel its pull —
// the closer, the faster, same as real orbital mechanics. Far-out planets
// barely move; anything within reach of the approach visibly swings.
const ORBIT_RANGE = 16000
const ORBIT_MAX_RADIUS = 260
const ORBIT_MIN_ANGULAR_SPEED = 0.12
const ORBIT_MAX_ANGULAR_SPEED = 1.3

export function computeOrbitOffset(
  worldX: number,
  blackHoleX: number,
  time: number,
  phaseSeed: number,
): number {
  const distanceToHole = blackHoleX - worldX
  const proximityT = Math.min(Math.max(1 - distanceToHole / ORBIT_RANGE, 0), 1)
  if (proximityT <= 0) return 0
  const radius = proximityT * ORBIT_MAX_RADIUS
  const angularSpeed =
    ORBIT_MIN_ANGULAR_SPEED + proximityT * (ORBIT_MAX_ANGULAR_SPEED - ORBIT_MIN_ANGULAR_SPEED)
  return Math.sin(time * angularSpeed + phaseSeed) * radius
}

// How violently the hull shakes: only bites once the hole is genuinely close.
export function computeShakeAmount(shipWorldX: number, lateral: number, layout: LevelLayout): number {
  const dist = Math.hypot(layout.blackHoleX - shipWorldX, lateral)
  const t = 1 - Math.min(Math.max(dist / (BLACK_HOLE_RADIUS * 2.6), 0), 1)
  return t * t
}
