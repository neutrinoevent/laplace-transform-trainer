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
