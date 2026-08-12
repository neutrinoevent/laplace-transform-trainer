/**
 * Partial fractions, worked forwards and exactly.
 *
 * The Fractions drill builds its problems backwards: pick the pieces, multiply
 * out, show the result. That is enough to *pose* a decomposition, but it cannot
 * *perform* one, and an initial-value problem needs the real thing — the
 * denominator that comes out of an IVP is decided by the equation and the
 * forcing function, not chosen for convenience.
 *
 * So this decomposes a given proper rational function over given factors. The
 * identity
 *
 *     N(s) = sum over pieces of (constant x the rest of the denominator)
 *
 * is linear in the unknown constants, so equating coefficients of each power of
 * `s` gives a square system, solved here by elimination over exact rationals.
 * Nothing is fitted and nothing is rounded: a constant that is 5/4 comes out as
 * 5/4, which is what makes it printable and what makes the answer checkable.
 */

import { addF, eqF, frac, mulF, valueOf, type Frac } from './frac'
import { polyMul, polyMulAll, polyTrim, type Poly } from './poly'

/** `(s - root)^power`. */
export interface LinearFactor {
  kind: 'linear'
  root: number
  power: number
}

/** `(s - alpha)^2 + beta^2`, irreducible. */
export interface QuadFactor {
  kind: 'quad'
  alpha: number
  beta: number
}

export type Factor = LinearFactor | QuadFactor

/** `c / (s - root)^order`. */
export interface LinearPiece {
  kind: 'linear'
  root: number
  order: number
  c: Frac
}

/** `(A(s - alpha) + B) / ((s - alpha)^2 + beta^2)`, written around the shift. */
export interface QuadPiece {
  kind: 'quad'
  alpha: number
  beta: number
  A: Frac
  B: Frac
}

export type Piece = LinearPiece | QuadPiece

export const linearPoly = (root: number, power = 1): Poly =>
  polyMulAll(Array.from({ length: power }, () => [-root, 1]))

/** `(s - alpha)^2 + beta^2` multiplied out. */
export const quadPoly = (alpha: number, beta: number): Poly => [
  alpha * alpha + beta * beta,
  -2 * alpha,
  1,
]

export const factorPoly = (f: Factor): Poly =>
  f.kind === 'linear' ? linearPoly(f.root, f.power) : quadPoly(f.alpha, f.beta)

export const denominatorPoly = (factors: Factor[]): Poly => polyMulAll(factors.map(factorPoly))

// ---------------------------------------------------------------------------
// Exact elimination
// ---------------------------------------------------------------------------

/**
 * Solve `M x = b` over the rationals, with `M` given by columns. Returns null
 * when the system is singular, which for a genuine factorisation cannot happen
 * — but a caller that has passed the wrong factors deserves an answer rather
 * than a wrong one.
 */
function solveExact(columns: Poly[], rhs: Poly, rows: number): Frac[] | null {
  const n = columns.length
  // Augmented matrix, one row per power of s.
  const m: Frac[][] = Array.from({ length: rows }, (_, r) => [
    ...columns.map((col) => frac(col[r] ?? 0)),
    frac(rhs[r] ?? 0),
  ])

  const where: number[] = []
  let row = 0
  for (let col = 0; col < n && row < rows; col++) {
    let pivot = -1
    for (let r = row; r < rows; r++) {
      if (m[r][col].n !== 0) {
        pivot = r
        break
      }
    }
    if (pivot === -1) continue
    ;[m[row], m[pivot]] = [m[pivot], m[row]]

    const lead = m[row][col]
    for (let c = col; c <= n; c++) m[row][c] = mulF(m[row][c], frac(lead.d, lead.n))
    for (let r = 0; r < rows; r++) {
      if (r === row || m[r][col].n === 0) continue
      const factorOut = m[r][col]
      for (let c = col; c <= n; c++) {
        m[r][c] = addF(m[r][c], mulF(factorOut, { n: -m[row][c].n, d: m[row][c].d }))
      }
    }
    where[col] = row
    row++
  }

  const x = Array.from({ length: n }, (_, i) =>
    where[i] === undefined ? frac(0) : m[where[i]][n],
  )
  // Every unknown must be pinned down, and no row may read `0 = something`.
  if (where.length < n || where.some((w) => w === undefined)) return null
  for (let r = row; r < rows; r++) if (m[r][n].n !== 0) return null
  return x
}

