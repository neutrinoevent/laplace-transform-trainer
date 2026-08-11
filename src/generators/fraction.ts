/**
 * Partial fractions — the step that makes the rest of the trainer usable.
 *
 * Every inverse problem elsewhere in the app arrives already in row form, or one
 * split away from it. Real ones do not: they arrive as one rational function and
 * have to be taken apart before any row applies. That taking-apart is the
 * bottleneck skill of the chapter, and it is where everything else finally meets
 * — the seven rows, the constant fix-up, and both translation theorems, since a
 * repeated linear factor inverts through Theorem 7.3.1 and an irreducible
 * quadratic only yields after completing the square.
 *
 * Problems are built backwards: pick the pieces with integer constants, then
 * multiply out to get the rational function the student is shown. The
 * arithmetic is therefore exact, the constants come out clean, and the answer is
 * a list of `Term`s the existing machinery already knows how to render, evaluate
 * and mutate into distractors.
 */

import { evalF, type Term } from '../data/forms'
import { factorial, frac } from '../lib/frac'
import { fTex, invLap } from '../lib/expr'
import {
  polyAdd,
  polyMul,
  polyMulAll,
  polyTex,
  polyTrim,
  type Poly,
} from '../lib/poly'
import type { Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import type { SlipId } from '../data/slips'
import type { Facet } from '../lib/facets'
import type { Choice, Step } from './types'

export type FractionKind = 'square' | 'form' | 'linear' | 'hard'

export const FRACTION_ITEMS: Record<FractionKind, string> = {
  square: 'frac:square',
  form: 'frac:form',
  linear: 'frac:linear',
  hard: 'frac:hard',
}

export const FRACTION_ITEM_IDS = Object.values(FRACTION_ITEMS)

// ---------------------------------------------------------------------------
// Denominators and their decompositions
// ---------------------------------------------------------------------------

/** `(s - root)^power`. */
export interface LinearFactor {
  kind: 'linear'
  root: number
  power: number
}

/** `(s - alpha)^2 + beta^2`, irreducible, shown multiplied out. */
export interface QuadFactor {
  kind: 'quad'
  alpha: number
  beta: number
}

export type Factor = LinearFactor | QuadFactor

/** `c / (s - root)^order`. */
interface LinearPiece {
  kind: 'linear'
  root: number
  order: number
  c: number
}

/** `(A(s - alpha) + B) / ((s - alpha)^2 + beta^2)`, written around the shift. */
interface QuadPiece {
  kind: 'quad'
  alpha: number
  beta: number
  A: number
  B: number
}

type Piece = LinearPiece | QuadPiece

const linearPoly = (root: number, power = 1): Poly =>
  polyMulAll(Array.from({ length: power }, () => [-root, 1]))

/** `(s - alpha)^2 + beta^2` multiplied out. */
const quadPoly = (alpha: number, beta: number): Poly => [alpha * alpha + beta * beta, -2 * alpha, 1]

const factorPoly = (f: Factor): Poly =>
  f.kind === 'linear' ? linearPoly(f.root, f.power) : quadPoly(f.alpha, f.beta)

export const denominatorPoly = (factors: Factor[]): Poly => polyMulAll(factors.map(factorPoly))

/** `(s-1)(s+2)^{2}(s^2+6s+13)` — factored, with the quadratic left expanded. */
export function factorsTex(factors: Factor[], alwaysBracket = false): string {
  const alone = factors.length === 1 && !alwaysBracket
  return factors
    .map((f) => {
      if (f.kind === 'linear') {
        const body = f.root < 0 ? `s + ${-f.root}` : f.root === 0 ? 's' : `s - ${f.root}`
        // Brackets earn their place around a power or beside another factor.
        if (f.power === 1) return alone || f.root === 0 ? body : `\\left(${body}\\right)`
        return `\\left(${body}\\right)^{${f.power}}`
      }
      const q = polyTex(quadPoly(f.alpha, f.beta))
      return alone ? q : `\\left(${q}\\right)`
    })
    .join('')
}

/**
 * The numerator the chosen pieces add up to. Each piece is multiplied by
 * everything in the denominator it does not already own, so the result is exact
 * integer arithmetic rather than a fit.
 */
export function numeratorPoly(factors: Factor[], pieces: Piece[]): Poly {
  const others = (skip: Factor, reduceTo?: number): Poly =>
    polyMulAll(
      factors.map((f) =>
        f === skip
          ? f.kind === 'linear'
            ? linearPoly(f.root, reduceTo ?? 0)
            : [1]
          : factorPoly(f),
      ),
    )

  let total: Poly = [0]
  for (const piece of pieces) {
    if (piece.kind === 'linear') {
      const owner = factors.find(
        (f): f is LinearFactor => f.kind === 'linear' && f.root === piece.root,
      )!
      total = polyAdd(total, polyMul([piece.c], others(owner, owner.power - piece.order)))
    } else {
      const owner = factors.find(
        (f): f is QuadFactor =>
          f.kind === 'quad' && f.alpha === piece.alpha && f.beta === piece.beta,
      )!
      // A(s - alpha) + B, multiplied out.
      total = polyAdd(total, polyMul([piece.B - piece.A * piece.alpha, piece.A], others(owner)))
    }
  }
  return polyTrim(total)
}

/** Each piece as the table row it inverts to, translations and all. */
export function pieceTerms(piece: Piece): Term[] {
  if (piece.kind === 'linear') {
    // c/(s-r) is row (c); c/(s-r)^j for j > 1 is row (b) translated by r.
    return piece.order === 1
      ? [{ form: 'exp', coef: frac(piece.c), a: piece.root }]
      : [
          {
            form: 'power',
            n: piece.order - 1,
            coef: frac(piece.c, factorial(piece.order - 1)),
            shift: piece.root || undefined,
          },
        ]
  }
  const shift = piece.alpha || undefined
  const out: Term[] = []
  if (piece.A !== 0) out.push({ form: 'cos', coef: frac(piece.A), k: piece.beta, shift })
  if (piece.B !== 0) out.push({ form: 'sin', coef: frac(piece.B, piece.beta), k: piece.beta, shift })
  return out
}

/**
 * The decomposition written out. `completed` chooses between the form the
 * decomposition lands in — a linear numerator over the quadratic as given — and
 * the form it takes once the square is completed, which is the one that inverts.
 */
function piecesTex(pieces: Piece[], completed = true): string {
  return pieces
    .map((p) => {
      if (p.kind === 'linear') {
        const body = p.root < 0 ? `s + ${-p.root}` : p.root === 0 ? 's' : `s - ${p.root}`
        const den = p.order > 1 ? `\\left(${body}\\right)^{${p.order}}` : body
        return { neg: p.c < 0, tex: `\\dfrac{${Math.abs(p.c)}}{${den}}` }
      }
      if (!completed) {
        // As it comes out of the decomposition: As + B over the quadratic given.
        return {
          neg: false,
          tex: `\\dfrac{${polyTex([p.B - p.A * p.alpha, p.A])}}{${polyTex(quadPoly(p.alpha, p.beta))}}`,
        }
      }
      const shifted = p.alpha < 0 ? `s + ${-p.alpha}` : p.alpha === 0 ? 's' : `s - ${p.alpha}`
      const den = p.alpha === 0 ? `s^2 + ${p.beta ** 2}` : `\\left(${shifted}\\right)^2 + ${p.beta ** 2}`
      const head =
        p.A === 0
          ? ''
          : p.A === 1
            ? p.alpha === 0
              ? 's'
              : `\\left(${shifted}\\right)`
            : `${p.A}\\left(${shifted}\\right)`
      const tail =
        p.B === 0 ? '' : head ? ` ${p.B < 0 ? '-' : '+'} ${Math.abs(p.B)}` : `${p.B}`
      return { neg: false, tex: `\\dfrac{${head}${tail}}{${den}}` }
    })
    .map((x, i) => (i === 0 ? (x.neg ? `-${x.tex}` : x.tex) : x.neg ? ` - ${x.tex}` : ` + ${x.tex}`))
    .join('')
}

/** The shape alone, with letters where the constants will go. */
export function shapeTex(factors: Factor[]): string {
  let letter = 0
  const next = () => String.fromCharCode(65 + letter++)
  const parts: string[] = []
  for (const f of factors) {
    if (f.kind === 'linear') {
      const body = f.root < 0 ? `s + ${-f.root}` : f.root === 0 ? 's' : `s - ${f.root}`
      for (let j = 1; j <= f.power; j++) {
        const den = j > 1 ? `\\left(${body}\\right)^{${j}}` : body
        parts.push(`\\dfrac{${next()}}{${den}}`)
      }
    } else {
      const a = next()
      const b = next()
      parts.push(`\\dfrac{${a}s + ${b}}{${polyTex(quadPoly(f.alpha, f.beta))}}`)
    }
  }
  return parts.join(' + ')
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

export interface FractionProblem {
  kind: FractionKind
  itemId: string
  question: string
  statementTex: string
  prefixTex: string
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  points: Record<string, number>[]
  answerTex: string
  choices: Choice[]
  correctIndex: number
  hint: string
  derivation: Step[]
  syntaxNote: string
  /** Answers that must be written in a particular shape, not merely be equal. */
  requiredForm?: { pattern: RegExp; message: string }
  /** Recognition tasks have no typed form. */
  chooseOnly: boolean
  facets: Facet[]
  terms: Term[]
}

/** Keep the correct answer, drop anything that prints the same as it or as a
 *  distractor already kept, then shuffle. */
function assembleChoices(
  answerTex: string,
  pool: Choice[],
  rng: RNG,
  optionCount: number,
): { choices: Choice[]; correctIndex: number } {
  const seen = new Set([answerTex])
  const kept: Choice[] = []
  for (const c of pool) {
    if (seen.has(c.tex)) continue
    seen.add(c.tex)
    kept.push(c)
  }
  const trimmed = rng.shuffle(kept).slice(0, Math.max(1, optionCount - 1))
  const choices = rng.shuffle([{ tex: answerTex, why: null }, ...trimmed])
  return { choices, correctIndex: choices.findIndex((c) => c.why === null) }
}

const T_POINTS = [0.09, 0.23, 0.41, 0.6, 0.82, 1.05, 1.3, 1.6, 1.95, 2.3].map((t) => ({ t }))
const S_POINTS = [0.9, 1.7, 2.6, 3.8, 5.1, 6.7, 8.4, 10.9, 13.6, 17.2].map((s) => ({ s }))

const ROOTS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
const BETAS = [1, 2, 2, 3, 3, 4]
const SMALL = [1, -1, 2, -2, 3, -3, 4, 5]

const distinctRoots = (rng: RNG, n: number): number[] => rng.sample(ROOTS, n)

// ---------------------------------------------------------------------------
// Completing the square, on its own
// ---------------------------------------------------------------------------

function squareProblem(rng: RNG, optionCount: number): FractionProblem {
  const p = rng.pick([1, -1, 2, -2, 3, -3, 4, -4, 5, -5])
  const beta = rng.pick(BETAS)
  const given = quadPoly(-p, beta) // (s + p)^2 + beta^2
  const shifted = p < 0 ? `s - ${-p}` : `s + ${p}`
  const answerTex = `\\left(${shifted}\\right)^2 + ${beta ** 2}`

  const wrong: Choice[] = [
    {
      tex: `\\left(${shifted}\\right)^2 + ${given[0]}`,
      why: `The constant that is left over is $c - p^2 = ${given[0]} - ${p ** 2} = ${beta ** 2}$; the whole of $c$ has already been used once.`,
      slip: 'square',
    },
    {
      tex: `\\left(${p < 0 ? `s - ${-2 * p}` : `s + ${2 * p}`}\\right)^2 + ${beta ** 2}`,
      why: `Inside the bracket goes *half* the middle coefficient: $${given[1]}/2 = ${p}$, not $${given[1]}$.`,
      slip: 'square',
    },
    {
      tex: `\\left(${shifted}\\right)^2 - ${beta ** 2}`,
      why: 'Subtracting here would make the quadratic factor over the reals — and this one does not, which is exactly why it has to be completed rather than factored.',
      slip: 'square',
    },
    {
      tex: `\\left(${p < 0 ? `s + ${-p}` : `s - ${p}`}\\right)^2 + ${beta ** 2}`,
      why: `The sign follows the middle term: $s^2 ${given[1] < 0 ? '-' : '+'} ${Math.abs(given[1])}s$ needs $\\left(${shifted}\\right)^2$.`,
      slip: 'square',
    },
  ]
  const { choices, correctIndex } = assembleChoices(answerTex, wrong, rng, optionCount)

  return {
    kind: 'square',
    itemId: FRACTION_ITEMS.square,
    question: 'Complete the square. Write it as a square plus a constant.',
    statementTex: `${polyTex(given)} \\;=\\; ?`,
    prefixTex: `${polyTex(given)} =`,
    symbols: { primary: 's', allowed: ['s'] },
    target: (o) => o.s * o.s + given[1] * o.s + given[0],
    points: S_POINTS,
    answerTex,
    choices,
    correctIndex,
    hint: `Halve the coefficient of $s$: $${given[1]}/2 = ${p}$. That goes inside the bracket, and $\\left(${p}\\right)^2 = ${p ** 2}$ has to come back off the constant.`,
    derivation: [
      {
        label: 'Halve and square',
        text: `Half of ${given[1]} is ${p}, and $\\left(${p}\\right)^2 = ${p ** 2}$. Add it and take it away again — the quadratic is unchanged.`,
        tex: `${polyTex(given)} = \\left(s^2 ${given[1] < 0 ? '-' : '+'} ${Math.abs(given[1])}s + ${p ** 2}\\right) + ${given[0]} - ${p ** 2}`,
      },
      {
        label: 'Read it off',
        text: `The bracket is a perfect square and ${given[0]} − ${p ** 2} = ${beta ** 2} is what is left. In Laplace terms this is now row (d) or (e) translated by $a = ${-p}$, with $k = ${beta}$.`,
        tex: `= ${answerTex}`,
      },
    ],
    syntaxNote: 'Write it as a square plus a constant, for example `(s+3)^2+4`.',
    requiredForm: {
      // Equality alone would accept the question copied back verbatim.
      pattern: /\(\s*s\s*[-+]\s*\d+\s*\)\s*(\^|\*\*)\s*2/,
      message:
        'That is equal to the quadratic, but not yet completed — write it as $(s \\pm p)^2$ plus a constant.',
    },
    chooseOnly: false,
    facets: ['square'],
    terms: [],
  }
}

// ---------------------------------------------------------------------------
// Choosing the shape
// ---------------------------------------------------------------------------

function formProblem(rng: RNG, optionCount: number): FractionProblem {
  const factors = rng.pick([
    () => {
      const [r1, r2] = distinctRoots(rng, 2)
      return [
        { kind: 'linear', root: r1, power: 1 },
        { kind: 'linear', root: r2, power: 2 },
      ] as Factor[]
    },
    () => {
      const [r1] = distinctRoots(rng, 1)
      return [
        { kind: 'linear', root: r1, power: 1 },
        { kind: 'quad', alpha: rng.pick([0, 1, -1, 2, -2]), beta: rng.pick(BETAS) },
      ] as Factor[]
    },
    () => {
      const [r1, r2, r3] = distinctRoots(rng, 3)
      return [
        { kind: 'linear', root: r1, power: 1 },
        { kind: 'linear', root: r2, power: 1 },
        { kind: 'linear', root: r3, power: 1 },
      ] as Factor[]
    },
  ])()

  const answerTex = shapeTex(factors)
  const wrong: Choice[] = []

  const repeated = factors.find((f): f is LinearFactor => f.kind === 'linear' && f.power > 1)
  if (repeated) {
    wrong.push({
      tex: shapeTex(factors.map((f) => (f === repeated ? { ...f, power: 1 } : f))),
      why: `A factor to the power ${repeated.power} needs a term for *every* power up to it — one over the factor, one over its square — not a single term over the highest.`,
      slip: 'decomposition-shape',
    })
  }
  const quad = factors.find((f): f is QuadFactor => f.kind === 'quad')
  if (quad) {
    wrong.push({
      tex: answerTex.replace(/\\dfrac\{[A-Z]s \+ ([A-Z])\}/, '\\dfrac{$1}'),
      why: 'An irreducible quadratic carries a *linear* numerator, $As + B$. A constant on top is not general enough to fit.',
      slip: 'decomposition-shape',
    })
    wrong.push({
      tex: shapeTex([
        ...factors.filter((f) => f !== quad),
        { kind: 'linear', root: quad.alpha, power: 2 },
      ]),
      why: 'That quadratic does not factor over the reals, so it cannot be split into linear pieces at all.',
      slip: 'decomposition-shape',
    })
  }
  if (factors.length >= 3) {
    wrong.push({
      tex: shapeTex(factors.slice(0, -1)),
      why: 'Every factor of the denominator gets a term. One of them has been left out.',
      slip: 'decomposition-shape',
    })
  }
  wrong.push({
    tex: `\\dfrac{A}{${factorsTex(factors)}}`,
    why: 'That is the fraction you started with, with the numerator renamed. Decomposing means one term per factor.',
    slip: 'decomposition-shape',
  })

  const { choices, correctIndex } = assembleChoices(answerTex, wrong, rng, optionCount)

  return {
    kind: 'form',
    itemId: FRACTION_ITEMS.form,
    question: 'Which decomposition should this be broken into? The constants are not wanted yet.',
    statementTex: `\\dfrac{N(s)}{${factorsTex(factors)}} \\;=\\; ?`,
    prefixTex: '',
    symbols: { primary: 's', allowed: ['s'] },
    target: () => 0,
    points: S_POINTS,
    answerTex,
    choices,
    correctIndex,
    hint: 'One term per factor — and a repeated factor gets one term for each power up to its multiplicity. An irreducible quadratic takes a linear numerator.',
    derivation: [
      {
        label: 'One per factor',
        text: 'A distinct linear factor takes a constant over it. A factor repeated $m$ times takes one term for each power from 1 to $m$. An irreducible quadratic takes $As + B$ over it.',
        tex: `\\dfrac{N(s)}{${factorsTex(factors)}} = ${answerTex}`,
      },
    ],
    syntaxNote: '',
    chooseOnly: true,
    facets: ['shape'],
    terms: [],
  }
}

// ---------------------------------------------------------------------------
// Decompose and invert
// ---------------------------------------------------------------------------

function buildInversion(
  rng: RNG,
  factors: Factor[],
  pieces: Piece[],
  optionCount: number,
  kind: FractionKind,
): FractionProblem {
  const num = numeratorPoly(factors, pieces)
  const terms = pieces.flatMap(pieceTerms)
  const givenTex = `\\dfrac{${polyTex(num)}}{${factorsTex(factors)}}`
  const answerTex = fTex(terms)

  const quad = factors.find((f): f is QuadFactor => f.kind === 'quad')
  const repeated = factors.find((f): f is LinearFactor => f.kind === 'linear' && f.power > 1)

  // Distractors are the decomposition gone wrong, rendered through the same
  // machinery as the answer so none of them can differ only in typography.
  const pool: Choice[] = []
  const push = (alt: Piece[], why: string, slip: SlipId) => {
    const terms = alt.flatMap(pieceTerms)
    const tex = fTex(terms)
    if (tex !== answerTex) pool.push({ tex, why, slip, value: (o) => evalF(terms, o.t) })
  }
  const flipped = pieces.map((p) =>
    p.kind === 'linear' ? { ...p, c: -p.c } : { ...p, A: -p.A, B: -p.B },
  )
  push(
    flipped,
    'Every constant has come out with the wrong sign — check the value substituted when covering up.',
    'decomposition-constants',
  )
  if (pieces.length > 1) {
    const swapped = [...pieces]
    if (swapped[0].kind === 'linear' && swapped[1].kind === 'linear') {
      const [a, b] = [swapped[0].c, swapped[1].c]
      push(
        [
          { ...swapped[0], c: b },
          { ...swapped[1], c: a },
          ...swapped.slice(2),
        ],
        'The two constants have been attached to the wrong factors.',
        'decomposition-constants',
      )
    }
    push(
      pieces.slice(0, -1),
      'One piece of the decomposition is missing from the answer.',
      'decomposition-constants',
    )
  }
  if (repeated) {
    const first = pieces.find(
      (p): p is LinearPiece => p.kind === 'linear' && p.root === repeated.root && p.order === 1,
    )
    const second = pieces.find(
      (p): p is LinearPiece => p.kind === 'linear' && p.root === repeated.root && p.order === 2,
    )
    if (first && second) {
      push(
        pieces.map((p) => (p === second ? { ...second, order: 1 } : p)),
        'The squared factor inverts through Theorem 7.3.1: $1/(s-a)^2$ is $te^{at}$, not another plain exponential.',
        'decomposition-shape',
      )
    }
  }
  if (quad && quad.alpha !== 0) {
    push(
      pieces.map((p) => (p.kind === 'quad' ? { ...p, alpha: 0 } : p)),
      'The quadratic was completed to $(s-a)^2 + k^2$, so the answer carries $e^{at}$. Dropping it inverts the untranslated row instead.',
      'translation-missing',
    )
  }
  if (quad) {
    push(
      pieces.map((p) => (p.kind === 'quad' ? { ...p, A: p.B, B: p.A } : p)),
      'The $s$ in the numerator goes with the cosine and the constant with the sine; these are the other way round.',
      'row-marker',
    )
  }

  const { choices, correctIndex } = assembleChoices(answerTex, pool, rng, optionCount)

  return {
    kind,
    itemId: FRACTION_ITEMS[kind],
    question: 'Find the inverse transform. Your answer is a function of $t$.',
    statementTex: `${invLap(givenTex)} \\;=\\; ?`,
    prefixTex: `${invLap(givenTex)} =`,
    symbols: { primary: 't', allowed: ['t'] },
    target: (o) => evalF(terms, o.t),
    points: T_POINTS,
    answerTex,
    choices,
    correctIndex,
    hint: quad
      ? 'Break it up first. The quadratic does not factor, so complete the square on it and read off a translated sine and cosine.'
      : repeated
        ? 'Break it up first, remembering a term for each power of the repeated factor.'
        : 'Break it up first: one constant over each factor, found by covering up.',
    derivation: inversionDerivation(factors, pieces, givenTex, num),
    syntaxNote: 'Give a function of `t`, for example `2e^(3t) - t*e^(-t)`.',
    chooseOnly: false,
    facets: [
      ...(repeated ? (['repeated'] as const) : []),
      ...(quad ? (['quadratic'] as const) : []),
      ...(quad && quad.alpha !== 0 ? (['square'] as const) : []),
    ],
    terms,
  }
}

function inversionDerivation(
  factors: Factor[],
  pieces: Piece[],
  givenTex: string,
  num: Poly,
): Step[] {
  const steps: Step[] = []
  const quad = factors.find((f): f is QuadFactor => f.kind === 'quad')
  const splits = pieces.length > 1

  if (splits) {
    steps.push({
      label: 'The form',
      text: 'One term per factor, with a term for every power of a repeated one, and a linear numerator over any irreducible quadratic.',
      tex: `${givenTex} = ${shapeTex(factors)}`,
    })

    const allDistinctLinear = factors.every((f) => f.kind === 'linear' && f.power === 1)
    if (allDistinctLinear) {
      const f0 = factors[0] as LinearFactor
      const rest = factors.filter((f) => f !== f0)
      const c0 = (pieces.find((p) => p.kind === 'linear' && p.root === f0.root) as LinearPiece).c
      steps.push({
        label: 'Cover up',
        text: `Cover the factor you want and put $s$ equal to its root. For $s = ${f0.root}$ that gives ${c0} straight away, and the others go the same way.`,
        tex: `\\left.\\dfrac{${polyTex(num)}}{${factorsTex(rest, true)}}\\right|_{s = ${f0.root}} = ${c0}`,
      })
    } else {
      steps.push({
        label: 'The constants',
        text: 'Multiply through by the whole denominator and match coefficients, or substitute values of $s$ that kill one term at a time.',
        tex: `${polyTex(num)} = ${matchingTex(factors)}`,
      })
    }

    steps.push({ label: 'Decomposed', tex: `${givenTex} = ${piecesTex(pieces, false)}` })
  }

  // Only now, with the pieces in hand, is there a quadratic to complete.
  if (quad && quad.alpha !== 0) {
    steps.push({
      label: 'Complete the square',
      text: `That quadratic has no real roots, so it will not factor. Completing it makes it a translated row: $a = ${quad.alpha}$ and $k = ${quad.beta}$.`,
      tex: `${polyTex(quadPoly(quad.alpha, quad.beta))} = \\left(s ${quad.alpha < 0 ? '+' : '-'} ${Math.abs(quad.alpha)}\\right)^2 + ${quad.beta ** 2}`,
    })
  }

  steps.push({
    label: 'Invert each piece',
    text: 'Every piece is now a row of the table, translated where the algebra translated it.',
    tex: `${invLap(piecesTex(pieces))} = ${fTex(pieces.flatMap(pieceTerms))}`,
  })
  return steps
}

/**
 * The identity you get by multiplying the shape up by the whole denominator —
 * the equation the constants are actually found from.
 */
function matchingTex(factors: Factor[]): string {
  let letter = 0
  const next = () => String.fromCharCode(65 + letter++)
  /** Everything in the denominator that this term does not already cancel. */
  const remaining = (owner: Factor, keep: number): string =>
    factorsTex(
      factors
        .map((g) =>
          g === owner && g.kind === 'linear' ? ({ ...g, power: keep } as Factor) : g,
        )
        .filter((g) => !(g.kind === 'linear' && g.power === 0))
        .filter((g) => g !== owner || g.kind === 'linear'),
      true,
    )

  const parts: string[] = []
  for (const f of factors) {
    if (f.kind === 'linear') {
      for (let j = 1; j <= f.power; j++) {
        parts.push(`${next()}${remaining(f, f.power - j)}`)
      }
    } else {
      const a = next()
      const b = next()
      const rest = factorsTex(
        factors.filter((g) => g !== f),
        true,
      )
      parts.push(`\\left(${a}s + ${b}\\right)${rest}`)
    }
  }
  return parts.join(' + ')
}

// ---------------------------------------------------------------------------
// The two inversion kinds
// ---------------------------------------------------------------------------

function linearProblem(rng: RNG, optionCount: number): FractionProblem {
  const n = rng.bool(0.65) ? 2 : 3
  const roots = distinctRoots(rng, n)
  const factors: Factor[] = roots.map((root) => ({ kind: 'linear', root, power: 1 }))
  const pieces: Piece[] = roots.map((root) => ({
    kind: 'linear',
    root,
    order: 1,
    c: rng.pick(SMALL),
  }))
  return buildInversion(rng, factors, pieces, optionCount, 'linear')
}

function hardProblem(rng: RNG, optionCount: number, forceHard = false): FractionProblem {
  // The repeated linear factor is the gentler half of this rung; when the
  // quadratic is owed, it is skipped.
  if (!forceHard && rng.bool(0.5)) {
    // A repeated linear factor, which inverts through the first translation.
    const [r1, r2] = distinctRoots(rng, 2)
    const withPartner = rng.bool(0.6)
    const factors: Factor[] = withPartner
      ? [
          { kind: 'linear', root: r1, power: 2 },
          { kind: 'linear', root: r2, power: 1 },
        ]
      : [{ kind: 'linear', root: r1, power: 2 }]
    const pieces: Piece[] = [
      { kind: 'linear', root: r1, order: 1, c: rng.pick(SMALL) },
      { kind: 'linear', root: r1, order: 2, c: rng.pick(SMALL) },
      ...(withPartner
        ? [{ kind: 'linear' as const, root: r2, order: 1, c: rng.pick(SMALL) }]
        : []),
    ]
    return buildInversion(rng, factors, pieces, optionCount, 'hard')
  }

  // An irreducible quadratic — mostly translated, so completing the square is
  // the way in, but sometimes centred, so noticing when it is not needed counts.
  const alpha = rng.pick([1, -1, 2, -2, 3, -3, 0])
  const beta = rng.pick(BETAS)
  const withPartner = rng.bool(0.45)
  const root = rng.pick(ROOTS)
  const factors: Factor[] = withPartner
    ? [
        { kind: 'linear', root, power: 1 },
        { kind: 'quad', alpha, beta },
      ]
    : [{ kind: 'quad', alpha, beta }]
  const pieces: Piece[] = [
    ...(withPartner
      ? [{ kind: 'linear' as const, root, order: 1, c: rng.pick(SMALL) }]
      : []),
    { kind: 'quad', alpha, beta, A: rng.pick([0, 1, 1, 2, -1, 3]), B: rng.pick(SMALL) },
  ]
  return buildInversion(rng, factors, pieces, optionCount, 'hard')
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface FractionOptions {
  kind: FractionKind | 'auto'
  /** 0..3; see `lib/ladder`. */
  rung?: number
  optionCount?: number
  /** Items whose harder variant is still under-tested, and should be forced. */
  uncovered?: Set<string>
  seed?: number
}

const RUNG_KIND: FractionKind[] = ['square', 'form', 'linear', 'hard']

export function nextFractionProblem(o: FractionOptions): FractionProblem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const count = o.optionCount ?? 4
  const rung = Math.max(0, Math.min(RUNG_KIND.length - 1, o.rung ?? RUNG_KIND.length - 1))

  let kind: FractionKind
  if (o.kind !== 'auto') {
    kind = o.kind
  } else if (rung >= RUNG_KIND.length - 1) {
    // At the top everything is in play, weighted towards the work that matters.
    kind = rng.pick(['linear', 'hard', 'hard', 'hard', 'square', 'form'])
  } else {
    kind = RUNG_KIND[rung]
  }

  switch (kind) {
    case 'square':
      return squareProblem(rng, count)
    case 'form':
      return formProblem(rng, count)
    case 'linear':
      return linearProblem(rng, count)
    case 'hard':
      return hardProblem(rng, count, o.uncovered?.has(FRACTION_ITEMS.hard) ?? false)
  }
}
