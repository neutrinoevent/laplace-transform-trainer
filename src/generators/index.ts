/**
 * Problem generation.
 *
 * Every problem is a short sum of table rows with concrete parameters. Forward
 * problems fix an integer coefficient in the t-domain; inverse problems fix an
 * integer numerator in the s-domain and let the t-side coefficient fall out —
 * which is exactly where the fix-up constants come from, rather than being
 * bolted on afterwards.
 */

import { FORM_IDS, evalF, evalS, polesOf, termNumer, type FormId, type Term } from '../data/forms'
import { frac, texCoef } from '../lib/frac'
import { fTex, invLap, lap, sTex } from '../lib/expr'
import { makeRng, randomRng, type RNG } from '../lib/rng'
import { deriveForward, deriveInverse, identify, needsFixup } from './derive'
import { forwardMutations, inverseMutations } from './mutations'
import { itemId, type Choice, type Direction, type Problem } from './types'

export * from './types'

const FREQUENCIES = [1, 2, 2, 3, 3, 4, 5, 6]
const RATES = [1, 2, 2, 3, 3, 4, 5, 6]
const POWERS = [1, 2, 2, 3, 3, 4, 5]
const SMALL = [1, 1, 1, 2, 3, 4, 5]
const CONSTANTS = [2, 3, 4, 5, 6, 7, 10]

// ---------------------------------------------------------------------------
// Term construction
// ---------------------------------------------------------------------------

/** A t-domain term with an integer coefficient — the shape a forward problem needs. */
function forwardTerm(rng: RNG, form: FormId, negative: boolean): Term {
  const sign = negative ? -1 : 1
  const coef = frac(sign * rng.pick(form === 'one' ? CONSTANTS : SMALL))
  switch (form) {
    case 'one':
      return { form, coef }
    case 'power':
      return { form, coef, n: rng.pick(POWERS) }
    case 'exp':
      return { form, coef, a: rng.sign() * rng.pick(RATES) }
    default:
      return { form, coef, k: rng.pick(FREQUENCIES) }
  }
}

/**
 * An s-domain term with an integer numerator — the shape an inverse problem
 * needs. `exact` asks for the numerator the row already wants, so no fix-up is
 * owed; otherwise the numerator is arbitrary and the constant has to be built.
 */
function inverseTerm(rng: RNG, form: FormId, negative: boolean, exact: boolean): Term {
  const skeleton: Term = (() => {
    switch (form) {
      case 'one':
        return { form, coef: frac(1) }
      case 'power':
        return { form, coef: frac(1), n: rng.pick(POWERS) }
      case 'exp':
        return { form, coef: frac(1), a: rng.sign() * rng.pick(RATES) }
      default:
        return { form, coef: frac(1), k: rng.pick(FREQUENCIES) }
    }
  })()
  // The numerator this row supplies on its own: n!, k, or 1.
  const own = termNumer(skeleton).coef.n
  const numer = exact ? own : rng.pick(form === 'one' ? CONSTANTS : SMALL)
  return { ...skeleton, coef: frac((negative ? -1 : 1) * numer, own) }
}

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------

const CHOICE_SAMPLES = [1.13, 2.37, 3.71, 5.19]

/** Mutate one term at a time, keeping the rest of the sum intact. */
function buildChoices(
  terms: Term[],
  direction: Direction,
  rng: RNG,
  count: number,
): { choices: Choice[]; correctIndex: number } {
  const render = direction === 'forward' ? sTex : fTex
  const mutate = direction === 'forward' ? forwardMutations : inverseMutations
  // Forward answers are rational in s; sample clear of every pole the rows can produce.
  const sample = (ts: Term[]) =>
    CHOICE_SAMPLES.map((x) => (direction === 'forward' ? evalS(ts, x + 6.4) : evalF(ts, x)))

  const correctTex = render(terms)
  const correctValues = sample(terms)

  // Two terms of the same row at the same parameter would visibly collapse into
  // one; an option nobody would write is not a distractor, it is a giveaway.
  const shape = (t: Term) => `${t.form}|${t.n ?? ''}|${t.a ?? ''}|${t.k ?? ''}`
  const collapses = (ts: Term[]) => new Set(ts.map(shape)).size !== ts.length

  const pool: Choice[] = []
  const seen = new Set([correctTex])
  for (let i = 0; i < terms.length; i++) {
    for (const m of mutate(terms[i])) {
      const alt = terms.map((t, j) => (i === j ? m.term : t))
      if (collapses(alt)) continue
      const tex = render(alt)
      if (seen.has(tex)) continue
      const values = sample(alt)
      if (values.some((v) => !Number.isFinite(v))) continue
      // A "wrong" option that is numerically the right answer is not an option.
      const same = values.every(
        (v, j) => Math.abs(v - correctValues[j]) < 1e-9 * (1 + Math.abs(correctValues[j])),
      )
      if (same) continue
      seen.add(tex)
      pool.push({ tex, why: m.why })
    }
  }

  const kept = rng.shuffle(pool).slice(0, Math.max(1, count - 1))
  const choices = rng.shuffle([{ tex: correctTex, why: null }, ...kept])
  return { choices, correctIndex: choices.findIndex((c) => c.why === null) }
}

