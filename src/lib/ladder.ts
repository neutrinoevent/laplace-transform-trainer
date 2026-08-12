/**
 * A self-calibrating ladder for the translation theorems.
 *
 * §7.3 is the first section that assumes the earlier ones. Dropping someone
 * straight into both theorems, both directions, with hidden translations, tests
 * fluency it was supposed to be building — while a student who already has that
 * fluency should not be made to climb anything.
 *
 * So the rung is inferred, never asked for. It is seeded from whatever evidence
 * already exists (including translated rows met in the ordinary drill, which
 * report into the same items), then moves on performance: three right in a row
 * promotes, two wrong demotes. A fluent user is at the top in nine questions and
 * a returning one starts where they left off; nobody is asked what they know.
 */

import { FRACTION_ITEM_IDS } from '../generators/fraction'
import { DTRANSFORM_ITEMS } from '../generators/dtransform'
import { IVP_ITEM } from '../generators/ivp'
import { SHIFT_ITEMS } from '../generators/shift'
import { statsFor, type ProgressState } from '../store/progress'

export interface Rung {
  id: number
  name: string
  /** What changes at this rung, in one line, shown to the student. */
  blurb: string
}

/** A ladder is a set of rungs plus the items whose evidence seeds it. */
export interface Ladder {
  rungs: Rung[]
  items: string[]
}

export const SHIFT_RUNGS: Rung[] = [
  {
    id: 0,
    name: 'Anchored',
    blurb:
      'One theorem at a time, with the untranslated row given — so the only new step is the translation itself.',
  },
  {
    id: 1,
    name: 'On its own',
    blurb: 'One theorem at a time, both directions, without the row handed to you.',
  },
  {
    id: 2,
    name: 'Both mixed',
    blurb: 'Both theorems interleaved, so deciding which one applies is part of the question.',
  },
  {
    id: 3,
    name: 'Everything',
    blurb:
      'Translations hidden inside quadratics, and constant fix-ups alongside them. The full section.',
  },
]

export const FRACTION_RUNGS: Rung[] = [
  {
    id: 0,
    name: 'Completing the square',
    blurb:
      'The sub-method on its own: turning an irreducible quadratic into a square plus a constant, which is what makes it a table row at all.',
  },
  {
    id: 1,
    name: 'The shape',
    blurb:
      'Choosing the decomposition a denominator calls for, before any constants are worked out.',
  },
  {
    id: 2,
    name: 'Distinct factors',
    blurb: 'Decomposing over distinct linear factors and inverting each piece.',
  },
  {
    id: 3,
    name: 'Everything',
    blurb:
      'Repeated factors, which invert through Theorem 7.3.1, and irreducible quadratics, which need the square completed first.',
  },
]

export const IVP_RUNGS: Rung[] = [
  {
    id: 0,
    name: 'First order',
    blurb:
      'One derivative, so one initial value and one root. The four moves with as little arithmetic in the way as possible.',
  },
  {
    id: 1,
    name: 'Second order',
    blurb: 'Two distinct real roots, and a forcing function more often than not.',
  },
  {
    id: 2,
    name: 'Repeated & complex',
    blurb:
      'Roots that repeat, which produce a $t$, and complex pairs, which oscillate and need the square completed.',
  },
  {
    id: 3,
    name: 'Everything',
    blurb:
      'Every shape, richer forcing, and now and then a third-order equation.',
  },
]

export const SHIFT_LADDER: Ladder = { rungs: SHIFT_RUNGS, items: SHIFT_ITEMS }
export const IVP_LADDER: Ladder = { rungs: IVP_RUNGS, items: [IVP_ITEM] }

export const DTRANSFORM_RUNGS: Rung[] = [
  {
    id: 0,
    name: 'One factor of t',
    blurb: 'One power of $t$ against an oscillating row: one derivative, one change of sign.',
  },
  {
    id: 1,
    name: 'Both directions',
    blurb:
      'Reading it backwards as well — a raised denominator is what a factor of $t$ looks like from the $s$-side.',
  },
  {
    id: 2,
    name: 'Higher powers',
    blurb: 'Two factors of $t$, so two derivatives and the sign back where it started.',
  },
]

export const DTRANSFORM_LADDER: Ladder = { rungs: DTRANSFORM_RUNGS, items: DTRANSFORM_ITEMS }
export const FRACTION_LADDER: Ladder = { rungs: FRACTION_RUNGS, items: FRACTION_ITEM_IDS }

export const topRung = (ladder: Ladder): number => ladder.rungs.length - 1

const PROMOTE_AT = 3
const DEMOTE_AT = 2

/**
 * Where a student already stands, from the evidence to hand. Used once, when
 * the ladder has no stored position — so somebody who has been meeting
 * translated rows in the ordinary drill does not start from the bottom.
 */
export function seedRung(ladder: Ladder, progress: ProgressState): number {
  const top = topRung(ladder)
  const stats = ladder.items.map((id) => statsFor(progress, id))
  const attempts = stats.reduce((n, s) => n + s.attempts, 0)
  if (attempts < 4) return 0
  const mean = stats.reduce((n, s) => n + s.ema, 0) / stats.length
  if (mean >= 0.8) return top
  if (mean >= 0.6) return Math.min(2, top)
  if (mean >= 0.35) return Math.min(1, top)
  return 0
}

export interface LadderState {
  rung: number
  /** Consecutive results at this rung: positive right, negative wrong. */
  run: number
}

/** Move the ladder on one answer. Promotion is quick; demotion is quicker. */
export function stepLadder(ladder: Ladder, state: LadderState, correct: boolean): LadderState {
  const run = correct ? Math.max(0, state.run) + 1 : Math.min(0, state.run) - 1
  if (correct && run >= PROMOTE_AT && state.rung < topRung(ladder)) {
    return { rung: state.rung + 1, run: 0 }
  }
  if (!correct && -run >= DEMOTE_AT && state.rung > 0) {
    return { rung: state.rung - 1, run: 0 }
  }
  return { rung: state.rung, run }
}

/** How close the current rung is to promoting, for the progress strip. */
export const rungProgress = (ladder: Ladder, state: LadderState): number =>
  state.rung >= topRung(ladder) ? 1 : Math.max(0, Math.min(1, state.run / PROMOTE_AT))

/** The ladder position in force, seeded the first time from what is on record. */
export function ladderOf(
  ladder: Ladder,
  progress: ProgressState,
  stored: { rung: number | null; run: number },
): LadderState {
  return {
    rung: stored.rung ?? seedRung(ladder, progress),
    run: stored.rung === null ? 0 : stored.run,
  }
}

export { PROMOTE_AT }
