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
}

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

/** The t-domain function of a term with its coefficient stripped off. */
export function termBodyTex(term: Term): string {
  switch (term.form) {
    case 'one':
      return ''
    case 'power':
      return term.n === 1 ? 't' : `t^{${term.n}}`
    case 'exp':
      return `e^{${texRate(term.a!)}}`
    case 'sin':
      return `\\sin ${texRate(term.k!)}`
    case 'cos':
      return `\\cos ${texRate(term.k!)}`
    case 'sinh':
      return `\\sinh ${texRate(term.k!)}`
    case 'cosh':
      return `\\cosh ${texRate(term.k!)}`
  }
}

/** The t-domain term, split so a sum can fold the sign into its join. */
export function termFTex(term: Term): { neg: boolean; tex: string } {
  const body = termBodyTex(term)
  const mag = term.coef.n < 0 ? { ...term.coef, n: -term.coef.n } : term.coef
  return { neg: term.coef.n < 0, tex: texCoef(mag, body) }
}

/** `s^2+9`, `s-3`, `s^{4}` — the denominator this row contributes. */
export function termDenomTex(term: Term): string {
  switch (term.form) {
    case 'one':
      return 's'
    case 'power':
      return `s^{${term.n! + 1}}`
    case 'exp':
      return term.a! < 0 ? `s + ${-term.a!}` : `s - ${term.a!}`
    case 'sin':
    case 'cos':
      return `s^2 + ${term.k! ** 2}`
    case 'sinh':
    case 'cosh':
      return `s^2 - ${term.k! ** 2}`
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

/** The s-domain term, split so a sum can fold the sign into its join. */
export function termSTex(term: Term): { neg: boolean; tex: string } {
  const { coef, hasS } = termNumer(term)
  const denom = termDenomTex(term)
  const neg = coef.n < 0
  const mag = neg ? { ...coef, n: -coef.n } : coef
  if (isInt(mag)) {
    return { neg, tex: `\\dfrac{${hasS ? texCoef(mag, 's') : String(mag.n)}}{${denom}}` }
  }
  // A fractional multiplier reads better outside the fraction than on top of it.
  return {
    neg,
    tex: `\\frac{${mag.n}}{${mag.d}}\\cdot\\dfrac{${hasS ? 's' : '1'}}{${denom}}`,
  }
}

// ---------------------------------------------------------------------------
// Evaluation — used by the answer checker and by the corpus tests
// ---------------------------------------------------------------------------

export function evalTermF(term: Term, t: number): number {
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

export function evalTermS(term: Term, s: number): number {
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

/** Real poles of this row's transform, so the checker can sample away from them. */
export function termPoles(term: Term): number[] {
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
