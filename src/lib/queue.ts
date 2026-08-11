/**
 * Sequencing within a run of questions.
 *
 * The picker weights by weakness, which left to itself serves the weakest item
 * over and over — blocked practice wearing an adaptive costume. Two corrections,
 * both measured in *questions answered* rather than in days, so they behave the
 * same for someone doing forty in an evening and someone doing forty over a
 * term:
 *
 *   a gap, so nothing recurs immediately, which forces interleaving; and
 *   expanding retrieval, so a missed item comes back soon, then later, then
 *   later still, instead of either hounding you or vanishing.
 *
 * The state is per-run and deliberately not persisted. It describes the shape of
 * a sitting, not what the student knows.
 */

/** How far apart the same item may recur under ordinary weighting. */
export const GAP = 3

/** Questions to wait before a missed item returns, then again, then again. */
export const STEPS = [2, 5, 10]

export interface Pending {
  id: string
  /** Question number at which it should come back. */
  at: number
  /** How far along the expanding schedule it is. */
  step: number
}

export interface Queue {
  served: number
  /** Most recently served item ids, newest last, at most GAP of them. */
  recent: string[]
  pending: Pending[]
}

export const emptyQueue = (): Queue => ({ served: 0, recent: [], pending: [] })

/** Items whose return is owed now, soonest first. */
export const dueNow = (q: Queue): string[] =>
  q.pending
    .filter((p) => p.at <= q.served)
    .sort((a, b) => a.at - b.at)
    .map((p) => p.id)

/** Items to keep out of the ordinary draw because they came up too recently. */
export const tooRecent = (q: Queue): string[] => q.recent

/**
 * Advance the run by one answered question.
 *
 * A miss enters the schedule at its first interval, or restarts there if it was
 * already on it — failing a review means the spacing was too long. A hit moves
 * to the next interval, and off the schedule after the last one.
 */
export function recordServed(q: Queue, id: string, correct: boolean): Queue {
  const served = q.served + 1
  const existing = q.pending.find((p) => p.id === id)
  const rest = q.pending.filter((p) => p.id !== id)

  let pending = rest
  if (!correct) {
    pending = [...rest, { id, at: served + STEPS[0], step: 0 }]
  } else if (existing) {
    const next = existing.step + 1
    if (next < STEPS.length) pending = [...rest, { id, at: served + STEPS[next], step: next }]
  }

  return {
    served,
    recent: [...q.recent, id].slice(-GAP),
    pending,
  }
}
