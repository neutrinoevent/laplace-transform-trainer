/**
 * Small exact rationals.
 *
 * Every coefficient in this trainer is rational — an inverse transform that
 * needs a fix-up produces 1/k or 1/(n-1)!, and those have to print as
 * \frac{1}{6} rather than 0.16666666666666666. The numbers involved are tiny
 * (factorials up to 5!, frequencies up to 9), so plain integers are enough.
 */

export interface Frac {
  n: number
  d: number
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) [a, b] = [b, a % b]
  return a || 1
}

export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('zero denominator')
  const sign = d < 0 ? -1 : 1
  const g = gcd(n, d)
  return { n: (sign * n) / g, d: (sign * d) / g }
}

export const addF = (a: Frac, b: Frac): Frac => frac(a.n * b.d + b.n * a.d, a.d * b.d)
export const mulF = (a: Frac, b: Frac): Frac => frac(a.n * b.n, a.d * b.d)
export const negF = (a: Frac): Frac => ({ n: -a.n, d: a.d })
export const isInt = (a: Frac): boolean => a.d === 1
export const isOne = (a: Frac): boolean => a.n === 1 && a.d === 1
export const valueOf = (a: Frac): number => a.n / a.d
export const eqF = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d

/** `\frac{3}{4}`, or just `3` when the denominator is 1. Sign rides on top. */
export function texFrac(a: Frac): string {
  if (isInt(a)) return String(a.n)
  return a.n < 0 ? `-\\frac{${-a.n}}{${a.d}}` : `\\frac{${a.n}}{${a.d}}`
}

/**
 * A coefficient standing in front of something: `2\sin 3t`, `\frac{1}{3}\sin 3t`,
 * `-\sin 3t`, `\sin 3t`. Pass `mulDot` for cases where juxtaposition would read
 * badly (a bare number times a bare number).
 */
export function texCoef(a: Frac, body: string): string {
  if (!body) return texFrac(a)
  if (isOne(a)) return body
  if (a.n === -1 && a.d === 1) return `-${body}`
  if (isInt(a)) return `${a.n}${body}`
  const inner = `\\frac{${Math.abs(a.n)}}{${a.d}}\\,${body}`
  return a.n < 0 ? `-${inner}` : inner
}

/** Join signed pieces into `a - b + c`, folding the sign of each into the join. */
export function texSum(pieces: { neg: boolean; tex: string }[]): string {
  return pieces
    .map((p, i) => (i === 0 ? (p.neg ? `-${p.tex}` : p.tex) : p.neg ? ` - ${p.tex}` : ` + ${p.tex}`))
    .join('')
}

export function factorial(n: number): number {
  let out = 1
  for (let i = 2; i <= n; i++) out *= i
  return out
}
