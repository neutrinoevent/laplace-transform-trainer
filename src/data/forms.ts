/**
 * The seven basic transform pairs — Zill 9e, Theorem 7.1.1 (forward) and
 * Theorem 7.2.1 (inverse), which are the same seven facts read in the two
 * directions. Everything the trainer generates, drills, matches, and schedules
 * is an instance of one of these rows, so this file is the single source of
 * truth for notation, ordering, and the letters (a)–(g) the book uses.
 *
 * Notation follows the book exactly: t and s for the variables, n for the
 * power, a for the exponential rate, k for the frequency.
 */

import { factorial, frac, isInt, texCoef, type Frac } from '../lib/frac'

export type FormId = 'one' | 'power' | 'exp' | 'sin' | 'cos' | 'sinh' | 'cosh'

export const FORM_IDS: FormId[] = ['one', 'power', 'exp', 'sin', 'cos', 'sinh', 'cosh']

/** One instance of a table row, carrying its own coefficient in the t-domain. */
export interface Term {
  form: FormId
  /** Coefficient of the t-domain function: the `4` in `4t^2`. */
  coef: Frac
  /** Power, for `t^n`. */
  n?: number
  /** Rate, for `e^{at}`. */
  a?: number
  /** Frequency, for the four oscillating/hyperbolic rows. */
  k?: number
  /**
   * First translation, Theorem 7.3.1: the row is multiplied by `e^{shift·t}`,
   * which replaces every `s` in its transform by `s - shift`. Meaningless on
   * rows (a) and (c), which absorb the exponential, so it is never set there.
   */
  shift?: number
  /**
   * Second translation, Theorem 7.3.2: the row is delayed and switched on at
   * `t = delay`, becoming `f(t-delay)·U(t-delay)`, which multiplies its
   * transform by `e^{-delay·s}`.
   */
  delay?: number
}

/** A row carries at most one translation; the two do not compose cleanly. */
export const isShifted = (t: Term): boolean => Boolean(t.shift) || Boolean(t.delay)

