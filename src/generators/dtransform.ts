/**
 * Theorem 7.4.1, derivatives of a transform.
 *
 *     L{t^n f(t)} = (-1)^n d^n/ds^n F(s)
 *
 * The theorem students most often meet backwards. Everything before it moves in
 * one direction — a function goes in, a transform comes out — and this one says
 * that an operation on the *transform* corresponds to an operation on the
 * function. Multiplying by `t` downstairs in the `t`-domain is differentiating
 * upstairs in the `s`-domain, with a sign for each go.
 *
 * It is also the theorem that finally reaches `t\sin kt`, which is the row every
 * resonant spring problem lands on and which nothing else in the table can
 * produce. The book's own NOTE is worth keeping in view: `t e^{at}` can be had
 * from this theorem or from Theorem 7.3.1, and the two agree — which is a
 * reassurance, not a coincidence.
 *
 * The transform side is kept as `P(s)/D(s)^m` throughout (`lib/rat`), so
 * differentiating never inflates the denominator, and the answer stays exact.
 */

import { evalTermF, termBodyTex, type FormId, type Term } from '../data/forms'
import { frac, texCoef } from '../lib/frac'
import { invLap, lapTight } from '../lib/expr'
import {
  rat,
  ratEval,
  ratMultiplyByT,
  ratPoles,
  ratTex,
  type Rat,
} from '../lib/rat'
import { scopePoints, type Symbols } from '../lib/check'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import type { SlipId } from '../data/slips'
import type { Facet } from '../lib/facets'
import type { Choice, Step } from './types'

export type DtDirection = 'forward' | 'inverse'

export const dtransformItemId = (direction: DtDirection): string => `dtrans:${direction}`

export const DTRANSFORM_ITEMS = [dtransformItemId('forward'), dtransformItemId('inverse')]

export interface DtProblem {
  itemId: string
  direction: DtDirection
  /** The power of `t` multiplying the row: how many times to differentiate. */
  power: number
  statementTex: string
  question: string
  prefixTex: string
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  points: Record<string, number>[]
  poles: number[]
  /**
   * Both sides of the pair the problem is about, whichever way round it is
   * posed. Kept so a check can integrate one against the other.
   */
  timeValue: (t: number) => number
  transformValue: (s: number) => number
  answerTex: string
  choices: Choice[]
  correctIndex: number
  hint: string
  derivation: Step[]
  syntaxNote: string
  facets: Facet[]
}

// ---------------------------------------------------------------------------
// t^n f(t)
// ---------------------------------------------------------------------------

/**
 * `t^n` times a row. The row itself is an ordinary `Term`, so its rendering and
 * its `t`-domain value come from the machinery that already exists; only the
 * factor of `t^n` is new, and it lives here rather than in the `Term` model
 * because no other section produces one.
 */
interface Product {
  power: number
  base: Term
}

/** `t^{2}\sin 3t`. */
function productTex(p: Product): string {
  const body = termBodyTex(p.base)
  const t = p.power === 0 ? '' : p.power === 1 ? 't' : `t^{${p.power}}`
  return texCoef(p.base.coef, `${t}${body}`)
}

const productF = (p: Product, t: number): number => t ** p.power * evalTermF(p.base, t)

/** The row's own transform, before any differentiating. */
function baseRat(term: Term): Rat {
  const c = term.coef.n / term.coef.d
  switch (term.form) {
    case 'exp':
      return rat([c], [-term.a!, 1])
    case 'sin':
      return rat([c * term.k!], [term.k! ** 2, 0, 1])
    case 'cos':
      return rat([0, c], [term.k! ** 2, 0, 1])
    case 'sinh':
      return rat([c * term.k!], [-(term.k! ** 2), 0, 1])
    case 'cosh':
      return rat([0, c], [-(term.k! ** 2), 0, 1])
    default:
      return rat([c], [0, 1])
  }
}

// ---------------------------------------------------------------------------
// Draws
// ---------------------------------------------------------------------------

/**
 * Rows worth multiplying by `t`. The oscillating four are the point of the
 * theorem — nothing else in the table reaches `t\sin kt`. The exponential is
 * kept because the book uses it to show 7.3.1 and 7.4.1 agreeing.
 */
const OSCILLATING: FormId[] = ['sin', 'cos', 'sinh', 'cosh']
const FREQUENCIES = [1, 2, 2, 3, 3, 4, 5]
const RATES = [1, 2, 2, 3, 3, 4]
const COEFS = [1, 1, 1, 1, 2, 3]

function drawBase(rng: RNG, allowExp: boolean): Term {
  const coef = frac(rng.pick(COEFS))
  if (allowExp && rng.bool(0.2)) {
    return { form: 'exp', coef, a: rng.sign() * rng.pick(RATES) }
  }
  return { form: rng.pick(OSCILLATING), coef, k: rng.pick(FREQUENCIES) }
}

