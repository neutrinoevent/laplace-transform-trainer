/**
 * The decomposition has to be exact, because the answer it feeds is compared
 * numerically against the fraction it came from. Every case here multiplies the
 * pieces back out and insists on getting the original.
 */

import { describe, expect, it } from 'vitest'
import { decompose, denominatorPoly, pieceValue, type Factor } from './partial'
import { polyEval } from './poly'
import { frac } from './frac'

const AT = [0.37, 1.9, 4.3, 7.1, 11.6, 19.4]

/** Sum of the pieces equals the fraction, away from every pole. */
function reassembles(num: number[], factors: Factor[]) {
  const pieces = decompose(num, factors)
  expect(pieces, JSON.stringify(factors)).not.toBeNull()
  const den = denominatorPoly(factors)
  for (const s of AT) {
    const whole = polyEval(num, s) / polyEval(den, s)
    const parts = pieces!.reduce((sum, p) => sum + pieceValue(p, s), 0)
    expect(Math.abs(whole - parts), `s=${s}`).toBeLessThan(1e-9 * (1 + Math.abs(whole)))
  }
  return pieces!
}

describe('decomposing exactly', () => {
  it('splits distinct linear factors', () => {
    // (3s-1)/((s-2)(s+2)) = (5/4)/(s-2) + (7/4)/(s+2)
    const pieces = reassembles([-1, 3], [
      { kind: 'linear', root: 2, power: 1 },
      { kind: 'linear', root: -2, power: 1 },
    ])
    expect(pieces).toEqual([
      { kind: 'linear', root: 2, order: 1, c: frac(5, 4) },
      { kind: 'linear', root: -2, order: 1, c: frac(7, 4) },
    ])
  })

  it('splits a repeated factor into every power', () => {
    const pieces = reassembles([1, 0, 1], [{ kind: 'linear', root: 1, power: 3 }])
    expect(pieces.map((p) => (p.kind === 'linear' ? p.order : 0))).toEqual([1, 2, 3])
  })

  it('handles an irreducible quadratic, translated', () => {
    reassembles([5, 2], [{ kind: 'quad', alpha: -1, beta: 3 }])
  })

  it('handles a linear factor beside a quadratic', () => {
    reassembles([1, 1, 2], [
      { kind: 'linear', root: -1, power: 1 },
      { kind: 'quad', alpha: 0, beta: 2 },
    ])
  })

  it('handles a repeated factor beside a distinct one', () => {
    reassembles([2, -1, 1], [
      { kind: 'linear', root: 2, power: 2 },
      { kind: 'linear', root: -3, power: 1 },
    ])
  })

  it('keeps constants exact rather than fitted', () => {
    // 1/((s)(s-3)) = (-1/3)/s + (1/3)/(s-3)
    const pieces = decompose([1], [
      { kind: 'linear', root: 0, power: 1 },
      { kind: 'linear', root: 3, power: 1 },
    ])!
    expect(pieces[0]).toEqual({ kind: 'linear', root: 0, order: 1, c: frac(-1, 3) })
    expect(pieces[1]).toEqual({ kind: 'linear', root: 3, order: 1, c: frac(1, 3) })
  })

  it('refuses a numerator that is not proper', () => {
    expect(decompose([0, 0, 1], [{ kind: 'linear', root: 1, power: 1 }])).toBeNull()
  })

  it('handles the zero numerator', () => {
    const pieces = decompose([0], [{ kind: 'linear', root: 1, power: 1 }])!
    expect(pieces[0]).toEqual({ kind: 'linear', root: 1, order: 1, c: frac(0) })
  })
})
