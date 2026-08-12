/**
 * Theorem 7.4.1 checked against the definition, not against itself: each
 * derived transform is compared with a numerical integration of
 * `int_0^inf e^{-st} t^n f(t) dt`.
 */

import { describe, expect, it } from 'vitest'
import { rat, ratDeriv, ratEval, ratMultiplyByT, ratTex } from './rat'

/** L{f}(s) straight off the definition, by Simpson's rule. */
function transform(f: (t: number) => number, s: number, T = 40, N = 160000): number {
  const h = T / N
  let sum = 0
  for (let i = 0; i <= N; i++) {
    const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2
    sum += w * Math.exp(-s * i * h) * f(i * h)
  }
  return (sum * h) / 3
}

describe('differentiating a transform', () => {
  it('gives the results the book works out', () => {
    // L{sin kt} = k/(s^2+k^2), so L{t sin kt} = 2ks/(s^2+k^2)^2.
    const sin3 = rat([3], [9, 0, 1])
    expect(ratMultiplyByT(sin3, 1)).toEqual({ p: [0, 6], d: [9, 0, 1], m: 2 })

    // L{cos kt} = s/(s^2+k^2), so L{t cos kt} = (s^2-k^2)/(s^2+k^2)^2.
    const cos3 = rat([0, 1], [9, 0, 1])
    expect(ratMultiplyByT(cos3, 1)).toEqual({ p: [-9, 0, 1], d: [9, 0, 1], m: 2 })

    // The book's NOTE: L{te^{3t}} = 1/(s-3)^2, by 7.4.1 as well as by 7.3.1.
    expect(ratMultiplyByT(rat([1], [-3, 1]), 1)).toEqual({ p: [1], d: [-3, 1], m: 2 })
  })

  it('keeps the denominator from inflating as it differentiates', () => {
    let f = rat([3], [9, 0, 1])
    for (let n = 1; n <= 4; n++) {
      f = ratDeriv(f)
      // One power per differentiation, not a squaring each time.
      expect(f.m).toBe(n + 1)
      expect(f.d).toEqual([9, 0, 1])
    }
  })

  it('agrees with the definition for t^n times each row', () => {
    const cases: { f: (t: number) => number; F: ReturnType<typeof rat>; name: string }[] = [
      { name: 'sin 3t', f: (t) => Math.sin(3 * t), F: rat([3], [9, 0, 1]) },
      { name: 'cos 2t', f: (t) => Math.cos(2 * t), F: rat([0, 1], [4, 0, 1]) },
      { name: 'sinh 2t', f: (t) => Math.sinh(2 * t), F: rat([2], [-4, 0, 1]) },
      { name: 'cosh t', f: (t) => Math.cosh(t), F: rat([0, 1], [-1, 0, 1]) },
      { name: 'e^{2t}', f: (t) => Math.exp(2 * t), F: rat([1], [-2, 1]) },
      { name: '1', f: () => 1, F: rat([1], [0, 1]) },
    ]
    for (const { f, F, name } of cases) {
      for (const n of [1, 2, 3]) {
        const want = ratMultiplyByT(F, n)
        for (const s of [7.5, 11]) {
          const got = transform((t) => t ** n * f(t), s)
          expect(
            Math.abs(got - ratEval(want, s)),
            `t^${n} ${name} at s=${s}: ${ratTex(want)}`,
          ).toBeLessThan(2e-6 * (1 + Math.abs(got)))
        }
      }
    }
  })

  it('prints the power on the denominator', () => {
    expect(ratTex(ratMultiplyByT(rat([3], [9, 0, 1]), 1))).toBe(
      '\\dfrac{6s}{\\left(s^{2} + 9\\right)^{2}}',
    )
  })
})