// ---------------------------------------------------------------------------
// Distractors
// ---------------------------------------------------------------------------

interface Candidate {
  tex: string
  why: string
  slip: SlipId
  value: (scope: Record<string, number>) => number
}

/** Wrong transforms, each the result of a nameable slip in applying 7.4.1. */
function forwardCandidates(base: Term, power: number, F: Rat, answer: Rat): Candidate[] {
  const out: Candidate[] = []
  const evalOf = (r: Rat) => (o: Record<string, number>) => ratEval(r, o.s)

  // The sign is the whole of (-1)^n, and it is the first thing to go.
  if (power % 2 === 1) {
    const unsigned = rat(answer.p.map((c) => -c), answer.d, answer.m)
    out.push({
      tex: ratTex(unsigned),
      why: `The $(-1)^{n}$ has been dropped. With $n = ${power}$ the derivative is negated, so every sign here is the wrong way round.`,
      slip: 'derivative-sign',
      value: evalOf(unsigned),
    })
  }

  // Differentiating one time too few or too many.
  for (const off of [-1, 1]) {
    const n = power + off
    if (n < 1) continue
    out.push({
      tex: ratTex(ratMultiplyByT(F, n)),
      why:
        off < 0
          ? `That is $\\mathcal{L}\\{t^{${n}}f(t)\\}$ — one differentiation short of $t^{${power}}$.`
          : `That is $\\mathcal{L}\\{t^{${n}}f(t)\\}$ — differentiated once more than $t^{${power}}$ calls for.`,
      slip: 'derivative-count',
      value: evalOf(ratMultiplyByT(F, n)),
    })
  }

  // Multiplying the transform by t^n instead of differentiating it, which is
  // the theorem read as though it said something much simpler.
  out.push({
    tex: ratTex(rat(F.p, F.d, F.m + power)),
    why: 'Multiplying by $t$ is not multiplying the transform by anything — it is *differentiating* the transform. Raising the denominator without differentiating the numerator is neither.',
    slip: 'derivative-shape',
    value: evalOf(rat(F.p, F.d, F.m + power)),
  })

  // Translating instead of differentiating: the other theorem entirely.
  if (base.form !== 'exp') {
    const shifted = rat(F.p, F.d, F.m)
    out.push({
      tex: `\\left.${ratTex(shifted)}\\right|_{s \\to s - ${power}}`,
      why: 'That is Theorem 7.3.1, which handles multiplying by $e^{at}$. Multiplying by $t^{n}$ is Theorem 7.4.1, and it differentiates rather than translates.',
      slip: 'translation-choice',
      value: (o) => ratEval(shifted, o.s - power),
    })
  }

  return out
}

/** Wrong functions, for an inverse problem. */
function inverseCandidates(product: Product): Candidate[] {
  const { power, base } = product
  const out: Candidate[] = []
  const push = (p: Product, why: string, slip: SlipId) =>
    out.push({ tex: productTex(p), why, slip, value: (o) => productF(p, o.t) })

  // The power of t reads off the power on the denominator, and is easy to slip.
  if (power > 1) push({ power: power - 1, base }, `The denominator's power says $t^{${power}}$, not $t^{${power - 1}}$.`, 'power-index')
  push({ power: power + 1, base }, `That is one power of $t$ too many for this denominator.`, 'power-index')

  // The row itself, unmultiplied.
  push({ power: 0, base }, 'The factor of $t$ has been lost. A squared denominator is what puts it there.', 'derivative-count')

  // Sine against cosine, and circular against hyperbolic, as everywhere else.
  if (base.form === 'sin' || base.form === 'cos') {
    push(
      { power, base: { ...base, form: base.form === 'sin' ? 'cos' : 'sin' } },
      'The numerator marker is the wrong way round: an $s$ on top goes with the cosine.',
      'row-marker',
    )
  }
  if (base.form === 'sin' || base.form === 'sinh') {
    push(
      { power, base: { ...base, form: base.form === 'sin' ? 'sinh' : 'sin' } },
      'The sign downstairs is the whole difference between circular and hyperbolic.',
      'family',
    )
  }

  return out
}

// ---------------------------------------------------------------------------
// Worked solution
// ---------------------------------------------------------------------------

