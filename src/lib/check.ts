/**
 * Grading typed answers.
 *
 * Nothing is compared as text. The submitted expression is parsed, sampled at a
 * spread of points, and matched against the exact target function — so any
 * algebraically equivalent form passes: `3/(s^2+9)` or `3/(s*s+9)`, `(1/3)sin3t`
 * or `sin(3t)/3`, terms in any order.
 *
 * The one verdict that earns special handling is a constant multiple of the
 * right answer. That is not a random error — it is precisely the fix-up this
 * whole trainer is about, so it gets named rather than lumped in with "wrong".
 */

import { parse, type MathNode } from 'mathjs/number'
import { frac, texFrac, type Frac } from './frac'

export type Variable = 's' | 't'

export type CheckCode = 'empty' | 'parse' | 'wrongvar' | 'symbol' | 'domain' | 'scaled' | 'wrong'

export type Verdict =
  | { ok: true }
  | { ok: false; code: CheckCode; message: string; ratio?: Frac | null }

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'sinh', 'cosh', 'tanh',
  'exp', 'log', 'sqrt', 'abs', 'pow',
])

/**
 * Calculator and LaTeX habits into mathjs syntax. Students type `e^-2t`,
 * `sin 3t`, `\frac{1}{2}`, `2sin3t`; all of those should just work.
 */
export function preprocess(raw: string, v: Variable): string {
  let s = raw.trim().replace(/\.\s*$/, '')
  // Unicode a copy-paste drags in
  s = s.replace(/[−–—]/g, '-').replace(/[·×∗]/g, '*')
  // A single level of \frac{a}{b} — enough for the fix-up constants students write
  s = s.replace(/\\?[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
  // Remaining LaTeX: drop control-sequence backslashes, braces become grouping
  s = s.replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'))
  s = s.replace(/\bln\b/g, 'log')
  // e^-2t and e^3t, where the exponent was never parenthesized
  s = s.replace(/\be\s*\^\s*(-?\s*\d*\.?\d*\s*\*?\s*[a-zA-Z])/g, 'e^($1)')
  // sin 3t, cos2t, sinh t — bind the bare argument to the function. The
  // lookahead stops `sinh(...)` from backtracking into `sin` and eating the h.
  s = s.replace(
    /\b(sinh|cosh|tanh|sin|cos|tan)(?![a-zA-Z])\s*(-?\s*\d*\.?\d*\s*\*?\s*[a-zA-Z])/g,
    '$1($2)',
  )
  // Implicit multiplication
  s = s.replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2') // 2t, 3(, 4e
  s = s.replace(/\)\s*([a-zA-Z0-9(])/g, ')*$1') // )(, )t, )3
  s = s.replace(new RegExp(`\\b${v}\\s*\\(`, 'g'), `${v}*(`) // s(s+1)
  return s.trim()
}

interface Parsed {
  tex: string
  evaluate: (x: number) => number
}

export function parseExpr(raw: string, v: Variable): Parsed | { error: string; code: CheckCode } {
  const cleaned = preprocess(raw, v)
  if (!cleaned) return { error: 'Enter an expression.', code: 'empty' }

  let node: MathNode
  try {
    node = parse(cleaned)
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'That expression could not be read.',
      code: 'parse',
    }
  }

  const other: Variable = v === 's' ? 't' : 's'
  let bad: string | null = null
  let usedOther = false
  node.traverse((n, _path, parent) => {
    if (n.type !== 'SymbolNode') return
    const name = (n as MathNode & { name: string }).name
    if (parent?.type === 'FunctionNode' && (parent as MathNode & { fn?: MathNode }).fn === n) {
      if (!FUNCTIONS.has(name)) bad ??= name
      return
    }
    if (name === v || name === 'e' || name === 'pi') return
    if (name === other) usedOther = true
    else bad ??= name
  })
  if (usedOther) {
    return {
      code: 'wrongvar',
      error:
        v === 's'
          ? 'A transform is a function of $s$ — there should be no $t$ left in the answer.'
          : 'An inverse transform is a function of $t$ — there should be no $s$ left in the answer.',
    }
  }
  if (bad) return { code: 'symbol', error: `Unknown symbol \`${bad}\`. Use \`${v}\` as the variable.` }

  let compiled: { evaluate: (scope: Record<string, number>) => unknown }
  try {
    compiled = node.compile()
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'That expression could not be read.',
      code: 'parse',
    }
  }

  let tex: string
  try {
    tex = node.toTex({ parenthesis: 'auto', implicit: 'hide' })
  } catch {
    tex = cleaned
  }

  return {
    tex,
    evaluate: (x: number) => {
      try {
        const out = compiled.evaluate({ [v]: x })
        return typeof out === 'number' ? out : NaN
      } catch {
        return NaN
      }
    },
  }
}