export interface Form {
  id: FormId
  /** The letter Zill gives this row in both theorems. */
  letter: string
  name: string
  /** Compact label for scope chips and tables. */
  chipTex: string
  /** The row as stated in the book, with symbolic parameters. */
  genericF: string
  genericS: string
  /** Side condition printed next to the row, if any. */
  condition?: string
  /** What actually distinguishes this row when you meet it in the wild. */
  note: string
  /** The mistake this row invites, phrased as the student would make it. */
  confusion: string
  /** Concrete parameters used for the worked illustration in the table. */
  sample: Term
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** `3t`, `-2t`, `t`, `-t` — the exponent body of `e^{at}` and the like. */
function texRate(a: number, v = 't'): string {
  if (a === 1) return v
  if (a === -1) return `-${v}`
  return `${a}${v}`
}

/** The unit step, written as Zill writes it. */
export const stepTex = (d: number): string => `\\mathcal{U}(t - ${d})`

/**
 * The time argument a row is written in. A delayed row runs on `t - d`, and
 * that substitution is the whole visible content of the second translation
 * theorem — `\sin 3t` becoming `\sin 3(t-2)`.
 */
const timeArg = (term: Term): { v: string; grouped: string } =>
  term.delay ? { v: `t - ${term.delay}`, grouped: `(t - ${term.delay})` } : { v: 't', grouped: 't' }

/** The t-domain function of a term with its coefficient stripped off. */
export function termBodyTex(term: Term): string {
  const { v, grouped } = timeArg(term)
  // A delayed row runs on `t - d`, and every use of it needs the brackets:
  // `\sin 3(t-2)`, not `\sin 3t - 2`.
  const arg = term.delay ? grouped : 't'
  const body = (() => {
    switch (term.form) {
      case 'one':
        return ''
      case 'power':
        return term.n === 1 ? arg : `${arg}^{${term.n}}`
      case 'exp': {
        // The exponent's own braces already group it, so `e^{t-2}` needs none.
        const rate = term.a === 1 ? v : term.a === -1 ? `-${arg}` : `${term.a}${arg}`
        return `e^{${rate}}`
      }
      default: {
        const wave = term.k === 1 ? arg : `${term.k}${arg}`
        return `\\${term.form} ${wave}`
      }
    }
  })()
  if (term.delay) return body ? `${body}\\,${stepTex(term.delay)}` : stepTex(term.delay)
  if (term.shift) return `e^{${texRate(term.shift)}}${body}`
  return body
}

/** The t-domain term, split so a sum can fold the sign into its join. */
export function termFTex(term: Term): { neg: boolean; tex: string } {
  const body = termBodyTex(term)
  const mag = term.coef.n < 0 ? { ...term.coef, n: -term.coef.n } : term.coef
  return { neg: term.coef.n < 0, tex: texCoef(mag, body) }
}

/** The s-variable a translated row is written in: `s`, `s - 5`, `s + 2`. */
export const shiftedVar = (shift?: number): string =>
  !shift ? 's' : shift > 0 ? `s - ${shift}` : `s + ${-shift}`

/** `s^2+9`, `s-3`, `(s-5)^{4}` — the denominator this row contributes. */
export function termDenomTex(term: Term): string {
  const v = shiftedVar(term.shift)
  // Powers and squares need the translated variable bracketed; a bare `s` does not.
  const g = term.shift ? `\\left(${v}\\right)` : 's'
  switch (term.form) {
    case 'one':
      return v
    case 'power':
      return `${g}^{${term.n! + 1}}`
    case 'exp':
      return term.a! < 0 ? `s + ${-term.a!}` : `s - ${term.a!}`
    case 'sin':
    case 'cos':
      return `${g}^2 + ${term.k! ** 2}`
    case 'sinh':
    case 'cosh':
      return `${g}^2 - ${term.k! ** 2}`
  }
}

/**
 * The numerator of this row's transform: a rational multiplier, and whether an
 * `s` rides along with it. `4t^2` gives `{ coef: 8, hasS: false }` because the
 * factorial folds into the coefficient; `2\cos 3t` gives `{ coef: 2, hasS: true }`.
 */
export function termNumer(term: Term): { coef: Frac; hasS: boolean } {
  const c = term.coef
  switch (term.form) {
    case 'one':
    case 'exp':
      return { coef: c, hasS: false }
    case 'power':
      return { coef: frac(c.n * factorial(term.n!), c.d), hasS: false }
    case 'sin':
    case 'sinh':
      return { coef: frac(c.n * term.k!, c.d), hasS: false }
    case 'cos':
    case 'cosh':
      return { coef: c, hasS: true }
  }
}

/**
 * `e^{-2s}`, the factor a delayed row contributes.
 *
 * A negative delay is not a real problem, but it is a real distractor — the one
 * that gets the sign in the exponent backwards — so it has to print as `e^{2s}`
 * rather than as a double minus.
 */
export const delayTex = (d?: number): string => {
  if (!d) return ''
  const mag = Math.abs(d) === 1 ? '' : Math.abs(d)
  return `e^{${d < 0 ? '' : '-'}${mag}s}`
}

/** The s-domain term, split so a sum can fold the sign into its join. */
export function termSTex(term: Term): { neg: boolean; tex: string } {
  const { coef, hasS } = termNumer(term)
  const denom = termDenomTex(term)
  const neg = coef.n < 0
  const mag = neg ? { ...coef, n: -coef.n } : coef
  const v = shiftedVar(term.shift)
  const factor = delayTex(term.delay)

  if (isInt(mag)) {
    // The `s` upstairs is translated too — the step most often missed.
    const body = hasS
      ? mag.n === 1
        ? v
        : `${mag.n}${term.shift ? `\\left(${v}\\right)` : 's'}`
      : String(mag.n)
    const numer = factor ? (body === '1' ? factor : `${body}${factor}`) : body
    return { neg, tex: `\\dfrac{${numer}}{${denom}}` }
  }
  // A fractional multiplier reads better outside the fraction than on top of it.
  return {
    neg,
    tex: `\\frac{${mag.n}}{${mag.d}}\\cdot${factor}\\dfrac{${hasS ? v : '1'}}{${denom}}`,
  }
}

// ---------------------------------------------------------------------------
// Evaluation — used by the answer checker and by the corpus tests
// ---------------------------------------------------------------------------

/** The row itself at time t, before any translation. */
function baseF(term: Term, t: number): number {
  const c = term.coef.n / term.coef.d
  switch (term.form) {
    case 'one':
      return c
    case 'power':
      return c * t ** term.n!
    case 'exp':
      return c * Math.exp(term.a! * t)
    case 'sin':
      return c * Math.sin(term.k! * t)
    case 'cos':
      return c * Math.cos(term.k! * t)
    case 'sinh':
      return c * Math.sinh(term.k! * t)
    case 'cosh':
      return c * Math.cosh(term.k! * t)
  }
}

/** The row's transform at s, before any translation. */
function baseS(term: Term, s: number): number {
  const c = term.coef.n / term.coef.d
  switch (term.form) {
    case 'one':
      return c / s
    case 'power':
      return (c * factorial(term.n!)) / s ** (term.n! + 1)
    case 'exp':
      return c / (s - term.a!)
    case 'sin':
      return (c * term.k!) / (s * s + term.k! ** 2)
    case 'cos':
      return (c * s) / (s * s + term.k! ** 2)
    case 'sinh':
      return (c * term.k!) / (s * s - term.k! ** 2)
    case 'cosh':
      return (c * s) / (s * s - term.k! ** 2)
  }
}

export function evalTermF(term: Term, t: number): number {
  // Delayed: off until t reaches the delay, then the row running on t - d.
  if (term.delay) return t >= term.delay ? baseF(term, t - term.delay) : 0
  return (term.shift ? Math.exp(term.shift * t) : 1) * baseF(term, t)
}

export function evalTermS(term: Term, s: number): number {
  // Translated on the s-axis: the same transform read at s - a.
  const base = baseS(term, s - (term.shift ?? 0))
  return term.delay ? Math.exp(-term.delay * s) * base : base
}

/** Real poles of this row's transform, so the checker can sample away from them. */
export function termPoles(term: Term): number[] {
  const base = (() => {
    switch (term.form) {
      case 'one':
      case 'power':
        return [0]
      case 'exp':
        return [term.a!]
      case 'sin':
      case 'cos':
        return []
      case 'sinh':
      case 'cosh':
        return [term.k!, -term.k!]
    }
  })()
  // Translating on the s-axis carries the poles with it.
  return base.map((p) => p + (term.shift ?? 0))
}

export const evalF = (terms: Term[], t: number): number =>
  terms.reduce((sum, term) => sum + evalTermF(term, t), 0)

export const evalS = (terms: Term[], s: number): number =>
  terms.reduce((sum, term) => sum + evalTermS(term, s), 0)

export const polesOf = (terms: Term[]): number[] => terms.flatMap(termPoles)

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

const one = (coef: number): Frac => frac(coef)

export const FORMS: Form[] = [
  {
    id: 'one',
    letter: 'a',
    name: 'Constant',
    chipTex: '1',
    genericF: '1',
    genericS: '\\dfrac{1}{s}',
    note: 'The whole table rests on this one. A constant $c$ pulls straight out by linearity, so $\\mathcal{L}\\{c\\} = c/s$.',
    confusion: 'Writing $\\mathcal{L}\\{c\\} = c$ — the transform of a constant is not a constant.',
    sample: { form: 'one', coef: one(5) },
  },
  {
    id: 'power',
    letter: 'b',
    name: 'Power',
    chipTex: 't^n',
    genericF: 't^n',
    genericS: '\\dfrac{n!}{s^{n+1}}',
    condition: 'n = 1, 2, 3, \\ldots',
    note: 'Two things move at once: a factorial appears on top, and the power downstairs is $n+1$, one more than the power upstairs.',
    confusion: 'Reading it backwards and dropping the factorial: $\\mathcal{L}^{-1}\\{1/s^{4}\\}$ is $t^3/3!$, not $t^3$.',
    sample: { form: 'power', coef: one(1), n: 3 },
  },
  {
    id: 'exp',
    letter: 'c',
    name: 'Exponential',
    chipTex: 'e^{at}',
    genericF: 'e^{at}',
    genericS: '\\dfrac{1}{s-a}',
    note: 'The pole sits exactly at the growth rate: $s = a$. Note the sign flip — $e^{-3t}$ transforms to $1/(s+3)$.',
    confusion: 'Copying the sign straight across, so $e^{-3t}$ becomes $1/(s-3)$.',
    sample: { form: 'exp', coef: one(1), a: -3 },
  },
  {
    id: 'sin',
    letter: 'd',
    name: 'Sine',
    chipTex: '\\sin kt',
    genericF: '\\sin kt',
    genericS: '\\dfrac{k}{s^2+k^2}',
    note: 'The numerator is $k$ — the frequency itself, never $s$. That $k$ is what forces the fix-up when you run the row backwards.',
    confusion: 'Answering $\\mathcal{L}^{-1}\\{1/(s^2+9)\\} = \\sin 3t$ without the $\\tfrac{1}{3}$ needed to build the $3$ on top.',
    sample: { form: 'sin', coef: one(1), k: 3 },
  },
  {
    id: 'cos',
    letter: 'e',
    name: 'Cosine',
    chipTex: '\\cos kt',
    genericF: '\\cos kt',
    genericS: '\\dfrac{s}{s^2+k^2}',
    note: 'Same denominator as sine; the numerator is the only thing separating them. An $s$ upstairs means cosine.',
    confusion: 'Swapping sine and cosine, since only the numerator differs.',
    sample: { form: 'cos', coef: one(1), k: 2 },
  },
  {
    id: 'sinh',
    letter: 'f',
    name: 'Hyperbolic sine',
    chipTex: '\\sinh kt',
    genericF: '\\sinh kt',
    genericS: '\\dfrac{k}{s^2-k^2}',
    note: 'Sine’s row with a minus sign downstairs. The sign of $k^2$ is the whole difference between circular and hyperbolic.',
    confusion: 'Reading $s^2-k^2$ as $s^2+k^2$ and landing on $\\sin$ instead of $\\sinh$.',
    sample: { form: 'sinh', coef: one(1), k: 4 },
  },
  {
    id: 'cosh',
    letter: 'g',
    name: 'Hyperbolic cosine',
    chipTex: '\\cosh kt',
    genericF: '\\cosh kt',
    genericS: '\\dfrac{s}{s^2-k^2}',
    note: 'Cosine’s row with a minus sign downstairs — $s$ on top, $s^2-k^2$ below.',
    confusion: 'Mixing up which of the four $s^2 \\pm k^2$ rows you are on.',
    sample: { form: 'cosh', coef: one(1), k: 2 },
  },
]

export const FORM_BY_ID = new Map(FORMS.map((f) => [f.id, f]))

export const formName = (id: FormId): string => FORM_BY_ID.get(id)?.name ?? id