// ---------------------------------------------------------------------------
// Problems
// ---------------------------------------------------------------------------

const QUESTION: Record<Direction, string> = {
  forward: 'Find the Laplace transform. Your answer is a function of $s$.',
  inverse: 'Find the inverse transform. Your answer is a function of $t$.',
}

function hintFor(terms: Term[], direction: Direction): string {
  const rows = terms.map((t) => identify(t, direction)).join(' ')
  return terms.length > 1
    ? `Two rows are in play — handle each piece on its own, then add. ${rows}`
    : rows
}

function assemble(
  terms: Term[],
  direction: Direction,
  statementInner: string,
  rng: RNG,
  optionCount: number,
  splitFrom?: string,
): Problem {
  const forward = direction === 'forward'
  const { choices, correctIndex } = buildChoices(terms, direction, rng, optionCount)
  const promptTex = forward ? lap(statementInner) : invLap(statementInner)
  return {
    direction,
    forms: terms.map((t) => t.form),
    itemIds: [...new Set(terms.map((t) => itemId(t.form, direction)))],
    promptTex,
    statementTex: `${promptTex} \\;=\\; ?`,
    question: QUESTION[direction],
    variable: forward ? 's' : 't',
    target: forward ? (s: number) => evalS(terms, s) : (t: number) => evalF(terms, t),
    poles: forward ? polesOf(terms) : [],
    answerTex: forward ? sTex(terms) : fTex(terms),
    choices,
    correctIndex,
    hint: hintFor(terms, direction),
    derivation: forward ? deriveForward(terms) : deriveInverse(terms, splitFrom),
    fixup: terms.some(needsFixup),
    terms,
  }
}

function buildForward(
  rng: RNG,
  first: FormId,
  partners: FormId[],
  combo: boolean,
  optionCount: number,
): Problem {
  const terms: Term[] = [forwardTerm(rng, first, false)]
  if (combo && partners.length) terms.push(forwardTerm(rng, rng.pick(partners), rng.bool(0.45)))
  return assemble(terms, 'forward', fTex(terms), rng, optionCount)
}

/** `(2s+6)/(s^2+4)` — one fraction hiding two rows. The classic split. */
function pairedInverse(rng: RNG, hyperbolic: boolean, optionCount: number): Problem {
  const k = rng.pick(FREQUENCIES.filter((f) => f > 1))
  const cosCoef = rng.pick([1, 1, 2, 3, 4])
  const sinNumer = rng.pick(SMALL)
  const negate = rng.bool(0.35)
  const terms: Term[] = [
    { form: hyperbolic ? 'cosh' : 'cos', coef: frac(cosCoef), k },
    { form: hyperbolic ? 'sinh' : 'sin', coef: frac((negate ? -1 : 1) * sinNumer, k), k },
  ]
  const numerator = `${texCoef(frac(cosCoef), 's')} ${negate ? '-' : '+'} ${sinNumer}`
  const splitFrom = `\\dfrac{${numerator}}{s^2 ${hyperbolic ? '-' : '+'} ${k ** 2}}`
  return assemble(terms, 'inverse', splitFrom, rng, optionCount, splitFrom)
}

function buildInverse(
  rng: RNG,
  first: FormId,
  partners: FormId[],
  combo: boolean,
  optionCount: number,
): Problem {
  if (combo) {
    // Half the combinations are the shared-denominator split, when the rows allow it.
    const rows = new Set([first, ...partners])
    const circular = rows.has('sin') && rows.has('cos')
    const hyper = rows.has('sinh') && rows.has('cosh')
    if ((circular || hyper) && rng.bool(0.55)) {
      return pairedInverse(rng, hyper && (!circular || rng.bool(0.5)), optionCount)
    }
  }
  const terms: Term[] = [inverseTerm(rng, first, false, rng.bool(0.4))]
  if (combo && partners.length) {
    terms.push(inverseTerm(rng, rng.pick(partners), rng.bool(0.45), rng.bool(0.4)))
  }
  return assemble(terms, 'inverse', sTex(terms), rng, optionCount)
}