function derivationFor(product: Product, answer: Rat, direction: DtDirection): Step[] {
  const { power, base } = product
  const unit: Term = { ...base, coef: frac(1) }
  const steps: Step[] = []

  steps.push({
    label: 'Name the row',
    text: `Set aside the $t^{${power}}$ and transform what is left. That is an ordinary table row.`,
    tex: `${lapTight(termBodyTex(unit))} = ${ratTex(baseRat(unit))}`,
  })

  for (let i = 1; i <= power; i++) {
    const next = ratMultiplyByT(baseRat(base), i)
    steps.push({
      label: power === 1 ? 'Differentiate once' : `Differentiate (${i} of ${power})`,
      text:
        i === 1
          ? 'Theorem 7.4.1: one factor of $t$ costs one derivative with respect to $s$, and one change of sign. The quotient rule raises the power on the denominator by one each time.'
          : 'Again — and the sign flips back.',
      tex: `${lapTight(texCoef(base.coef, `${i === 1 ? 't' : `t^{${i}}`}${termBodyTex(unit)}`))} = ${
        i % 2 === 1 ? '-' : ''
      }\\dfrac{d^{${i === 1 ? '' : i}}}{ds^{${i === 1 ? '' : i}}}\\left[${ratTex(baseRat(base))}\\right] = ${ratTex(next)}`,
    })
  }

  steps.push({
    label: direction === 'forward' ? 'Result' : 'Read it backwards',
    text:
      direction === 'forward'
        ? 'The denominator carries one more power for each factor of $t$, which is the signature to recognise going the other way.'
        : 'A squared denominator over the plain row is what a factor of $t$ looks like from the $s$-side.',
    tex:
      direction === 'forward'
        ? `${lapTight(productTex(product))} = ${ratTex(answer)}`
        : `${invLap(ratTex(answer))} = ${productTex(product)}`,
  })

  return steps
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface DtOptions {
  direction?: DtDirection | 'both'
  /** 0..2: how many powers of `t` are in play. */
  rung?: number
  optionCount?: number
  uncovered?: Set<string>
  seed?: number
}

export function nextDtProblem(o: DtOptions = {}): DtProblem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const rung = Math.max(0, Math.min(2, o.rung ?? 2))
  const count = o.optionCount ?? 4
  // The bottom rung introduces the theorem in the direction it is stated in;
  // reading it backwards is what the next rung adds.
  const direction: DtDirection =
    o.direction && o.direction !== 'both'
      ? o.direction
      : rung === 0 || rng.bool()
        ? 'forward'
        : 'inverse'

  const itemId = dtransformItemId(direction)
  // The second power is the harder half: the sign comes back round, and the
  // numerator stops being a single term. It belongs to the top rung, so a
  // coverage debt cannot drag it below one — a rung that serves what it does
  // not describe teaches the student to stop reading the description.
  const forceSquared = rung >= 2 && (o.uncovered?.has(itemId) ?? false)
  const power = rung >= 2 && (forceSquared || rng.bool(0.35)) ? 2 : 1

  const base = drawBase(rng, direction === 'forward' && rung >= 1)
  const product: Product = { power, base }
  const F = baseRat(base)
  const answer = ratMultiplyByT(F, power)
  const unit: Term = { ...base, coef: frac(1) }

  const forward = direction === 'forward'
  const symbols: Symbols = forward
    ? { primary: 's', allowed: ['s'] }
    : { primary: 't', allowed: ['t'] }
  const poles = forward ? ratPoles(answer) : []

  const answerTex = forward ? ratTex(answer) : productTex(product)
  const pool = forward
    ? forwardCandidates(base, power, F, answer)
    : inverseCandidates(product)

  const seen = new Set([answerTex])
  const kept: Choice[] = []
  for (const c of rng.shuffle(pool)) {
    if (seen.has(c.tex)) continue
    seen.add(c.tex)
    kept.push({ tex: c.tex, why: c.why, slip: c.slip, value: c.value })
  }
  const choices = rng.shuffle([
    { tex: answerTex, why: null } as Choice,
    ...kept.slice(0, Math.max(1, count - 1)),
  ])

  return {
    itemId,
    direction,
    power,
    statementTex: forward
      ? `${lapTight(productTex(product))} \\;=\\; ?`
      : `${invLap(ratTex(answer))} \\;=\\; ?`,
    question: forward
      ? 'Find the transform. Your answer is a function of $s$.'
      : 'Find the inverse transform. Your answer is a function of $t$.',
    prefixTex: forward ? `${lapTight(productTex(product))} =` : `${invLap(ratTex(answer))} =`,
    symbols,
    target: forward
      ? (o2) => ratEval(answer, o2.s)
      : (o2) => productF(product, o2.t),
    timeValue: (t) => productF(product, t),
    transformValue: (sv) => ratEval(answer, sv),
    points: scopePoints(symbols, poles),
    poles,
    answerTex,
    choices,
    correctIndex: choices.findIndex((c) => c.why === null),
    hint: forward
      ? `Transform $${termBodyTex(unit)}$ first, then differentiate it ${power === 1 ? 'once' : `${power} times`} with respect to $s$ and multiply by $(-1)^{${power}}$.`
      : `A denominator raised to a power is the signature of a factor of $t$. Which row has $${ratTex(F)}$ as its transform?`,
    derivation: derivationFor(product, answer, direction),
    syntaxNote: forward
      ? 'Give a function of `s`, for example `6s/(s^2+9)^2`.'
      : 'Give a function of `t`, for example `t*sin(3t)`.',
    facets: [...(power >= 2 ? (['repeated'] as const) : [])],
  }
}
