/**
 * Initial-value problems, solved end to end.
 *
 * This is the section everything else was for. The rows give you a dictionary,
 * Theorem 7.2.2 turns an equation into an algebraic one, partial fractions take
 * the result apart, and the rows read it back. Until now the app stopped one
 * step short in both directions: the Solve drill produced a formula for `Y(s)`
 * and left it there, and the Fractions drill inverted a fraction somebody else
 * had handed over. Here the student starts from an equation and finishes with a
 * function of `t`.
 *
 * Problems are built from the equation forwards, not from the answer backwards,
 * because an IVP does not let you choose your own denominator: the poles of
 * `Y(s)` are the characteristic roots plus whatever the forcing function
 * contributes, and the constants come out however they come out. So the
 * generator picks an equation, transforms it, decomposes the result exactly
 * (`lib/partial`), and inverts each piece. What the student is asked is what the
 * mathematics produced.
 *
 * The two shapes deliberately avoided are a repeated irreducible quadratic —
 * which inverts through `t\sin kt`, a row this trainer does not carry — and any
 * pole of multiplicity above three, which is arithmetic rather than method.
 */

import { evalF, type Term } from '../data/forms'
import { factorial, frac, mulF, texFrac, type Frac } from '../lib/frac'
import { fTex, lapTight } from '../lib/expr'
import {
  decompose,
  denominatorPoly,
  mergeFactors,
  type Factor,
  type Piece,
} from '../lib/partial'
import { polyAdd, polyEval, polyMul, polyTex, polyTrim, type Poly } from '../lib/poly'
import { scopePoints, type Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import type { SlipId } from '../data/slips'
import type { Facet } from '../lib/facets'
import type { Choice, Step } from './types'

export const IVP_ITEM = 'ivp:solve'

export interface IvpProblem {
  itemId: string
  order: number
  /** The equation as posed, and the initial values beside it. */
  statementTex: string
  givenTex: string
  question: string
  prefixTex: string
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  points: Record<string, number>[]
  answerTex: string
  /** The solution, as rows. */
  terms: Term[]
  choices: Choice[]
  correctIndex: number
  hint: string
  derivation: Step[]
  syntaxNote: string
  facets: Facet[]
}

// ---------------------------------------------------------------------------
// Equations
// ---------------------------------------------------------------------------

/**
 * A characteristic polynomial, kept beside the factors it was built from. The
 * factors are known here rather than recovered later, which is what keeps the
 * decomposition exact.
 */
interface Char {
  poly: Poly
  factors: Factor[]
  /** True when a conjugate pair is in play, so the answer oscillates. */
  complex: boolean
  repeated: boolean
}

const ROOTS = [-3, -2, -2, -1, -1, 1, 1, 2, 2, 3]
const BETAS = [1, 2, 2, 3]
const ALPHAS = [0, 0, -1, -1, 1, -2, 2]

const linear = (root: number): Factor => ({ kind: 'linear', root, power: 1 })

function distinctRoots(rng: RNG, n: number): number[] {
  const out: number[] = []
  while (out.length < n) {
    const r = rng.pick(ROOTS)
    if (!out.includes(r)) out.push(r)
  }
  return out
}

/** `y' + ay = ...` — one root, the gentlest case there is. */
function firstOrder(rng: RNG): Char {
  const r = rng.pick(ROOTS)
  return { poly: [-r, 1], factors: [linear(r)], complex: false, repeated: false }
}

function secondOrder(rng: RNG, allowComplex: boolean, allowRepeated: boolean): Char {
  const roll = rng.next()
  if (allowComplex && roll < 0.4) {
    const alpha = rng.pick(ALPHAS)
    const beta = rng.pick(BETAS)
    return {
      poly: [alpha * alpha + beta * beta, -2 * alpha, 1],
      factors: [{ kind: 'quad', alpha, beta }],
      complex: true,
      repeated: false,
    }
  }
  if (allowRepeated && roll < 0.6) {
    const r = rng.pick(ROOTS)
    return {
      poly: polyMul([-r, 1], [-r, 1]),
      factors: [{ kind: 'linear', root: r, power: 2 }],
      complex: false,
      repeated: true,
    }
  }
  const [a, b] = distinctRoots(rng, 2)
  return {
    poly: polyMul([-a, 1], [-b, 1]),
    factors: [linear(a), linear(b)],
    complex: false,
    repeated: false,
  }
}

/** Third order: a root beside a quadratic, so the arithmetic stays humane. */
function thirdOrder(rng: RNG): Char {
  const second = secondOrder(rng, true, false)
  const roots = second.factors
    .filter((f): f is Extract<Factor, { kind: 'linear' }> => f.kind === 'linear')
    .map((f) => f.root)
  let r = rng.pick(ROOTS)
  for (let i = 0; i < 12 && roots.includes(r); i++) r = rng.pick(ROOTS)
  return {
    poly: polyMul([-r, 1], second.poly),
    factors: [linear(r), ...second.factors],
    complex: second.complex,
    repeated: roots.includes(r),
  }
}

// ---------------------------------------------------------------------------
// Forcing
// ---------------------------------------------------------------------------

/** A forcing function, with the transform it contributes as an exact fraction. */
interface Forcing {
  term: Term
  num: Poly
  factors: Factor[]
  /** The transform it is most often given by mistake, and why that is wrong. */
  wrong?: { num: Poly; factors: Factor[]; why: string; slip: SlipId }
}

const COEFS = [1, 1, 2, 2, 3, 4, 5, 6]

function forcingFor(rng: RNG, rich: boolean): Forcing {
  const c = rng.pick(COEFS) * (rng.bool(0.25) ? -1 : 1)
  const kinds = rich ? ['const', 'exp', 'cos', 'sin', 'ramp'] : ['const', 'exp', 'const', 'exp']
  switch (rng.pick(kinds)) {
    case 'exp': {
      const a = rng.pick(ROOTS)
      return {
        term: { form: 'exp', coef: frac(c), a },
        num: [c],
        factors: [linear(a)],
        wrong: {
          num: [c],
          factors: [linear(-a)],
          why: `The right-hand side was transformed with the wrong sign: $e^{${a}t}$ has a pole at $s = ${a}$, so it is $1/(s ${a < 0 ? '+' : '-'} ${Math.abs(a)})$.`,
          slip: 'exp-sign',
        },
      }
    }
    case 'cos': {
      const k = rng.pick(BETAS)
      return {
        term: { form: 'cos', coef: frac(c), k },
        num: [0, c],
        factors: [{ kind: 'quad', alpha: 0, beta: k }],
        wrong: {
          num: [c * k],
          factors: [{ kind: 'quad', alpha: 0, beta: k }],
          why: 'The right-hand side was transformed as a sine. Cosine puts an $s$ on top; a constant on top is the sine row.',
          slip: 'row-marker',
        },
      }
    }
    case 'sin': {
      const k = rng.pick(BETAS)
      return {
        term: { form: 'sin', coef: frac(c), k },
        num: [c * k],
        factors: [{ kind: 'quad', alpha: 0, beta: k }],
        wrong: {
          num: [0, c],
          factors: [{ kind: 'quad', alpha: 0, beta: k }],
          why: 'The right-hand side was transformed as a cosine. Sine needs $k$ on top, not $s$.',
          slip: 'row-marker',
        },
      }
    }
    case 'ramp':
      // c t transforms to c/s^2, which meets the equation as a double pole at 0.
      return {
        term: { form: 'power', coef: frac(c), n: 1 },
        num: [c],
        factors: [{ kind: 'linear', root: 0, power: 2 }],
        wrong: {
          num: [c],
          factors: [linear(0)],
          why: 'The right-hand side lost a power of $s$: $\\mathcal{L}\\{t\\} = 1/s^2$, not $1/s$.',
          slip: 'power-index',
        },
      }
    default:
      return { term: { form: 'one', coef: frac(c) }, num: [c], factors: [linear(0)] }
  }
}

// ---------------------------------------------------------------------------
// Transforming the equation
// ---------------------------------------------------------------------------

/**
 * What the initial values contribute to the transformed equation.
 *
 * Summing Theorem 7.2.2 over the equation, the terms that are not `Y(s)` are
 *
 *     sum over k of a_k sum over j < k of s^(k-1-j) y^(j)(0)
 *
 * which is the polynomial the equation carries over from its initial state.
 */
export function initialPoly(charPoly: Poly, initial: number[]): Poly {
  let out: Poly = [0]
  for (let k = 1; k < charPoly.length; k++) {
    const a = charPoly[k]
    if (!a) continue
    for (let j = 0; j < k; j++) {
      const power = k - 1 - j
      const term: Poly = Array(power).fill(0)
      term.push(a * (initial[j] ?? 0))
      out = polyAdd(out, term)
    }
  }
  return polyTrim(out)
}

// ---------------------------------------------------------------------------
// Inverting the pieces
// ---------------------------------------------------------------------------

/** Each piece as the row it inverts to. A zero constant contributes nothing. */
export function pieceToTerms(piece: Piece): Term[] {
  if (piece.kind === 'linear') {
    if (piece.c.n === 0) return []
    if (piece.order === 1) {
      return piece.root === 0
        ? [{ form: 'one', coef: piece.c }]
        : [{ form: 'exp', coef: piece.c, a: piece.root }]
    }
    // c/(s-r)^j is t^(j-1) e^{rt}/(j-1)!, which is row (b) translated by r.
    return [
      {
        form: 'power',
        n: piece.order - 1,
        coef: mulF(piece.c, frac(1, factorial(piece.order - 1))),
        shift: piece.root || undefined,
      },
    ]
  }
  const { alpha, beta, A, B } = piece
  const shift = alpha || undefined
  const out: Term[] = []
  if (A.n !== 0) out.push({ form: 'cos', coef: A, k: beta, shift })
  if (B.n !== 0) out.push({ form: 'sin', coef: mulF(B, frac(1, beta)), k: beta, shift })
  return out
}

const termsOf = (pieces: Piece[]): Term[] => pieces.flatMap(pieceToTerms)

// ---------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------

const primeTex = (n: number): string =>
  n === 0 ? 'y' : `y^{${'\\prime'.repeat(n)}}`

const initialTex = (j: number): string => `${primeTex(j)}(0)`

/** `y'' - y' - 6y`, written the way the book writes an equation. */
function equationTex(charPoly: Poly, forcing: Forcing | null): string {
  const parts: string[] = []
  for (let k = charPoly.length - 1; k >= 0; k--) {
    const a = charPoly[k]
    if (!a) continue
    const body = primeTex(k)
    const mag = Math.abs(a)
    const piece = mag === 1 ? body : `${mag}${body}`
    if (!parts.length) parts.push(a < 0 ? `-${piece}` : piece)
    else parts.push(`${a < 0 ? '-' : '+'} ${piece}`)
  }
  const right = forcing ? fTex([forcing.term]) : '0'
  return `${parts.join(' ')} = ${right}`
}

/** `Y(s) = (2s + 1)/(s^2 - 4)`, or with the forcing's share written beside it. */
function solvedTex(num: Poly, den: Poly): string {
  return `\\dfrac{${polyTex(num)}}{${polyTex(den)}}`
}

function piecesTex(pieces: Piece[]): string {
  const shown = pieces.filter((p) => (p.kind === 'linear' ? p.c.n !== 0 : p.A.n !== 0 || p.B.n !== 0))
  if (!shown.length) return '0'
  return shown
    .map((p) => {
      if (p.kind === 'linear') {
        const body = p.root < 0 ? `s + ${-p.root}` : p.root === 0 ? 's' : `s - ${p.root}`
        const den = p.order > 1 ? `\\left(${body}\\right)^{${p.order}}` : body
        return { neg: p.c.n < 0, tex: `\\dfrac{${texFrac(absF(p.c))}}{${den}}` }
      }
      const shifted = p.alpha < 0 ? `s + ${-p.alpha}` : p.alpha === 0 ? 's' : `s - ${p.alpha}`
      const den =
        p.alpha === 0 ? `s^2 + ${p.beta ** 2}` : `\\left(${shifted}\\right)^2 + ${p.beta ** 2}`
      const head =
        p.A.n === 0
          ? ''
          : p.A.n === 1 && p.A.d === 1
            ? p.alpha === 0
              ? 's'
              : `\\left(${shifted}\\right)`
            : `${texFrac(p.A)}\\left(${shifted}\\right)`
      const tail =
        p.B.n === 0 ? '' : head ? ` ${p.B.n < 0 ? '-' : '+'} ${texFrac(absF(p.B))}` : texFrac(p.B)
      return { neg: false, tex: `\\dfrac{${head}${tail}}{${den}}` }
    })
    .map((x, i) => (i === 0 ? (x.neg ? `-${x.tex}` : x.tex) : x.neg ? ` - ${x.tex}` : ` + ${x.tex}`))
    .join('')
}

const absF = (a: Frac): Frac => (a.n < 0 ? { n: -a.n, d: a.d } : a)

// ---------------------------------------------------------------------------
// Distractors
// ---------------------------------------------------------------------------

/**
 * Wrong answers built by re-solving the same problem with one thing changed, so
 * each is a decomposition of something — the answer you would get from a real
 * slip, not a plausible-looking expression.
 */
function candidates(
  rng: RNG,
  charPoly: Poly,
  factors: Factor[],
  initial: number[],
  forcing: Forcing | null,
  answerTex: string,
): Choice[] {
  const out: Choice[] = []
  const seen = new Set([answerTex])

  const push = (num: Poly, fs: Factor[], why: string, slip: SlipId) => {
    let pieces: Piece[] | null = null
    try {
      pieces = decompose(num, mergeFactors(fs))
    } catch {
      return
    }
    if (!pieces) return
    const terms = termsOf(pieces)
    if (!terms.length) return
    const tex = fTex(terms)
    if (seen.has(tex)) return
    seen.add(tex)
    out.push({ tex, why, slip, value: (o) => evalF(terms, o.t) })
  }

  const gd = forcing ? denominatorPoly(mergeFactors(forcing.factors)) : [1]
  const gn = forcing ? forcing.num : [0]
  const all = forcing ? [...factors, ...forcing.factors] : factors
  const full = (init: Poly) => polyAdd(polyMul(init, gd), gn)

  // Dropping the initial values is the commonest way to lose a transform of a
  // derivative: L{y''} is not s^2 Y(s).
  push(full([0]), all, 'The initial values have been dropped. $\\mathcal{L}\\{y^{\\prime\\prime}\\}$ carries $-sy(0) - y^{\\prime}(0)$ with it; leaving them out solves a different problem.', 'derivative-terms')

  // Signs on the carried-over terms.
  const init = initialPoly(charPoly, initial)
  push(full(init.map((c) => -c)), all, 'Every carried-over initial term has the wrong sign. They are *subtracted* in Theorem 7.2.2, so they arrive on the other side with a plus.', 'derivative-terms')

  if (initial.length > 1 && initial[1] !== 0) {
    const dropped = initialPoly(charPoly, [initial[0], 0, ...initial.slice(2)])
    push(full(dropped), all, `Only $y(0)$ has been carried over. $\\mathcal{L}\\{y^{\\prime\\prime}\\}$ owes $y^{\\prime}(0)$ as well.`, 'derivative-terms')
  }

  // Two initial values in the wrong order.
  if (initial.length > 1 && initial[0] !== initial[1]) {
    const swapped = initialPoly(charPoly, [initial[1], initial[0], ...initial.slice(2)])
    push(full(swapped), all, `$y(0)$ and $y^{\\prime}(0)$ have been used the wrong way round.`, 'derivative-terms')
  }

  if (forcing) {
    // Ignoring the forcing function leaves the homogeneous solution.
    push(init, factors, 'That is the solution of the equation with the right-hand side set to zero — the forcing function has been left out.', 'linearity')

    // Dividing only the initial part: Y = (init)/p(s) + G(s), with the forcing
    // never put over the characteristic polynomial at all.
    push(
      polyAdd(polyMul(init, gd), polyMul(gn, charPoly)),
      all,
      'The forcing term was never divided by the characteristic polynomial. *Everything* on the right goes over $p(s)$, not just the initial values.',
      'linearity',
    )

    if (forcing.wrong) {
      push(
        polyAdd(polyMul(init, denominatorPoly(mergeFactors(forcing.wrong.factors))), forcing.wrong.num),
        [...factors, ...forcing.wrong.factors],
        forcing.wrong.why,
        forcing.wrong.slip,
      )
    }
  }

  return rng.shuffle(out)
}

// ---------------------------------------------------------------------------
// Worked solution
// ---------------------------------------------------------------------------

function derivationFor(
  charPoly: Poly,
  initial: number[],
  forcing: Forcing | null,
  init: Poly,
  num: Poly,
  den: Poly,
  pieces: Piece[],
  terms: Term[],
): Step[] {
  const order = charPoly.length - 1
  const yTex = 'Y(s)'
  const steps: Step[] = []

  const transformed = charPoly
    .map((a, k) => {
      if (!a) return null
      if (k === 0) return `${a === 1 ? '' : a}${yTex}`
      const carried = Array.from({ length: k }, (_, j) => {
        const power = k - 1 - j
        return `${power === 0 ? '' : power === 1 ? 's' : `s^{${power}}`}${initialTex(j)}`
      }).join(' - ')
      const body = `\\left(${k === 1 ? 's' : `s^{${k}}`}${yTex} - ${carried}\\right)`
      return a === 1 ? body : `${a}${body}`
    })
    .filter(Boolean)
    .join(' + ')

  steps.push({
    label: 'Transform each term',
    text: `Theorem 7.2.2 turns every derivative into $${yTex}$ and the initial values it was started from. The equation stops being a differential equation here.`,
    tex: `${transformed} = ${forcing ? lapTight(fTex([forcing.term])) : '0'}`,
  })

  steps.push({
    label: 'Put the numbers in',
    text: `With ${initial
      .slice(0, order)
      .map((v, j) => `$${initialTex(j)} = ${v}$`)
      .join(' and ')}${forcing ? `, and the transform of the right-hand side` : ''}.`,
    tex: `\\left(${polyTex(charPoly)}\\right)${yTex} = ${polyTex(init) === '0' ? '' : polyTex(init)}${
      forcing
        ? `${polyTex(init) === '0' ? '' : ' + '}\\dfrac{${polyTex(forcing.num)}}{${polyTex(denominatorPoly(mergeFactors(forcing.factors)))}}`
        : ''
    }`,
  })

  steps.push({
    label: `Solve for ${yTex}`,
    text: 'Divide. Nothing here is calculus any more — it is one line of algebra.',
    tex: `${yTex} = ${solvedTex(num, den)}`,
  })

  steps.push({
    label: 'Decompose',
    text: 'Split it into pieces the table can read, one per factor of the denominator.',
    tex: `${yTex} = ${piecesTex(pieces)}`,
  })

  steps.push({
    label: 'Invert',
    text: 'Each piece is a row, read right to left.',
    tex: `y(t) = ${fTex(terms)}`,
  })

  return steps
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface IvpOptions {
  /** 0..3; see `lib/ladder`. Defaults to the full section. */
  rung?: number
  optionCount?: number
  /** Items whose harder variant is still under-tested, and should be forced. */
  uncovered?: Set<string>
  seed?: number
}

const INITIALS = [0, 1, 1, 2, 2, 3, -1, -2]

/**
 * One initial-value problem, or null when the draw produced something this
 * trainer will not pose — a repeated quadratic, a pole of multiplicity four, or
 * a decomposition that came out degenerate. The caller retries.
 */
function attempt(
  rng: RNG,
  rung: number,
  optionCount: number,
  forceForcing = false,
): IvpProblem | null {
  // The bottom rung says "one derivative", so it serves one — a rung whose
  // blurb and questions disagree teaches the student to ignore the blurb.
  // Above it, second order is the norm, first order still turns up, and third
  // is the occasional stretch once everything else holds.
  const roll = rng.next()
  const order =
    rung === 0 ? 1 : rung >= 3 && roll < 0.12 ? 3 : roll < 0.18 ? 1 : 2

  const chr =
    order === 1
      ? firstOrder(rng)
      : order === 2
        ? secondOrder(rng, rung >= 2, rung >= 2)
        : thirdOrder(rng)

  const initial = Array.from({ length: order }, () => rng.pick(INITIALS))
  const forceChance = rung === 0 ? 0.25 : rung === 1 ? 0.55 : 0.65
  // A homogeneous equation is the easy half of this skill: the forcing function
  // is where the transform earns its keep, so it is insisted on when owed.
  const forcing =
    forceForcing || rng.next() < forceChance ? forcingFor(rng, rung >= 2) : null

  // Zero everywhere is not a problem, it is a tautology.
  if (!forcing && initial.every((v) => v === 0)) return null

  const gd = forcing ? denominatorPoly(mergeFactors(forcing.factors)) : [1]
  const gn = forcing ? forcing.num : [0]
  const init = initialPoly(chr.poly, initial)
  const num = polyTrim(polyAdd(polyMul(init, gd), gn))
  const den = polyMul(chr.poly, gd)

  let factors: Factor[]
  try {
    factors = mergeFactors(forcing ? [...chr.factors, ...forcing.factors] : chr.factors)
  } catch {
    // A forcing function that resonates with a complex pair: not this trainer's.
    return null
  }
  if (factors.some((f) => f.kind === 'linear' && f.power > 3)) return null

  const pieces = decompose(num, factors)
  if (!pieces) return null
  const terms = termsOf(pieces)
  if (!terms.length) return null

  const answerTex = fTex(terms)
  const symbols: Symbols = { primary: 't', allowed: ['t'] }
  const pool = candidates(rng, chr.poly, chr.factors, initial, forcing, answerTex)
  // One option is not a question. Every shape here has several ways to go wrong,
  // so a draw that produced none means something collapsed; take another.
  if (pool.length < 2) return null
  const kept = pool.slice(0, Math.max(1, optionCount - 1))
  const choices = rng.shuffle([{ tex: answerTex, why: null } as Choice, ...kept])

  const repeated = factors.some((f) => f.kind === 'linear' && f.power > 1)
  const quadratic = factors.some((f) => f.kind === 'quad')

  return {
    itemId: IVP_ITEM,
    order,
    statementTex: equationTex(chr.poly, forcing),
    givenTex: initial.map((v, j) => `${initialTex(j)} = ${v}`).join(',\\; '),
    question: 'Solve the initial-value problem. Your answer is a function of $t$.',
    prefixTex: 'y(t) =',
    symbols,
    target: (o) => evalF(terms, o.t),
    points: scopePoints(symbols),
    answerTex,
    terms,
    choices,
    correctIndex: choices.findIndex((c) => c.why === null),
    hint: `Transform both sides. ${
      order === 1
        ? '$\\mathcal{L}\\{y^{\\prime}\\} = sY(s) - y(0)$'
        : '$\\mathcal{L}\\{y^{\\prime\\prime}\\} = s^2Y(s) - sy(0) - y^{\\prime}(0)$'
    }, collect $Y(s)$, divide, then take the result apart and read each piece off the table.`,
    derivation: derivationFor(chr.poly, initial, forcing, init, num, den, pieces, terms),
    syntaxNote: 'Give a function of `t`, for example `2e^(3t) - t*e^(-t)`.',
    facets: [
      ...(forcing ? (['forced'] as const) : []),
      ...(quadratic ? (['quadratic'] as const) : []),
      ...(repeated ? (['repeated'] as const) : []),
      ...(order >= 3 ? (['high-order'] as const) : []),
    ],
  }
}

export function nextIvpProblem(o: IvpOptions = {}): IvpProblem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const rung = Math.max(0, Math.min(3, o.rung ?? 3))
  const count = o.optionCount ?? 4
  const forceForcing = o.uncovered?.has(IVP_ITEM) ?? false
  for (let tries = 0; tries < 60; tries++) {
    const problem = attempt(rng, rung, count, forceForcing)
    if (problem) return problem
  }
  // The draws are small and the rejections rare, but a drill must always have a
  // question: fall back to the simplest thing the section can pose.
  return attempt(makeRng(1), 0, count)!
}

/** The transform the answer must have, for tests that check against the equation. */
export function transformOf(num: Poly, den: Poly, s: number): number {
  return polyEval(num, s) / polyEval(den, s)
}
