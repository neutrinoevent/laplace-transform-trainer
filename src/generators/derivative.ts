/**
 * Problems for the transform of a derivative.
 *
 * Two kinds, because the rule has two lives. `transform` asks for
 * `L{y^(n)}` on its own, which is where the pattern is learned — n subtracted
 * terms, all minus, power of s and order of derivative summing to n-1. `solve`
 * puts it to work on an initial-value problem, which is the only reason the
 * rule exists, and which pulls the seven basic rows back in through the forcing
 * function.
 */

import {
  evalTermS,
  termDenomTex,
  termNumer,
  termPoles,
  type FormId,
  type Term,
} from '../data/forms'
import { initialTex, primeTex } from '../data/derivatives'
import { frac, texCoef } from '../lib/frac'
import { lapTight } from '../lib/expr'
import { polyEval, polyRealRoots, polyTex, type Poly } from '../lib/poly'
import { scopePoints, type Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import { identify } from './derive'
import type { Choice, Step } from './types'

export type DerivMode = 'transform' | 'solve'

export const DERIV_ITEM: Record<DerivMode, string> = {
  transform: 'deriv:transform',
  solve: 'deriv:solve',
}

export interface DerivProblem {
  mode: DerivMode
  itemId: string
  order: number
  /** Transform problems with symbolic initial values drill the pattern itself. */
  symbolic: boolean
  question: string
  /** The problem, centred above the answer area. */
  statementTex: string
  /** The initial conditions, when they are numbers. */
  givenTex?: string
  /** Printed immediately before the input, e.g. `Y(s) =`. */
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
}

const DISPLAY: Record<string, string> = {
  y0: 'y(0)',
  y1: 'y^{\\prime}(0)',
  y2: 'y^{\\prime\\prime}(0)',
  y3: 'y^{(3)}(0)',
  Y: 'Y(s)',
}

const sPow = (p: number): string => (p === 0 ? '' : p === 1 ? 's' : `s^{${p}}`)

/** Brackets around a factor, but only when it is a sum that needs them. */
const group = (tex: string): string =>
  /[+-]/.test(tex.trim().replace(/^-/, '')) ? `\\left(${tex}\\right)` : tex

// ---------------------------------------------------------------------------
// Expansions of L{y^(n)}
// ---------------------------------------------------------------------------

/**
 * A candidate right-hand side for `L{y^(n)}`: a power of s on Y(s), then a list
 * of initial-value terms. Both the correct answer and every distractor are one
 * of these, so they render and evaluate through the same code and a distractor
 * can never silently coincide with the answer.
 */
interface Expansion {
  leadPower: number
  terms: { power: number; k: number; sign: 1 | -1 }[]
}

const correctExpansion = (n: number): Expansion => ({
  leadPower: n,
  terms: Array.from({ length: n }, (_, k) => ({ power: n - 1 - k, k, sign: -1 as const })),
})

function expansionTex(e: Expansion, values: number[] | null): string {
  let out = `${sPow(e.leadPower)}Y(s)`
  // Descending powers, the way anyone writes a polynomial — so a wrong pairing
  // has to be caught by reading it, not by noticing an odd running order.
  for (const term of [...e.terms].sort((a, b) => b.power - a.power)) {
    if (values) {
      const amount = term.sign * values[term.k]
      if (amount === 0) continue
      const mag = Math.abs(amount)
      const body =
        term.power === 0
          ? String(mag)
          : `${mag === 1 ? '' : mag}${sPow(term.power)}`
      out += amount < 0 ? ` - ${body}` : ` + ${body}`
    } else {
      const p = sPow(term.power)
      const body = `${p}${p ? '\\,' : ''}${initialTex(term.k)}`
      out += term.sign < 0 ? ` - ${body}` : ` + ${body}`
    }
  }
  return out
}

function expansionTarget(
  e: Expansion,
  values: number[] | null,
): (scope: Record<string, number>) => number {
  return (scope) => {
    let out = scope.Y * scope.s ** e.leadPower
    for (const term of e.terms) {
      const value = values ? values[term.k] : scope[`y${term.k}`]
      out += term.sign * value * scope.s ** term.power
    }
    return out
  }
}

/** Named ways of getting the expansion wrong, each one a real mistake. */
function expansionMutations(n: number): { e: Expansion; why: string }[] {
  const correct = correctExpansion(n)
  const out: { e: Expansion; why: string }[] = []

  out.push({
    e: { leadPower: n, terms: correct.terms.map((t) => ({ ...t, power: t.k })) },
    why: `The pairing is inverted. The highest power of $s$ goes with $y(0)$ and the bare term is $${initialTex(n - 1)}$ — the power of $s$ and the order of the derivative always sum to $n-1 = ${n - 1}$.`,
  })
  out.push({
    e: { leadPower: n, terms: correct.terms.map((t) => ({ ...t, sign: 1 as const })) },
    why: 'Every initial-value term is subtracted. They come from a boundary term that arrives with a minus sign.',
  })
  out.push({
    e: { leadPower: n, terms: correct.terms.map((t) => ({ ...t, power: t.power + 1 })) },
    why: `The subtracted terms start one power below the $s^{${n}}$ on $Y(s)$, so the first is $s^{${n - 1}}y(0)$.`,
  })
  out.push({
    e: { leadPower: n - 1, terms: correct.terms },
    why: `$Y(s)$ carries $s^{n} = s^{${n}}$, one power of $s$ for each derivative taken.`,
  })
  if (n >= 2) {
    out.push({
      e: { leadPower: n, terms: correct.terms.slice(0, -1) },
      why: `There is one subtracted term for each of $y(0)$ through $${initialTex(n - 1)}$ — that is $n = ${n}$ of them, and one is missing.`,
    })
    out.push({
      e: { leadPower: n, terms: [{ power: n - 1, k: 0, sign: -1 }] },
      why: `Each derivative gives up an initial value, not just the first: $n = ${n}$ terms, not one.`,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Transform problems
// ---------------------------------------------------------------------------

const ORDERS = [1, 2, 2, 2, 3, 3, 4]
const IC_VALUES = [0, 1, 1, 2, 2, 3, 4, 5, -1, -2, -3, -4]

function transformProblem(rng: RNG, symbolic: boolean, optionCount: number): DerivProblem {
  const n = rng.pick(ORDERS)
  const correct = correctExpansion(n)

  // A numeric problem where every initial value is zero has nothing to teach.
  let values: number[] | null = null
  if (!symbolic) {
    do {
      values = Array.from({ length: n }, () => rng.pick(IC_VALUES))
    } while (values.every((v) => v === 0))
  }

  const allowed = symbolic
    ? ['s', 'Y', ...Array.from({ length: n }, (_, k) => `y${k}`)]
    : ['s', 'Y']
  const symbols: Symbols = { primary: 's', allowed, display: DISPLAY }
  const points = scopePoints(symbols)
  const target = expansionTarget(correct, values)
  const answerTex = expansionTex(correct, values)

  const correctValues = points.map(target)
  const pool: Choice[] = []
  const seen = new Set([answerTex])
  for (const m of expansionMutations(n)) {
    const tex = expansionTex(m.e, values)
    if (seen.has(tex)) continue
    const f = expansionTarget(m.e, values)
    const same = points.every((p, i) => Math.abs(f(p) - correctValues[i]) < 1e-9)
    if (same) continue
    seen.add(tex)
    pool.push({ tex, why: m.why })
  }
  const kept = rng.shuffle(pool).slice(0, Math.max(1, optionCount - 1))
  const choices = rng.shuffle([{ tex: answerTex, why: null }, ...kept])

  const given = symbolic
    ? undefined
    : values!.map((v, k) => `${initialTex(k)} = ${v}`).join(',\\; ')

  return {
    mode: 'transform',
    itemId: DERIV_ITEM.transform,
    order: n,
    symbolic,
    question: symbolic
      ? 'Write the transform in terms of $Y(s)$ and the initial values.'
      : 'Write the transform in terms of $Y(s)$, using the initial conditions.',
    statementTex: `${lapTight(primeTex(n))} \\;=\\; ?`,
    givenTex: given,
    prefixTex: `${lapTight(primeTex(n))} =`,
    symbols,
    target,
    points,
    answerTex,
    choices,
    correctIndex: choices.findIndex((c) => c.why === null),
    hint: `Theorem 7.2.2 with $n = ${n}$: $s^{${n}}Y(s)$, then ${n} subtracted term${n === 1 ? '' : 's'}, one for each of $y(0)$ through $${initialTex(n - 1)}$.`,
    derivation: transformDerivation(n, values),
    syntaxNote: symbolic
      ? 'Write the transform as `Y` or `Y(s)`, and the initial values as `y(0)`, `y\'(0)`, … (or `y0`, `y1`, …).'
      : 'Write the transform as `Y` or `Y(s)`.',
  }
}

function transformDerivation(n: number, values: number[] | null): Step[] {
  const correct = correctExpansion(n)
  const steps: Step[] = [
    {
      label: 'Theorem 7.2.2',
      text: `Each of the ${n} derivative${n === 1 ? '' : 's'} costs one power of $s$ on $Y(s)$ and pays out one initial value, from $y(0)$ up to $${initialTex(n - 1)}$.`,
      tex: `${lapTight(primeTex(n))} = ${expansionTex(correct, null)}`,
    },
  ]
  if (values) {
    steps.push({
      label: 'Substitute',
      text: `Put the given initial values in. ${
        values.some((v) => v === 0)
          ? 'A zero initial value removes its term entirely — that is why the count of visible terms can be smaller than $n$.'
          : 'Watch the signs: a negative initial value turns its subtraction into an addition.'
      }`,
      tex: `= ${expansionTex(correct, values)}`,
    })
  }
  return steps
}

// ---------------------------------------------------------------------------
// Solve problems: an initial-value problem to an expression for Y(s)
// ---------------------------------------------------------------------------

const FORCINGS: { form: FormId; make: (rng: RNG) => Term }[] = [
  { form: 'one', make: (r) => ({ form: 'one', coef: frac(r.pick([1, 2, 3, 4, 5, 6])) }) },
  { form: 'power', make: (r) => ({ form: 'power', coef: frac(r.pick([1, 1, 2, 3])), n: r.pick([1, 2, 3]) }) },
  { form: 'exp', make: (r) => ({ form: 'exp', coef: frac(r.pick([1, 1, 2, 3])), a: r.sign() * r.pick([1, 2, 3, 4]) }) },
  { form: 'sin', make: (r) => ({ form: 'sin', coef: frac(r.pick([1, 1, 2, 3])), k: r.pick([1, 2, 3, 4]) }) },
  { form: 'cos', make: (r) => ({ form: 'cos', coef: frac(r.pick([1, 1, 2, 3])), k: r.pick([1, 2, 3, 4]) }) },
]

/** `\dfrac{3}{(s^2+9)(s^2+3s+2)}` — the forcing term's transform over the operator. */
function forcingOverTex(term: Term, den: Poly): string {
  const { coef, hasS } = termNumer(term)
  const numer = hasS ? texCoef(coef, 's') : String(coef.n)
  return `\\dfrac{${numer}}{${group(termDenomTex(term))}${group(polyTex(den))}}`
}

function solveProblem(rng: RNG, optionCount: number): DerivProblem {
  const order = rng.bool(0.72) ? 2 : 1
  const b = order === 2 ? rng.pick([-5, -4, -3, -3, -2, -2, -1, 0, 1, 2, 3, 4, 5]) : 0
  const c =
    order === 2
      ? rng.pick([-6, -4, -3, -2, -2, -1, 1, 2, 2, 3, 4, 5, 6])
      : rng.sign() * rng.pick([1, 2, 2, 3, 4, 5])

  const y0 = rng.pick([0, 1, 1, 2, 2, 3, 4, -1, -2, -3])
  const y1 = order === 2 ? rng.pick([0, 1, 1, 2, 3, 4, -1, -2, -3, -5]) : 0
  const forced = rng.bool(0.55)
  const g = forced ? rng.pick(FORCINGS).make(rng) : null
  // Zero initial data with no forcing gives Y(s) = 0, which teaches nothing.
  if (!forced && y0 === 0 && y1 === 0) return solveProblem(rng, optionCount)

  const den: Poly = order === 2 ? [c, b, 1] : [c, 1]
  const num: Poly = order === 2 ? [y1 + b * y0, y0] : [y0]

  const equationTex =
    order === 2
      ? `${primeTex(2)} ${b === 0 ? '' : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${primeTex(1)} `}${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}y = ${g ? forcingFTex(g) : '0'}`
      : `${primeTex(1)} ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}y = ${g ? forcingFTex(g) : '0'}`

  const icTex =
    order === 2 ? `y(0) = ${y0},\\; y^{\\prime}(0) = ${y1}` : `y(0) = ${y0}`

  const symbols: Symbols = { primary: 's', allowed: ['s'], display: DISPLAY }
  const poles = [...polyRealRoots(den), ...(g ? termPoles(g) : [])]
  const target = (scope: Record<string, number>) => {
    const s = scope.s
    return (polyEval(num, s) + (g ? evalTermS(g, s) : 0)) / polyEval(den, s)
  }

  const polyPart = polyTex(num) === '0' ? null : `\\dfrac{${polyTex(num)}}{${polyTex(den)}}`
  const forcePart = g ? forcingOverTex(g, den) : null
  const answerTex = [polyPart, forcePart].filter(Boolean).join(' + ')

  const { choices, correctIndex } = solveChoices(
    { num, den, g, order, b, y0, y1 },
    answerTex,
    rng,
    optionCount,
  )

  return {
    mode: 'solve',
    itemId: DERIV_ITEM.solve,
    order,
    symbolic: false,
    question: 'Transform the equation and solve for $Y(s)$. Do not invert it.',
    statementTex: equationTex,
    givenTex: icTex,
    prefixTex: 'Y(s) =',
    symbols,
    target,
    points: scopePoints(symbols, poles),
    answerTex,
    choices,
    correctIndex,
    hint:
      order === 2
        ? 'Transform each term. $\\mathcal{L}\\{y^{\\prime\\prime}\\}$ and $\\mathcal{L}\\{y^{\\prime}\\}$ each bring initial values; collect every $Y(s)$ on one side and divide.'
        : 'Transform each term. $\\mathcal{L}\\{y^{\\prime}\\} = sY(s) - y(0)$; collect $Y(s)$ and divide.',
    derivation: solveDerivation({ num, den, g, order, b, c, y0, y1, equationTex, answerTex }),
    syntaxNote: 'Give the right-hand side only, as a function of `s`.',
  }
}

/** The forcing function in the t-domain, for printing the equation. */
function forcingFTex(term: Term): string {
  const body =
    term.form === 'one'
      ? ''
      : term.form === 'power'
        ? term.n === 1
          ? 't'
          : `t^{${term.n}}`
        : term.form === 'exp'
          ? `e^{${term.a === 1 ? 't' : term.a === -1 ? '-t' : `${term.a}t`}}`
          : `\\${term.form} ${term.k === 1 ? 't' : `${term.k}t`}`
  return texCoef(term.coef, body)
}

interface SolveShape {
  num: Poly
  den: Poly
  g: Term | null
  order: number
  b: number
  y0: number
  y1: number
}

function solveChoices(
  shape: SolveShape,
  answerTex: string,
  rng: RNG,
  optionCount: number,
): { choices: Choice[]; correctIndex: number } {
  const { num, den, g, order, b, y0, y1 } = shape
  const over = (n: Poly, d: Poly) => (polyTex(n) === '0' ? null : `\\dfrac{${polyTex(n)}}{${polyTex(d)}}`)
  const build = (n: Poly, d: Poly, sign: 1 | -1 = 1) => {
    const poly = over(n, d)
    const force = g ? forcingOverTex(g, d) : null
    if (poly && force) return sign < 0 ? `${poly} - ${force}` : `${poly} + ${force}`
    if (poly) return poly
    if (force) return sign < 0 ? `-${force}` : force
    return '0'
  }

  const candidates: { tex: string; why: string }[] = []

  if (order === 2 && b !== 0) {
    candidates.push({
      tex: build([y1, y0], den),
      why: `$\\mathcal{L}\\{y^{\\prime}\\} = sY(s) - y(0)$ carries an initial value too, so the $${b}\\,y(0)$ from that term belongs in the numerator.`,
    })
  }
  if (order === 2 && y0 !== y1) {
    candidates.push({
      tex: build([y0 + b * y1, y1], den),
      why: '$y(0)$ is the one that multiplies $s$; $y^{\\prime}(0)$ stands alone. These are the other way round.',
    })
  }
  candidates.push({
    tex: build(num.map((x) => -x), den),
    why: 'The initial-value terms are subtracted on the left of the transformed equation, so they arrive on the right as additions.',
  })
  if (g) {
    candidates.push({
      tex: build(num, den, -1),
      why: '$G(s)$ is already on the right-hand side of the equation. It adds to the initial-value terms, it does not subtract from them.',
    })
  }
  if (order === 2 && b !== 0) {
    candidates.push({
      tex: build(num, [den[0], -den[1], 1]),
      why: 'The denominator is the characteristic polynomial of the equation, carrying the equation’s own signs.',
    })
  }
  if (order === 1) {
    candidates.push({
      tex: build([y0], [den[0], 1].map((x, i) => (i === 0 ? -x : x))),
      why: 'The denominator takes the sign the equation gives it: $y^{\\prime} + cy$ transforms to $(s + c)Y(s)$.',
    })
  }

  const seen = new Set([answerTex])
  const pool: Choice[] = []
  for (const cand of candidates) {
    if (seen.has(cand.tex)) continue
    seen.add(cand.tex)
    pool.push(cand)
  }
  const kept = rng.shuffle(pool).slice(0, Math.max(1, optionCount - 1))
  const choices = rng.shuffle([{ tex: answerTex, why: null }, ...kept])
  return { choices, correctIndex: choices.findIndex((c) => c.why === null) }
}

function solveDerivation(o: {
  num: Poly
  den: Poly
  g: Term | null
  order: number
  b: number
  c: number
  y0: number
  y1: number
  equationTex: string
  answerTex: string
}): Step[] {
  const { num, den, g, order, b, c, y0, y1 } = o
  const steps: Step[] = []

  const lhsPieces =
    order === 2
      ? [
          lapTight(primeTex(2)),
          b === 0 ? null : `${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${lapTight(primeTex(1))}`,
          `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}${lapTight('y')}`,
        ]
      : [lapTight(primeTex(1)), `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}${lapTight('y')}`]
  steps.push({
    label: 'Transform',
    text: 'Linearity first: transform every term of the equation on its own, constants and all.',
    tex: `${lhsPieces.filter(Boolean).join(' ')} = ${g ? lapTight(forcingFTex(g)) : '0'}`,
  })

  const expanded =
    order === 2
      ? `${group(expansionTex(correctExpansion(2), [y0, y1]))}${
          b === 0
            ? ''
            : ` ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}${group(expansionTex(correctExpansion(1), [y0]))}`
        } ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}Y(s)`
      : `${group(expansionTex(correctExpansion(1), [y0]))} ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}Y(s)`
  steps.push({
    label: 'Theorem 7.2.2',
    text: `Each derivative brings its own initial values: ${
      order === 2
        ? '$s^2Y(s) - sy(0) - y^{\\prime}(0)$ for the second, $sY(s) - y(0)$ for the first.'
        : '$sY(s) - y(0)$.'
    }`,
    tex: `${expanded} = ${g ? 'G(s)' : '0'}`,
  })

  if (g) {
    steps.push({
      label: 'Right side',
      text: identify(g, 'forward'),
      tex: `G(s) = \\dfrac{${termNumer(g).hasS ? texCoef(termNumer(g).coef, 's') : termNumer(g).coef.n}}{${termDenomTex(g)}}`,
    })
  }

  steps.push({
    label: 'Collect',
    text: 'Every term carrying $Y(s)$ to one side, every number to the other. The bracket that multiplies $Y(s)$ is the characteristic polynomial of the equation.',
    tex: `${group(polyTex(den))}Y(s) = ${polyTex(num) === '0' ? '' : polyTex(num)}${
      g ? `${polyTex(num) === '0' ? '' : ' + '}G(s)` : ''
    }`,
  })

  steps.push({
    label: 'Solve',
    text: 'Divide. The result is an algebraic formula for $Y(s)$ — no differential equation left in it.',
    tex: `Y(s) = ${o.answerTex}`,
  })
  return steps
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface DerivOptions {
  mode: DerivMode
  /** Transform problems: symbolic initial values, or numbers. */
  symbolic?: boolean
  optionCount?: number
  seed?: number
}

export function nextDerivProblem(o: DerivOptions): DerivProblem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const count = o.optionCount ?? 4
  return o.mode === 'solve'
    ? solveProblem(rng, count)
    : transformProblem(rng, o.symbolic ?? false, count)
}
