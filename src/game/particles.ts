// A fixed-capacity particle pool in world space, stored as parallel typed
// arrays so bursts of sparks and debris allocate nothing per frame. When the
// pool is full new particles are dropped; nothing important is a particle.

export const PARTICLE_COLORS = [
  '255,214,140', // 0 spark
  '255,140,60', // 1 fire
  '150,140,130', // 2 rock debris
  '130,255,140', // 3 fuel green
  '255,170,70', // 4 booster orange
  '255,120,90', // 5 rocket red
  '150,210,255', // 6 shield / ice blue
  '200,230,255', // 7 thruster white-blue
  '190,130,255', // 8 ion violet
  '255,255,255', // 9 white
  '96,98,110', // 10 smoke
] as const

export type ParticleColor = number

export const PC = {
  spark: 0,
  fire: 1,
  rock: 2,
  fuel: 3,
  booster: 4,
  rocket: 5,
  ice: 6,
  thruster: 7,
  ion: 8,
  white: 9,
  smoke: 10,
} as const

export const PARTICLE_CAPACITY = 900
const CAPACITY = PARTICLE_CAPACITY

export class ParticlePool {
  readonly x = new Float32Array(CAPACITY)
  readonly y = new Float32Array(CAPACITY)
  readonly vx = new Float32Array(CAPACITY)
  readonly vy = new Float32Array(CAPACITY)
  readonly life = new Float32Array(CAPACITY)
  readonly maxLife = new Float32Array(CAPACITY)
  readonly size = new Float32Array(CAPACITY)
  readonly drag = new Float32Array(CAPACITY)
  readonly color = new Uint8Array(CAPACITY)
  /** 1 = additive glow, 0 = normal (debris) */
  readonly glow = new Uint8Array(CAPACITY)
  count = 0
  /** soft cap below capacity; adaptive quality lowers it on slow devices */
  limit = CAPACITY

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: ParticleColor,
    drag = 1.5,
    glow = true,
  ): void {
    if (this.count >= this.limit) return
    const i = this.count++
    this.x[i] = x
    this.y[i] = y
    this.vx[i] = vx
    this.vy[i] = vy
    this.life[i] = life
    this.maxLife[i] = life
    this.size[i] = size
    this.drag[i] = drag
    this.color[i] = color
    this.glow[i] = glow ? 1 : 0
  }

  // radial burst with randomised speed and life
  burst(
    x: number,
    y: number,
    count: number,
    speed: number,
    life: number,
    size: number,
    color: ParticleColor,
    glow = true,
    baseVx = 0,
  ): void {
    for (let n = 0; n < count; n++) {
      const angle = Math.random() * Math.PI * 2
      const s = speed * (0.35 + Math.random() * 0.65)
      this.spawn(
        x,
        y,
        baseVx + Math.cos(angle) * s,
        Math.sin(angle) * s,
        life * (0.6 + Math.random() * 0.4),
        size * (0.6 + Math.random() * 0.6),
        color,
        1.8,
        glow,
      )
    }
  }

  step(dt: number): void {
    let i = 0
    while (i < this.count) {
      this.life[i] -= dt
      if (this.life[i] <= 0) {
        this.removeAt(i)
        continue
      }
      const damp = Math.max(0, 1 - this.drag[i] * dt)
      this.vx[i] *= damp
      this.vy[i] *= damp
      this.x[i] += this.vx[i] * dt
      this.y[i] += this.vy[i] * dt
      i++
    }
  }

  clear(): void {
    this.count = 0
  }

  // swap-remove: order doesn't matter for particles
  private removeAt(i: number): void {
    const last = --this.count
    if (i === last) return
    this.x[i] = this.x[last]
    this.y[i] = this.y[last]
    this.vx[i] = this.vx[last]
    this.vy[i] = this.vy[last]
    this.life[i] = this.life[last]
    this.maxLife[i] = this.maxLife[last]
    this.size[i] = this.size[last]
    this.drag[i] = this.drag[last]
    this.color[i] = this.color[last]
    this.glow[i] = this.glow[last]
  }
}
