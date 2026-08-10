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

import { shiftItemId } from '../generators/shift'
import { statsFor, type ProgressState } from '../store/progress'

export interface Rung {
  id: number
  name: string
  /** What changes at this rung, in one line, shown to the student. */
  blurb: string
}

export const RUNGS: Rung[] = [
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

export const TOP_RUNG = RUNGS.length - 1

const PROMOTE_AT = 3
const DEMOTE_AT = 2

/**
 * Where a student already stands, from the evidence to hand. Used once, when
 * the ladder has no stored position — so somebody who has been meeting
 * translated rows in the ordinary drill does not start from the bottom.
 */
export function seedRung(progress: ProgressState): number {
  const items = (['first', 'second'] as const).flatMap((t) =>
    (['forward', 'inverse'] as const).map((d) => statsFor(progress, shiftItemId(t, d))),
  )
  const attempts = items.reduce((n, s) => n + s.attempts, 0)
  if (attempts < 4) return 0
  const mean = items.reduce((n, s) => n + s.ema, 0) / items.length
  if (mean >= 0.8) return TOP_RUNG
  if (mean >= 0.6) return 2
  if (mean >= 0.35) return 1
  return 0
}

export interface LadderState {
  rung: number
  /** Consecutive results at this rung: positive right, negative wrong. */
  run: number
}

/** Move the ladder on one answer. Promotion is quick; demotion is quicker. */
export function stepLadder(state: LadderState, correct: boolean): LadderState {
  const run = correct ? Math.max(0, state.run) + 1 : Math.min(0, state.run) - 1
  if (correct && run >= PROMOTE_AT && state.rung < TOP_RUNG) {
    return { rung: state.rung + 1, run: 0 }
  }
  if (!correct && -run >= DEMOTE_AT && state.rung > 0) {
    return { rung: state.rung - 1, run: 0 }
  }
  return { rung: state.rung, run }
}

/** How close the current rung is to promoting, for the progress strip. */
export const rungProgress = (state: LadderState): number =>
  state.rung >= TOP_RUNG ? 1 : Math.max(0, Math.min(1, state.run / PROMOTE_AT))

export { PROMOTE_AT }
