/**
 * Which variant of a skill a question actually tested.
 *
 * `sin:inverse` is one item, but `L^-1{3/(s^2+9)}` and `L^-1{1/(s^2+9)}` are
 * different problems: only the second makes you build the row's constant. A
 * student who keeps drawing the first can sit at ninety per cent while never
 * having met the part that matters — and the tier logic, which decides when to
 * take the multiple choice away, will believe it.
 *
 * So each problem reports the facets it exercised, and an item cannot count as
 * proficient until its hard facet has actually been seen. The generator knew
 * all along; it simply was not saying.
 */

export type Facet =
  | 'fixup'
  | 'combo'
  | 'split'
  | 'translated'
  | 'square'
  | 'shape'
  | 'repeated'
  | 'quadratic'
  | 'symbolic'
  | 'high-order'
  | 'forced'

/**
 * The rows whose own numerator can be something other than 1 — `n!` for a power,
 * `k` for a sine. Inverting those can owe a fix-up: given `5/(s^2+9)` the 3 has
 * to be manufactured. The other four rows never can, because their numerator is
 * already 1: `5/s`, `5/(s-3)` and `5s/(s^2+9)` are plain linearity, a scalar
 * carried along. Listing them here would claim a harder half that does not
 * exist, and hold the row below proficient forever waiting for it.
 */
const FIXUP_ROW = /^(power|sin|sinh):inverse$/

/**
 * The facet an item is not really being tested without. Only skills with a
 * genuinely harder variant have one — where every question is the same
 * difficulty there is nothing to hide behind.
 */
export function hardFacet(itemId: string): Facet | null {
  if (FIXUP_ROW.test(itemId)) return 'fixup'
  switch (itemId) {
    case 'shift:first:inverse':
      return 'square'
    case 'shift:second:inverse':
      return 'fixup'
    case 'frac:hard':
      return 'quadratic'
    case 'deriv:solve':
      return 'forced'
    case 'deriv:transform':
      return 'high-order'
    case 'ivp:solve':
      return 'forced'
    case 'dtrans:forward':
    case 'dtrans:inverse':
      // The second power is where the sign comes back round and the numerator
      // stops being a single term.
      return 'repeated'
    default:
      return null
  }
}

export const facetKey = (itemId: string, facet: Facet): string => `${itemId}#${facet}`

export interface FacetStat {
  attempts: number
  correct: number
}

/** Enough evidence to believe the hard variant has actually been faced. */
export const COVERED_AT = 2

export function isCovered(
  itemId: string,
  facets: Record<string, FacetStat>,
): boolean {
  const facet = hardFacet(itemId)
  if (!facet) return true
  const stat = facets[facetKey(itemId, facet)]
  return Boolean(stat && stat.attempts >= COVERED_AT && stat.correct >= 1)
}

/** Items whose hard variant is still under-tested, for biasing generation. */
export function uncoveredItems(
  itemIds: string[],
  facets: Record<string, FacetStat>,
): Set<string> {
  return new Set(itemIds.filter((id) => hardFacet(id) !== null && !isCovered(id, facets)))
}

export const FACET_LABEL: Record<Facet, string> = {
  fixup: 'the constant fix-up',
  combo: 'two rows at once',
  split: 'a shared denominator',
  translated: 'a translation',
  square: 'completing the square',
  shape: 'choosing the shape',
  repeated: 'a repeated factor',
  quadratic: 'an irreducible quadratic',
  symbolic: 'symbolic initial values',
  'high-order': 'order three or more',
  forced: 'a forcing function',
}
