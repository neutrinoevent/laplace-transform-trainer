import { FORM_IDS, type FormId } from '../data/forms'
import { DERIV_ITEM } from '../generators/derivative'
import { FRACTION_ITEM_IDS } from '../generators/fraction'
import { SHIFT_ITEMS } from '../generators/shift'
import { itemId, type Direction } from '../generators/types'
import { statsFor, type ProgressState } from '../store/progress'

/** Criterion tiers derived from the per-item moving average. */
export type Tier = 'new' | 'learning' | 'familiar' | 'proficient' | 'mastered'

export const TIER_LABEL: Record<Tier, string> = {
  new: 'New',
  learning: 'Learning',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
}

export function tierFor(s: { attempts: number; reps: number; ema: number }): Tier {
  if (s.attempts === 0 && s.reps === 0) return 'new'
  if (s.ema < 0.55) return 'learning'
  if (s.ema < 0.75) return 'familiar'
  if (s.ema < 0.9 || s.attempts < 4) return 'proficient'
  return 'mastered'
}

export const tierOf = (p: ProgressState, id: string): Tier => tierFor(statsFor(p, id))

export function score(p: ProgressState, form: FormId, dir: Direction): number {
  return statsFor(p, itemId(form, dir)).ema
}

/** Mean mastery across everything the trainer drills — the headline number. */
export function overallScore(p: ProgressState): number {
  const ids = [
    ...FORM_IDS.flatMap((f) => [itemId(f, 'forward'), itemId(f, 'inverse')]),
    DERIV_ITEM.transform,
    DERIV_ITEM.solve,
    ...SHIFT_ITEMS,
    ...FRACTION_ITEM_IDS,
  ]
  return ids.reduce((sum, id) => sum + statsFor(p, id).ema, 0) / ids.length
}

/**
 * Scaffolding that fades: multiple choice while a row is new, typed once it
 * holds. Used when the response mode is left on 'auto'.
 */
export const shouldType = (tier: Tier): boolean => tier === 'proficient' || tier === 'mastered'

/** Two options while everything is new, widening as the row settles. */
export function autoOptionCount(tier: Tier): 2 | 3 | 4 {
  if (tier === 'new') return 3
  if (tier === 'learning') return 3
  return 4
}
