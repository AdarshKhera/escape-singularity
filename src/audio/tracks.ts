export interface TrackDefinition {
  id: string
  title: string
  note: string
  // root frequencies for the sustained organ voicing, in order
  progression: number[][]
  tickIntervalSeconds: number
  tempoDriftSeconds: number
}

// Original compositions written for this game. They deliberately sit in the
// same register as the film scores they nod to — sustained organ, a metronomic
// tick — without reproducing any copyrighted material.
export const TRACKS: TrackDefinition[] = [
  {
    id: 'event-horizon',
    title: 'Event Horizon',
    note: 'original, organ + tick',
    progression: [
      [65.41, 98.0, 130.81, 196.0],
      [61.74, 92.5, 123.47, 185.0],
      [69.3, 103.83, 138.59, 207.65],
      [55.0, 82.41, 110.0, 164.81],
    ],
    tickIntervalSeconds: 0.75,
    tempoDriftSeconds: 8,
  },
  {
    id: 'cold-orbit',
    title: 'Cold Orbit',
    note: 'original, sparse drone',
    progression: [
      [49.0, 73.42, 98.0, 146.83],
      [55.0, 82.41, 110.0, 164.81],
      [43.65, 65.41, 87.31, 130.81],
    ],
    tickIntervalSeconds: 1.2,
    tempoDriftSeconds: 12,
  },
  {
    id: 'silent-running',
    title: 'Silent Running',
    note: 'original, low pulse',
    progression: [
      [41.2, 61.74, 82.41, 123.47],
      [46.25, 69.3, 92.5, 138.59],
    ],
    tickIntervalSeconds: 0.5,
    tempoDriftSeconds: 6,
  },
]