/** Live "read as" line under the input box. */
export function previewOf(raw: string, v: Variable): { tex: string } | { error: string } | null {
  if (!raw.trim()) return null
  const parsed = parseExpr(raw, v)
  return 'error' in parsed ? { error: parsed.error } : { tex: parsed.tex }
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

const T_POINTS = [0.11, 0.29, 0.47, 0.68, 0.93, 1.17, 1.44, 1.73, 2.05, 2.38]
const S_CANDIDATES = [0.37, 0.83, 1.4, 2.15, 3.3, 4.6, 5.9, 7.4, 8.7, 10.3, 13.1, 16.7, 21.3, 27.9]

/** Points to test at: for s, everything comfortably clear of the poles. */
export function samplePoints(v: Variable, poles: number[] = []): number[] {
  if (v === 't') return T_POINTS
  return S_CANDIDATES.filter((s) => poles.every((p) => Math.abs(s - p) > 0.75))
}

/** Nearest simple rational to a ratio, for naming a fix-up the student missed. */
export function rationalize(x: number): Frac | null {
  for (let d = 1; d <= 24; d++) {
    const n = Math.round(x * d)
    if (n !== 0 && Math.abs(x - n / d) < 1e-9 * Math.max(1, Math.abs(x))) return frac(n, d)
  }
  return null
}

export interface CheckOptions {
  variable: Variable
  target: (x: number) => number
  poles?: number[]
}

export function checkAnswer(raw: string, opts: CheckOptions): Verdict {
  const { variable: v } = opts
  if (!raw.trim()) return { ok: false, code: 'empty', message: 'Enter an answer first.' }

  const parsed = parseExpr(raw, v)
  if ('error' in parsed) return { ok: false, code: parsed.code, message: parsed.error }

  const xs = samplePoints(v, opts.poles)
  const want: number[] = []
  const got: number[] = []
  for (const x of xs) {
    const b = opts.target(x)
    const a = parsed.evaluate(x)
    if (!Number.isFinite(b)) continue
    if (!Number.isFinite(a)) {
      return {
        ok: false,
        code: 'domain',
        message: `That expression could not be evaluated at \`${v} = ${x}\` — check the syntax.`,
      }
    }
    want.push(b)
    got.push(a)
  }
  if (want.length < 4) {
    return { ok: false, code: 'domain', message: 'That expression could not be evaluated. Check the syntax.' }
  }

  const scale = Math.max(...want.map(Math.abs), 1e-12)
  const err = Math.max(...want.map((b, i) => Math.abs(got[i] - b) / (Math.abs(b) + 0.05 * scale)))
  if (err < 1e-6) return { ok: true }

  // A clean constant multiple of the right answer is the fix-up going missing.
  // The ratio is fitted rather than read off one point, so it survives answers
  // whose values span orders of magnitude across the window.
  const dot = want.reduce((acc, b, i) => acc + b * got[i], 0)
  const norm = want.reduce((acc, b) => acc + b * b, 0)
  const r = norm > 0 ? dot / norm : 0
  if (Number.isFinite(r) && Math.abs(r) > 1e-9) {
    const floor = 1e-12 * scale
    const proportional = want.every(
      (b, i) => Math.abs(got[i] - r * b) <= 1e-7 * (Math.abs(got[i]) + Math.abs(r * b)) + floor,
    )
    if (proportional) {
      const q = rationalize(r)
      return {
        ok: false,
        code: 'scaled',
        ratio: q,
        message: q
          ? `Right function, wrong constant — your answer is $${texFrac(q)}$ times the correct one.`
          : 'Right function, wrong constant out front.',
      }
    }
  }

  return {
    ok: false,
    code: 'wrong',
    message:
      v === 's'
        ? 'That is not the transform of the given function.'
        : 'That function does not have the given transform.',
  }
}
