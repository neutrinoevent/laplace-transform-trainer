/**
 * A transform written as `P(s) / D(s)^m`, and its derivatives.
 *
 * Theorem 7.4.1 says `L{t^n f(t)} = (-1)^n F^{(n)}(s)`, so using it means
 * differentiating a transform — repeatedly, and exactly, because the answer has
 * to be printed and then compared against what a student types.
 *
 * Differentiating a rational function naively squares the denominator each time,
 * so after three goes `k/(s^2+k^2)` would be carrying `(s^2+k^2)^8` with seven
 * of those powers cancelling. Keeping the denominator as a base and a power
 * avoids that entirely:
 *
 *     d/ds [ P / D^m ] = ( P'D - mPD' ) / D^(m+1)
 *
 * which is the shape every row's transform already has, and the shape it stays
 * in however many times it is differentiated.
 */

import { polyDeriv, polyEval, polyMul, polyScale, polySub, polyTex, polyTrim, type Poly } from './poly'

export interface Rat {
  /** Numerator. */
  p: Poly
  /** The base of the denominator — degree 1 or 2 for every row in the table. */
  d: Poly
  /** The power that base is raised to. */
  m: number
}

/** Negative zero is still zero, and must not reach a printed coefficient. */
const noNegZero = (p: Poly): Poly => p.map((c) => (c === 0 ? 0 : c))

export const rat = (p: Poly, d: Poly, m = 1): Rat => ({
  p: noNegZero(polyTrim(p)),
  d: noNegZero(polyTrim(d)),
  m,
})

/** One differentiation with respect to `s`, staying in the same family. */
export const ratDeriv = (f: Rat): Rat =>
  rat(
    polySub(polyMul(polyDeriv(f.p), f.d), polyScale(polyMul(f.p, polyDeriv(f.d)), f.m)),
    f.d,
    f.m + 1,
  )

/** `(-1)^n F^{(n)}(s)` — Theorem 7.4.1 applied `n` times. */
export function ratMultiplyByT(f: Rat, n: number): Rat {
  let out = f
  for (let i = 0; i < n; i++) out = ratDeriv(out)
  return n % 2 === 0 ? out : rat(polyScale(out.p, -1), out.d, out.m)
}

export const ratEval = (f: Rat, s: number): number => polyEval(f.p, s) / polyEval(f.d, s) ** f.m

/** `\dfrac{2ks}{\left(s^2 + k^2\right)^{2}}`. */
export function ratTex(f: Rat): string {
  const base = polyTex(f.d)
  const den = f.m === 1 ? base : `\\left(${base}\\right)^{${f.m}}`
  return `\\dfrac{${polyTex(f.p)}}{${den}}`
}

/** Poles, for keeping the checker's samples clear of them. */
export const ratPoles = (f: Rat): number[] => {
  // Degree one or two only, so this is the quadratic formula and nothing more.
  const [c, b = 0, a = 0] = f.d
  if (a === 0) return b === 0 ? [] : [-c / b]
  const disc = b * b - 4 * a * c
  if (disc < 0) return []
  const root = Math.sqrt(disc)
  return [(-b + root) / (2 * a), (-b - root) / (2 * a)]
}
