import type { FormId, Term } from '../data/forms'
import type { SlipId } from '../data/slips'
import type { Facet } from '../lib/facets'
import type { Variable } from '../lib/check'

export type Direction = 'forward' | 'inverse'

export const DIRECTIONS: Direction[] = ['forward', 'inverse']

/** Progress is tracked per row *per direction* — reading a row backwards is a
 *  separate skill from reading it forwards, and the fix-up lives only on one side. */
export const itemId = (form: FormId, dir: Direction): string => `${form}:${dir}`

export interface Step {
  label: string
  tex?: string
  /** Rich text: `$math$` and `` `code` `` spans are rendered. */
  text?: string
}

export interface Choice {
  tex: string
  /** Why someone would pick this, and what it actually is. Null for the right one. */
  why: string | null
  /**
   * The named slip this option embodies, so the same mistake made across
   * different rows is counted once rather than as several weak rows.
   */
  slip?: SlipId
  /**
   * The option as a function, where it was built from terms. A typed wrong
   * answer that matches one of these is the same mistake, and gets the same
   * explanation as if it had been picked from a list.
   */
  value?: (scope: Record<string, number>) => number
}

export interface Problem {
  direction: Direction
  /** Rows exercised, primary first. */
  forms: FormId[]
  itemIds: string[]
  /** The operator applied to the given expression, e.g. `\mathcal{L}\{4t^3\}`. */
  promptTex: string
  /** The problem as posed: the prompt with `= ?` on the end. */
  statementTex: string
  /** One-line instruction under the statement. */
  question: string
  /** Which letter the typed answer must be in. */
  variable: Variable
  /** Exact target for the checker. */
  target: (x: number) => number
  poles: number[]
  answerTex: string
  choices: Choice[]
  correctIndex: number
  hint: string
  derivation: Step[]
  /** True when the row's own constant has to be manufactured. */
  fixup: boolean
  /** The harder variants this question actually exercised. */
  facets: Facet[]
  /** Terms behind the problem, kept for tests and the match board. */
  terms: Term[]
}