// ---------------------------------------------------------------------------
// Decomposition
// ---------------------------------------------------------------------------

/**
 * Decompose `num / prod(factors)` into pieces, exactly.
 *
 * `num` must be proper — of lower degree than the denominator — which is the
 * case for every transform an initial-value problem produces.
 */
export function decompose(num: Poly, factors: Factor[]): Piece[] | null {
  const den = denominatorPoly(factors)
  const size = den.length - 1
  if (polyTrim(num).length > size) return null

  // One column per unknown: the polynomial that unknown is multiplied by once
  // the identity is cleared of denominators.
  const columns: Poly[] = []
  const shape: { factor: Factor; order?: number; part?: 'A' | 'B' }[] = []

  for (let i = 0; i < factors.length; i++) {
    const f = factors[i]
    const others = polyMulAll(factors.filter((_, j) => j !== i).map(factorPoly))
    if (f.kind === 'linear') {
      // c/(s-r)^j clears to c (s-r)^(m-j) x everything else.
      for (let order = 1; order <= f.power; order++) {
        columns.push(polyMul(linearPoly(f.root, f.power - order), others))
        shape.push({ factor: f, order })
      }
    } else {
      columns.push(polyMul([-f.alpha, 1], others))
      shape.push({ factor: f, part: 'A' })
      columns.push(others)
      shape.push({ factor: f, part: 'B' })
    }
  }

  const x = solveExact(columns, num, size)
  if (!x) return null

  const pieces: Piece[] = []
  for (let i = 0; i < shape.length; i++) {
    const { factor, order, part } = shape[i]
    if (factor.kind === 'linear') {
      pieces.push({ kind: 'linear', root: factor.root, order: order!, c: x[i] })
    } else if (part === 'A') {
      pieces.push({
        kind: 'quad',
        alpha: factor.alpha,
        beta: factor.beta,
        A: x[i],
        B: x[i + 1],
      })
    }
  }
  return pieces
}

/** What the factors multiply out to, with multiplicities merged. */
export function mergeFactors(factors: Factor[]): Factor[] {
  const out: Factor[] = []
  for (const f of factors) {
    if (f.kind === 'linear') {
      const seen = out.find(
        (o): o is LinearFactor => o.kind === 'linear' && o.root === f.root,
      )
      if (seen) seen.power += f.power
      else out.push({ ...f })
    } else {
      const seen = out.find(
        (o): o is QuadFactor => o.kind === 'quad' && o.alpha === f.alpha && o.beta === f.beta,
      )
      // A repeated irreducible quadratic inverts through rows this trainer does
      // not carry, so callers are expected to avoid it; saying so beats a
      // silently wrong decomposition.
      if (seen) throw new Error('repeated irreducible quadratic')
      out.push({ ...f })
    }
  }
  return out
}

/** A piece's value at a point, for checking a decomposition against its source. */
export function pieceValue(piece: Piece, s: number): number {
  if (piece.kind === 'linear') {
    return valueOf(piece.c) / (s - piece.root) ** piece.order
  }
  const { alpha, beta, A, B } = piece
  return (valueOf(A) * (s - alpha) + valueOf(B)) / ((s - alpha) ** 2 + beta * beta)
}

/** True when every constant came out a whole number, which reads more kindly. */
export const allIntegers = (pieces: Piece[]): boolean =>
  pieces.every((p) =>
    p.kind === 'linear' ? p.c.d === 1 : p.A.d === 1 && p.B.d === 1,
  )

/** Whether two decompositions agree, for tests and for guarding a generator. */
export const samePieces = (a: Piece[], b: Piece[]): boolean =>
  a.length === b.length &&
  a.every((p, i) => {
    const q = b[i]
    if (p.kind !== q.kind) return false
    if (p.kind === 'linear' && q.kind === 'linear') {
      return p.root === q.root && p.order === q.order && eqF(p.c, q.c)
    }
    if (p.kind === 'quad' && q.kind === 'quad') {
      return p.alpha === q.alpha && p.beta === q.beta && eqF(p.A, q.A) && eqF(p.B, q.B)
    }
    return false
  })
