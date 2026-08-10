/**
 * Problems for the two translation theorems.
 *
 * Both are operations on a row of the basic table rather than new rows, so a
 * translated problem is just a `Term` carrying a `shift` or a `delay`, and the
 * rendering, evaluation and pole-tracking it needs already exist. What is new
 * here is the framing: which theorem is in play, what the given side looks like
 * before you have spotted the translation, and the specific ways of getting it
 * wrong.
 *
 * The sharpest of those is answering with the other theorem — `e^{-as}F(s)`
 * when the exponential was in `t`, or `F(s-a)` when the function was delayed —
 * so that distractor is offered on every problem where it makes sense.
 */

import {
  FORM_BY_ID,
  evalF,
  evalS,
  polesOf,
  stepTex,
  termDenomTex,
  termNumer,
  type FormId,
  type Term,
} from '../data/forms'
import { frac, isOne } from '../lib/frac'
import { fTex, invLap, lapTight, sTex } from '../lib/expr'
import { polyTex, type Poly } from '../lib/poly'
import { type Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import type { Choice, Step } from './types'

export type Theorem = 'first' | 'second'
export type ShiftDirection = 'forward' | 'inverse'

export const shiftItemId = (theorem: Theorem, direction: ShiftDirection): string =>
  `shift:${theorem}:${direction}`

export const SHIFT_ITEMS = [
  shiftItemId('first', 'forward'),
  shiftItemId('first', 'inverse'),
  shiftItemId('second', 'forward'),
  shiftItemId('second', 'inverse'),
]

/** The unit step, for grading an answer that contains one. */
export const STEP_FN = { U: (x: number) => (x >= 0 ? 1 : 0) }

export interface ShiftProblem {
  theorem: Theorem
  direction: ShiftDirection
  itemId: string
  form: FormId
  /** True when the given side hides the translation inside a quadratic. */
  completeSquare: boolean
  question: string
  statementTex: string
  prefixTex: string
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  points: Record<string, number>[]
  poles: number[]
  answerTex: string
  choices: Choice[]
  correctIndex: number
  hint: string
  derivation: Step[]
  syntaxNote: string
  terms: Term[]
}

// Rows (a) and (c) absorb an exponential multiple, so they never carry a shift.
const SHIFTABLE: FormId[] = ['power', 'sin', 'cos', 'sinh', 'cosh']
const DELAYABLE: FormId[] = ['one', 'power', 'exp', 'sin', 'cos', 'sinh', 'cosh']

const SHIFTS = [1, 2, 2, 3, 3, 4, 5, -1, -2, -2, -3, -3, -4]
const DELAYS = [1, 1, 2, 2, 3, 4]
const SMALL = [1, 1, 1, 2, 3, 4, 5]

function baseTerm(rng: RNG, form: FormId, coef = frac(1)): Term {
  switch (form) {
    case 'one':
      return { form, coef }
    case 'power':
      return { form, coef, n: rng.pick([1, 2, 2, 3, 3, 4]) }
    case 'exp':
      return { form, coef, a: rng.sign() * rng.pick([1, 2, 3, 4]) }
    default:
      return { form, coef, k: rng.pick([1, 2, 2, 3, 3, 4, 5]) }
  }
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

const S_LADDER = [0.9, 1.7, 2.6, 3.8, 5.1, 6.7, 8.4, 10.9, 13.6, 17.2, 21.5, 27.3]

const sPoints = (poles: number[]): Record<string, number>[] =>
  S_LADDER.filter((s) => poles.every((p) => Math.abs(s - p) > 0.8)).map((s) => ({ s }))

/**
 * Points in t for a delayed answer. A switch that is off before `d` and on
 * after it can only be told from an undelayed one by sampling on both sides,
 * so the ladder is built around the delay rather than fixed.
 */
function tPoints(delay?: number): Record<string, number>[] {
  if (!delay) return [0.11, 0.29, 0.47, 0.68, 0.93, 1.17, 1.44, 1.73, 2.05, 2.38].map((t) => ({ t }))
  const before = [0.17, 0.41, 0.63, 0.85].map((f) => ({ t: f * delay }))
  const after = [0.21, 0.55, 0.9, 1.4, 1.9, 2.5].map((f) => ({ t: delay + f }))
  return [...before, ...after]
}

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------

interface Candidate {
  tex: string
  why: string
}

function assembleChoices(
  correctTex: string,
  pool: Candidate[],
  rng: RNG,
  optionCount: number,
): { choices: Choice[]; correctIndex: number } {
  const seen = new Set([correctTex])
  const kept: Choice[] = []
  for (const c of pool) {
    if (seen.has(c.tex)) continue
    seen.add(c.tex)
    kept.push(c)
  }
  const trimmed = rng.shuffle(kept).slice(0, Math.max(1, optionCount - 1))
  const choices = rng.shuffle([{ tex: correctTex, why: null }, ...trimmed])
  return { choices, correctIndex: choices.findIndex((c) => c.why === null) }
}

/** Wrong answers for a translated row, in whichever domain the answer lives. */
function translationCandidates(term: Term, direction: ShiftDirection): Candidate[] {
  const render = direction === 'forward' ? (t: Term) => sTex([t]) : (t: Term) => fTex([t])
  const out: Candidate[] = []
  const plain: Term = { ...term, shift: undefined, delay: undefined }

  if (term.shift) {
    const a = term.shift
    out.push({
      tex: render({ ...plain, shift: -a }),
      why: `The theorem reads $F(s-a)$, and here $a = ${a}$, so every $s$ becomes $${a > 0 ? `s - ${a}` : `s + ${-a}`}$.`,
    })
    out.push({
      tex: render(plain),
      why: 'The exponential factor has been dropped. It is what translates the transform; without it this is the untranslated row.',
    })
    out.push({
      tex: render({ ...plain, delay: Math.abs(a) }),
      why: 'That is the *other* translation theorem. An exponential in $t$ moves the transform along the $s$-axis; only an exponential in $s$ delays the function.',
    })
    // The s upstairs is translated too, and forgetting it is the classic slip.
    if (term.form === 'cos' || term.form === 'cosh') {
      const { coef } = termNumer(term)
      const mag = coef.n < 0 ? { ...coef, n: -coef.n } : coef
      out.push({
        tex: `\\dfrac{${isOne(mag) ? 's' : `${mag.n}s`}}{${termDenomTex(term)}}`,
        why: 'The numerator was an $s$, so it becomes $s-a$ as well. Every $s$ in the transform moves, not only the ones downstairs.',
      })
    }
  }

  if (term.delay) {
    const d = term.delay
    out.push({
      tex: render({ ...plain, delay: undefined }),
      why:
        direction === 'forward'
          ? 'The delay has been ignored. Switching a function on at $t = a$ costs a factor of $e^{-as}$.'
          : 'The $e^{-as}$ has been dropped. It says the answer is delayed and off before $t = a$.',
    })
    out.push({
      tex: render({ ...plain, shift: -d }),
      why: 'That is the *other* translation theorem. A delay in $t$ multiplies the transform by $e^{-as}$; it does not translate it along the $s$-axis.',
    })
    if (direction === 'inverse') {
      // The step without the shifted argument: on at the right time, wrong shape.
      out.push({
        tex: `${fTex([plain])}\\,${stepTex(d)}`,
        why: `The row has to be delayed as well as switched on: the answer is $f(t-${d})\\,\\mathcal{U}(t-${d})$, not $f(t)\\,\\mathcal{U}(t-${d})$.`,
      })
    } else {
      out.push({
        tex: sTex([{ ...plain, delay: -d }]),
        why: `The sign in the exponent follows the delay: switching on at $t = ${d}$ gives $e^{-${d}s}$.`,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// First translation theorem
// ---------------------------------------------------------------------------

/** `s^2 + 6s + 13` — the translated denominator with the square multiplied out. */
function expandedDenominator(term: Term): Poly {
  const c = term.shift!
  const k2 = term.k! ** 2
  const sign = term.form === 'sin' || term.form === 'cos' ? 1 : -1
  return [c * c + sign * k2, -2 * c, 1]
}

/** The matching numerator, multiplied out: a constant, or `coef·s - coef·c`. */
function expandedNumerator(term: Term): Poly {
  const { coef, hasS } = termNumer(term)
  return hasS ? [-coef.n * term.shift!, coef.n] : [coef.n]
}

function firstProblem(rng: RNG, direction: ShiftDirection, optionCount: number): ShiftProblem {
  const form = rng.pick(SHIFTABLE)
  const shift = rng.pick(SHIFTS)
  const coef = frac(direction === 'forward' ? rng.pick(SMALL) : 1)
  const term: Term = { ...baseTerm(rng, form, coef), shift }
  const plain: Term = { ...term, shift: undefined }
  const poles = polesOf([term])

  // Half the inverse problems hide the translation inside a quadratic, which is
  // the case that needs completing the square before the row is even visible.
  const completeSquare =
    direction === 'inverse' && (form === 'sin' || form === 'cos') && rng.bool(0.5)

  const givenTex = completeSquare
    ? `\\dfrac{${polyTex(expandedNumerator(term))}}{${polyTex(expandedDenominator(term))}}`
    : sTex([term])

  const forward = direction === 'forward'
  const inner = forward ? fTex([term]) : givenTex
  const statementTex = `${forward ? lapTight(inner) : invLap(inner)} \\;=\\; ?`
  const answerTex = forward ? sTex([term]) : fTex([term])

  const pool = translationCandidates(term, direction)
  if (completeSquare) {
    pool.push({
      tex: fTex([{ ...plain, coef: term.coef }]),
      why: 'Completing the square is what reveals the translation; stopping before it loses the $e^{at}$ entirely.',
    })
  }

  return {
    theorem: 'first',
    direction,
    itemId: shiftItemId('first', direction),
    form,
    completeSquare,
    question: forward
      ? 'Find the transform. Your answer is a function of $s$.'
      : 'Find the inverse transform. Your answer is a function of $t$.',
    statementTex,
    prefixTex: forward ? lapTight(inner) + ' =' : invLap(inner) + ' =',
    symbols: { primary: forward ? 's' : 't', allowed: [forward ? 's' : 't'] },
    target: forward ? (o) => evalS([term], o.s) : (o) => evalF([term], o.t),
    points: forward ? sPoints(poles) : tPoints(),
    poles: forward ? poles : [],
    answerTex,
    ...assembleChoices(answerTex, pool, rng, optionCount),
    hint: forward
      ? `Transform the row on its own first, then translate: Theorem 7.3.1 replaces every $s$ by $s${shift > 0 ? ` - ${shift}` : ` + ${-shift}`}$.`
      : completeSquare
        ? 'That quadratic does not factor. Complete the square and the translated row appears.'
        : `The denominator is written in $${shiftedLabel(shift)}$ rather than $s$ — that is Theorem 7.3.1 with $a = ${shift}$.`,
    derivation: firstDerivation(term, direction, completeSquare, givenTex),
    syntaxNote: forward
      ? 'Give a function of `s`. Any equivalent form is accepted.'
      : 'Give a function of `t`, for example `e^(-2t)cos 4t`.',
    terms: [term],
  }
}

const shiftedLabel = (a: number): string => (a > 0 ? `s - ${a}` : `s + ${-a}`)

function firstDerivation(
  term: Term,
  direction: ShiftDirection,
  completeSquare: boolean,
  givenTex: string,
): Step[] {
  const form = FORM_BY_ID.get(term.form)!
  const plain: Term = { ...term, shift: undefined }
  const unit: Term = { ...plain, coef: frac(1) }
  const a = term.shift!
  const steps: Step[] = []

  if (direction === 'forward') {
    steps.push({
      label: `Row (${form.letter})`,
      text: `Transform the row on its own, before the exponential is considered at all.`,
      tex: `${lapTight(fTex([unit]))} = ${sTex([unit])}`,
    })
    steps.push({
      label: 'Theorem 7.3.1',
      text: `Multiplying by $e^{${a === 1 ? '' : a === -1 ? '-' : a}t}$ translates the transform: replace every $s$ by $${shiftedLabel(a)}$.`,
      tex: `${lapTight(fTex([term]))} = ${sTex([unit])}\\bigg|_{s \\to ${shiftedLabel(a)}} = ${sTex([term])}`,
    })
    return steps
  }

  if (completeSquare) {
    const den = expandedDenominator(term)
    steps.push({
      label: 'Complete the square',
      text: `Half of ${-den[1]} is ${-den[1] / 2}, and its square is ${(den[1] / 2) ** 2}. The quadratic is irreducible, so this is the only way in.`,
      tex: `${polyTex(den)} = ${termDenomTex(term)}`,
    })
  }
  steps.push({
    label: 'Spot the translation',
    text: `The denominator is row (${form.letter}) written in $${shiftedLabel(a)}$ instead of $s$, so Theorem 7.3.1 applies with $a = ${a}$.`,
    tex: completeSquare ? `${givenTex} = ${sTex([term])}` : undefined,
  })
  steps.push({
    label: 'Undo it',
    text: 'Invert the untranslated row, then attach the exponential the translation stands for.',
    tex: `${invLap(sTex([unit]))} = ${fTex([unit])} \\;\\longrightarrow\\; ${invLap(sTex([term]))} = ${fTex([term])}`,
  })
  return steps
}

// ---------------------------------------------------------------------------
// Second translation theorem
// ---------------------------------------------------------------------------

function secondProblem(rng: RNG, direction: ShiftDirection, optionCount: number): ShiftProblem {
  const form = rng.pick(DELAYABLE)
  const delay = rng.pick(DELAYS)
  const skeleton = baseTerm(rng, form)
  const own = termNumer(skeleton).coef.n

  // Forward problems fix an integer coefficient in t; inverse problems fix an
  // integer numerator in s and let the fix-up fall out, as everywhere else.
  const coef =
    direction === 'forward'
      ? frac(rng.pick(SMALL))
      : frac(rng.bool(0.45) ? own : rng.pick(SMALL), own)
  const term: Term = { ...skeleton, coef, delay }
  const poles = polesOf([term])

  const forward = direction === 'forward'
  const inner = forward ? fTex([term]) : sTex([term])
  const answerTex = forward ? sTex([term]) : fTex([term])

  return {
    theorem: 'second',
    direction,
    itemId: shiftItemId('second', direction),
    form,
    completeSquare: false,
    question: forward
      ? 'Find the transform. Your answer is a function of $s$.'
      : 'Find the inverse transform. Your answer is a function of $t$.',
    statementTex: `${forward ? lapTight(inner) : invLap(inner)} \\;=\\; ?`,
    prefixTex: `${forward ? lapTight(inner) : invLap(inner)} =`,
    symbols: forward
      ? { primary: 's', allowed: ['s'] }
      : { primary: 't', allowed: ['t'], functions: STEP_FN },
    target: forward ? (o) => evalS([term], o.s) : (o) => evalF([term], o.t),
    points: forward ? sPoints(poles) : tPoints(delay),
    poles: forward ? poles : [],
    answerTex,
    ...assembleChoices(answerTex, translationCandidates(term, direction), rng, optionCount),
    hint: forward
      ? `This is $f(t-a)\\,\\mathcal{U}(t-a)$ with $a = ${delay}$. Transform $f$ on its own, then multiply by $e^{-${delay === 1 ? '' : delay}s}$.`
      : `The factor $e^{-${delay === 1 ? '' : delay}s}$ means a delay of ${delay}. Set it aside, invert the rest, then delay what you get.`,
    derivation: secondDerivation(term, direction),
    syntaxNote: forward
      ? 'Give a function of `s`; write the exponential as `e^(-2s)`.'
      : 'Give a function of `t`. Write the unit step as `U(t-2)` — `u`, `H` or `step` are accepted too.',
    terms: [term],
  }
}

function secondDerivation(term: Term, direction: ShiftDirection): Step[] {
  const form = FORM_BY_ID.get(term.form)!
  const plain: Term = { ...term, delay: undefined }
  const d = term.delay!
  const steps: Step[] = []

  if (direction === 'forward') {
    steps.push({
      label: 'Check the form',
      text: `The theorem needs $f(t-a)\\,\\mathcal{U}(t-a)$ — the row itself running on $t-${d}$, off before then. That is what this is, with $a = ${d}$.`,
      tex: `f(t) = ${fTex([plain])}`,
    })
    steps.push({
      label: `Row (${form.letter})`,
      text: 'Transform the undelayed row.',
      tex: `F(s) = ${sTex([plain])}`,
    })
    steps.push({
      label: 'Theorem 7.3.2',
      text: `The delay contributes one factor and changes nothing else.`,
      tex: `${lapTight(fTex([term]))} = e^{-${d === 1 ? '' : d}s}F(s) = ${sTex([term])}`,
    })
    return steps
  }

  steps.push({
    label: 'Set the factor aside',
    text: `An $e^{-${d === 1 ? '' : d}s}$ multiplying the transform is a delay of ${d} in the answer. Invert what is left of it first.`,
    tex: `${invLap(sTex([term]))} = ${invLap(sTex([plain]))}\\Big|_{\\text{then delayed by } ${d}}`,
  })
  const fix = !isOne(term.coef)
  steps.push({
    label: `Row (${form.letter})`,
    text: fix
      ? `Row (${form.letter}) needs its own numerator, so fix the constant up here — before the delay, where it is easy to see.`
      : 'The row applies directly.',
    tex: `${invLap(sTex([plain]))} = ${fTex([plain])}`,
  })
  steps.push({
    label: 'Delay it',
    text: `Replace $t$ by $t-${d}$ throughout and switch on at $t = ${d}$.`,
    tex: `${invLap(sTex([term]))} = ${fTex([term])}`,
  })
  return steps
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface ShiftOptions {
  theorem: Theorem | 'both'
  direction: ShiftDirection | 'both'
  optionCount?: number
  seed?: number
}

export function nextShiftProblem(o: ShiftOptions): ShiftProblem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const theorem = o.theorem === 'both' ? (rng.bool() ? 'first' : 'second') : o.theorem
  const direction =
    o.direction === 'both' ? (rng.bool() ? 'forward' : 'inverse') : o.direction
  const count = o.optionCount ?? 4
  return theorem === 'first'
    ? firstProblem(rng, direction, count)
    : secondProblem(rng, direction, count)
}

/**
 * A translation attached to an ordinary drill problem, when the student has
 * asked for shifted forms to be mixed in.
 */
export function translateTerm(rng: RNG, term: Term): Term {
  if (rng.bool(0.5) && SHIFTABLE.includes(term.form)) {
    return { ...term, shift: rng.pick(SHIFTS) }
  }
  return { ...term, delay: rng.pick(DELAYS) }
}