export function makeForward(rng: RNG, forms: FormId[], combo = false, optionCount = 4): Problem {
  const pool = forms.length ? forms : FORM_IDS
  const first = rng.pick(pool)
  return buildForward(rng, first, FORM_IDS.filter((f) => f !== first), combo, optionCount)
}

export function makeInverse(rng: RNG, forms: FormId[], combo = false, optionCount = 4): Problem {
  const pool = forms.length ? forms : FORM_IDS
  const first = rng.pick(pool)
  return buildInverse(rng, first, FORM_IDS.filter((f) => f !== first), combo, optionCount)
}

// ---------------------------------------------------------------------------
// Adaptive selection
// ---------------------------------------------------------------------------

export interface GenOptions {
  /** Rows in play; null or empty means all seven. */
  scope: FormId[] | null
  direction: Direction | 'both'
  /** Mastery per `form:direction` id, 0..1. */
  mastery: Map<string, number>
  /** Combinations of two rows unlock once the basics hold. */
  allowCombo: boolean
  optionCount?: number
  /** Avoid handing back the row that was just answered. */
  excludeForm?: FormId | null
  seed?: number
}

export function nextProblem(o: GenOptions): Problem {
  const rng = o.seed === undefined ? randomRng() : makeRng(o.seed)
  const scope = o.scope && o.scope.length ? o.scope : FORM_IDS
  const directions: Direction[] = o.direction === 'both' ? ['forward', 'inverse'] : [o.direction]

  const all = scope.flatMap((form) => directions.map((dir) => ({ form, dir })))
  const filtered = o.excludeForm ? all.filter((c) => c.form !== o.excludeForm) : all
  const pool = filtered.length ? filtered : all

  // Weakest first, but never deterministically — a fixed order stops being practice.
  const weights = pool.map(({ form, dir }) => 0.12 + (1 - (o.mastery.get(itemId(form, dir)) ?? 0)) ** 2)
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = rng.next() * total
  let chosen = pool[pool.length - 1]
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]
    if (roll <= 0) {
      chosen = pool[i]
      break
    }
  }

  const scopeMastery =
    pool.reduce((sum, { form, dir }) => sum + (o.mastery.get(itemId(form, dir)) ?? 0), 0) / pool.length
  // Combinations stay a minority while a scope is new, but never so rare that
  // the shared-denominator split has to be ground out — it is one of the most
  // useful items here, not a reward.
  const combo =
    o.allowCombo && scope.length > 1 && rng.next() < Math.min(0.45, 0.12 + scopeMastery * 0.45)
  const partners = scope.filter((f) => f !== chosen.form)
  const count = o.optionCount ?? 4

  return chosen.dir === 'forward'
    ? buildForward(rng, chosen.form, partners, combo, count)
    : buildInverse(rng, chosen.form, partners, combo, count)
}

// ---------------------------------------------------------------------------
// Pairs, for the match board
// ---------------------------------------------------------------------------

export interface Pair {
  form: FormId
  fTex: string
  sTex: string
  terms: Term[]
}

/** One row at concrete parameters, as it would appear in the table. */
export function makePair(rng: RNG, form: FormId): Pair {
  const base = inverseTerm(rng, form, false, true)
  const term: Term = { ...base, coef: frac(rng.bool(0.6) ? 1 : rng.pick([2, 3, 4, 5])) }
  return { form, fTex: fTex([term]), sTex: sTex([term]), terms: [term] }
}

/** A board of distinct tiles — two rows printing the same thing would be unfair. */
export function makeBoard(rng: RNG, forms: FormId[], size: number): Pair[] {
  const pool = forms.length ? forms : FORM_IDS
  const picks =
    pool.length >= size
      ? rng.sample(pool, size)
      : Array.from({ length: size }, (_, i) => pool[i % pool.length])
  const out: Pair[] = []
  const seen = new Set<string>()
  for (const form of picks) {
    // A scope of one or two rows has a small supply of distinct instances, so
    // this retries generously and settles for a shorter board if it must.
    for (let tries = 0; tries < 40; tries++) {
      const pair = makePair(rng, form)
      if (!seen.has(pair.fTex) && !seen.has(pair.sTex)) {
        seen.add(pair.fTex)
        seen.add(pair.sTex)
        out.push(pair)
        break
      }
    }
  }
  return out
}
