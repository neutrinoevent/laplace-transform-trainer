/**
 * The two translation theorems, checked against the definition rather than
 * against themselves.
 *
 * Every claim the app makes about a translated row — that multiplying by
 * `e^{at}` reads the transform at `s - a`, that delaying by `d` multiplies it by
 * `e^{-ds}` — is verified by integrating `e^{-st}f(t)` numerically and comparing
 * with the transform the model reports. A sign error in either translation
 * shows up immediately; agreement with a formula derived from the same formula
 * would not.
 */

import { describe, expect, it } from 'vitest'
import { evalTermF, evalTermS, type FormId, type Term } from './forms'
import { frac } from '../lib/frac'

/**
 * Composite Simpson on [0, T], split at a discontinuity so the rule never
 * straddles the step.
 */
function integrate(f: (t: number) => number, T: number, breakAt?: number): number {
  const pieces: [number, number][] =
    breakAt && breakAt < T ? [[0, breakAt], [breakAt, T]] : [[0, T]]
  let total = 0
  for (const [lo, hi] of pieces) {
    const n = 40000 // even
    const h = (hi - lo) / n
    let sum = f(lo) + f(hi)
    for (let i = 1; i < n; i++) sum += f(lo + i * h) * (i % 2 ? 4 : 2)
    total += (sum * h) / 3
  }
  return total
}

/** The transform of a term, straight from Definition 7.1.1. */
const byDefinition = (term: Term, s: number): number =>
  integrate((t) => Math.exp(-s * t) * evalTermF(term, t), 30, term.delay)

const PARAMS: Record<FormId, Partial<Term>[]> = {
  one: [{}],
  power: [{ n: 1 }, { n: 3 }, { n: 4 }],
  exp: [{ a: 2 }, { a: -3 }],
  sin: [{ k: 1 }, { k: 3 }],
  cos: [{ k: 2 }, { k: 4 }],
  sinh: [{ k: 2 }],
  cosh: [{ k: 3 }],
}

function cases(extra: Partial<Term>): Term[] {
  const out: Term[] = []
  for (const [form, variants] of Object.entries(PARAMS) as [FormId, Partial<Term>[]][]) {
    // Rows (a) and (c) absorb an exponential multiple, so they never carry one.
    if (extra.shift && (form === 'one' || form === 'exp')) continue
    for (const v of variants) out.push({ form, coef: frac(1), ...v, ...extra })
  }
  return out
}

const S = 12
const close = (a: number, b: number) => Math.abs(a - b) <= 2e-6 * (1 + Math.abs(b))

describe('the model agrees with the definition', () => {
  it('on the untranslated rows', () => {
    for (const term of cases({})) {
      expect(close(byDefinition(term, S), evalTermS(term, S)), JSON.stringify(term)).toBe(true)
    }
  })

  it('under the first translation theorem', () => {
    for (const shift of [2, -3]) {
      for (const term of cases({ shift })) {
        expect(close(byDefinition(term, S), evalTermS(term, S)), JSON.stringify(term)).toBe(true)
      }
    }
  })

  it('under the second translation theorem', () => {
    for (const delay of [1, 2.5]) {
      for (const term of cases({ delay })) {
        expect(close(byDefinition(term, S), evalTermS(term, S)), JSON.stringify(term)).toBe(true)
      }
    }
  })
})

describe('the theorems as stated', () => {
  it('reads an exponential multiple as the transform at s - a', () => {
    for (const term of cases({})) {
      if (term.form === 'one' || term.form === 'exp') continue
      const a = 3
      const shifted: Term = { ...term, shift: a }
      expect(close(evalTermS(shifted, S), evalTermS(term, S - a)), JSON.stringify(term)).toBe(true)
    }
  })

  it('multiplies a delayed row’s transform by e^{-as}', () => {
    for (const term of cases({})) {
      const d = 2
      const delayed: Term = { ...term, delay: d }
      const want = Math.exp(-d * S) * evalTermS(term, S)
      expect(close(evalTermS(delayed, S), want), JSON.stringify(term)).toBe(true)
    }
  })

  it('switches a delayed row off before its delay and on after', () => {
    const term: Term = { form: 'power', coef: frac(1), n: 2, delay: 2 }
    expect(evalTermF(term, 1.9)).toBe(0)
    expect(evalTermF(term, 2)).toBeCloseTo(0, 12)
    expect(evalTermF(term, 5)).toBeCloseTo(9, 12) // (5-2)^2
  })

  it('gives the unit step itself the transform e^{-as}/s', () => {
    for (const a of [1, 2, 4]) {
      const step: Term = { form: 'one', coef: frac(1), delay: a }
      expect(evalTermS(step, S)).toBeCloseTo(Math.exp(-a * S) / S, 12)
    }
  })
})
