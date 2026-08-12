/**
 * Integer polynomials in s, small and dense.
 *
 * Solving an IVP for Y(s) produces two of them — the characteristic polynomial
 * downstairs and the initial-value polynomial upstairs — and both have to be
 * printed exactly and evaluated numerically. Coefficients are indexed by power,
 * so `[2, 3, 1]` is `s^2 + 3s + 2`.
 */

export type Poly = number[]

export const polyEval = (p: Poly, s: number): number =>
  p.reduce((sum, c, i) => sum + c * s ** i, 0)

export const polyDegree = (p: Poly): number => {
  for (let i = p.length - 1; i >= 0; i--) if (p[i] !== 0) return i
  return -1
}

/** `s^2 + 3s + 2`, highest power first, with the usual elisions. */
export function polyTex(p: Poly, v = 's'): string {
  const pieces: { neg: boolean; tex: string }[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i]
    if (c === 0) continue
    const mag = Math.abs(c)
    const power = i === 0 ? '' : i === 1 ? v : `${v}^{${i}}`
    const coef = mag === 1 && i > 0 ? '' : String(mag)
    pieces.push({ neg: c < 0, tex: `${coef}${power}` })
  }
  if (!pieces.length) return '0'
  return pieces
    .map((x, i) => (i === 0 ? (x.neg ? `-${x.tex}` : x.tex) : x.neg ? ` - ${x.tex}` : ` + ${x.tex}`))
    .join('')
}

export const polyAdd = (a: Poly, b: Poly): Poly =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))

export const polyScale = (p: Poly, c: number): Poly => p.map((x) => x * c)

export function polyMul(a: Poly, b: Poly): Poly {
  if (!a.length || !b.length) return []
  const out = new Array<number>(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j]
  }
  return out
}

export const polyMulAll = (ps: Poly[]): Poly => ps.reduce(polyMul, [1])

export const polySub = (a: Poly, b: Poly): Poly => polyAdd(a, polyScale(b, -1))

/** `d/ds`, which drops the constant term and pulls each power down one. */
export const polyDeriv = (p: Poly): Poly => (p.length < 2 ? [0] : p.slice(1).map((c, i) => c * (i + 1)))

/** Drop trailing zeros so degree and equality mean what they say. */
export const polyTrim = (p: Poly): Poly => p.slice(0, polyDegree(p) + 1)

/** Real roots, for keeping the answer checker's samples clear of the poles. */
export function polyRealRoots(p: Poly): number[] {
  const d = polyDegree(p)
  if (d === 1) return [-p[0] / p[1]]
  if (d === 2) {
    const [c, b, a] = p
    const disc = b * b - 4 * a * c
    if (disc < 0) return []
    const r = Math.sqrt(disc)
    return disc === 0 ? [-b / (2 * a)] : [(-b - r) / (2 * a), (-b + r) / (2 * a)]
  }
  return []
}
