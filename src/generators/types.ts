import type { FormId, Term } from '../data/forms'
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
  /** Terms behind the problem, kept for tests and the match board. */
  terms: Term[]
}
