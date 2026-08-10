/**
 * Grading typed answers.
 *
 * Nothing is compared as text. The submitted expression is parsed, sampled at a
 * spread of points, and matched against the exact target function — so any
 * algebraically equivalent form passes: `3/(s^2+9)` or `3/(s*s+9)`, `(1/3)sin3t`
 * or `sin(3t)/3`, terms in any order.
 *
 * Two shapes of answer go through the same machinery. Most are a function of one
 * variable. The transform-of-a-derivative answers are functions of several free
 * symbols at once — `s^2 Y(s) - s y(0) - y'(0)` — so the sampler walks a scope
 * rather than a number, and the symbols students write with parentheses and
 * primes are folded to plain names before parsing.
 *
 * The one verdict that earns special handling is a constant multiple of the
 * right answer. That is not a random error — it is precisely the fix-up this
 * trainer is about, so it gets named rather than lumped in with "wrong".
 */

import { parse, type MathNode } from 'mathjs/number'
import { frac, texFrac, type Frac } from './frac'

export type Variable = 's' | 't'

export type CheckCode = 'empty' | 'parse' | 'wrongvar' | 'symbol' | 'domain' | 'scaled' | 'wrong'

export type Verdict =
  | { ok: true }
  | { ok: false; code: CheckCode; message: string; ratio?: Frac | null }

/** What an answer is allowed to be written in terms of. */
export interface Symbols {
  /** The variable the answer is a function of; drives the wrong-variable message. */
  primary: Variable
  /** Every free symbol the answer may use, the primary included. */
  allowed: string[]
  /** How to print a symbol back in the "read as" line, e.g. `y1` → `y'(0)`. */
  display?: Record<string, string>
}

const single = (v: Variable): Symbols => ({ primary: v, allowed: [v] })

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'sinh', 'cosh', 'tanh',
  'exp', 'log', 'sqrt', 'abs', 'pow',
])

/**
 * Calculator and LaTeX habits into mathjs syntax. Students type `e^-2t`,
 * `sin 3t`, `\frac{1}{2}`, `2sin3t`, `Y(s)`, `y''(0)`; all of those should work.
 */
export function preprocess(raw: string, sym: Symbols | Variable): string {
  const symbols = typeof sym === 'string' ? single(sym) : sym
  const v = symbols.primary
  let s = raw.trim().replace(/\.\s*$/, '')
  // Unicode a copy-paste drags in
  s = s.replace(/[−–—]/g, '-').replace(/[·×∗]/g, '*').replace(/[’‘′]/g, "'")
  // A single level of \frac{a}{b} — enough for the fix-up constants students write
  s = s.replace(/\\?[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '(($1)/($2))')
  // Remaining LaTeX: drop control-sequence backslashes, braces become grouping
  s = s.replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'))
  s = s.replace(/\bln\b/g, 'log')

  // Initial values written the way the book writes them: y'''(0) before y''(0)
  // before y'(0), so the longer prime run always wins.
  if (symbols.allowed.some((a) => /^y\d$/.test(a))) {
    s = s.replace(/\by\s*('{0,4})\s*\(\s*0\s*\)/g, (_m, primes: string) => `y${primes.length}`)
  }
  // The transform itself: Y(s) and F(s) are names, not applications.
  s = s.replace(/\b([A-Z])\s*\(\s*s\s*\)/g, '$1')

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
  // s^2 Y, s Y — juxtaposition against a named symbol
  for (const name of symbols.allowed) {
    if (name === v) continue
    s = s.replace(new RegExp(`([a-zA-Z0-9)])\\s+(${name})\\b`, 'g'), `$1*$2`)
  }
  return s.trim()
}

interface Parsed {
  tex: string
  evaluate: (scope: Record<string, number>) => number
}

export function parseExpr(
  raw: string,
  sym: Symbols | Variable,
): Parsed | { error: string; code: CheckCode } {
  const symbols = typeof sym === 'string' ? single(sym) : sym
  const v = symbols.primary
  const cleaned = preprocess(raw, symbols)
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
  const allowed = new Set(symbols.allowed)
  let bad: string | null = null
  let usedOther = false
  node.traverse((n, _path, parent) => {
    if (n.type !== 'SymbolNode') return
    const name = (n as MathNode & { name: string }).name
    if (parent?.type === 'FunctionNode' && (parent as MathNode & { fn?: MathNode }).fn === n) {
      if (!FUNCTIONS.has(name)) bad ??= name
      return
    }
    if (allowed.has(name) || name === 'e' || name === 'pi') return
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
  if (bad) {
    // An initial value past the order of the derivative is a specific, common
    // slip — one term too many — and deserves better than "unknown symbol".
    const initials = symbols.allowed.filter((a) => /^y\d$/.test(a))
    if (/^y\d$/.test(bad) && initials.length) {
      const highest = initials[initials.length - 1]
      const shown = symbols.display?.[highest] ?? highest
      return {
        code: 'symbol',
        error: `There is no such initial value here — they run from $y(0)$ up to $${shown}$, one for each derivative.`,
      }
    }
    return { code: 'symbol', error: `Unknown symbol \`${bad}\`. Use \`${v}\` as the variable.` }
  }

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
  // Print the folded names back the way they were written.
  for (const [name, shown] of Object.entries(symbols.display ?? {}).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    tex = tex.split(name).join(shown)
  }

  return {
    tex,
    evaluate: (scope: Record<string, number>) => {
      try {
        const out = compiled.evaluate(scope)
        return typeof out === 'number' ? out : NaN
      } catch {
        return NaN
      }
    },
  }
}

/** Live "read as" line under the input box. */
export function previewOf(
  raw: string,
  sym: Symbols | Variable,
): { tex: string } | { error: string } | null {
  if (!raw.trim()) return null
  const parsed = parseExpr(raw, sym)
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

// Offsets spread so no two symbols ever move together, which would let a wrong
// answer that confuses two of them slip through.
const SPREAD = [1.0, 0.61, -0.43, 0.29, -0.19, 0.13, 0.07]

/**
 * Scopes to test a multi-symbol answer at. The primary variable walks its own
 * pole-safe ladder; every other symbol walks a different one, so an answer that
 * pairs the wrong symbol with the wrong power of s cannot coincide with the
 * right one.
 */
export function scopePoints(symbols: Symbols, poles: number[] = []): Record<string, number>[] {
  const xs = samplePoints(symbols.primary, poles)
  const others = symbols.allowed.filter((a) => a !== symbols.primary)
  return xs.map((x, i) => {
    const scope: Record<string, number> = { [symbols.primary]: x }
    others.forEach((name, j) => {
      scope[name] = 1 + SPREAD[j % SPREAD.length] * (i + 1) + 0.31 * j
    })
    return scope
  })
}

/** Nearest simple rational to a ratio, for naming a fix-up the student missed. */
export function rationalize(x: number): Frac | null {
  for (let d = 1; d <= 24; d++) {
    const n = Math.round(x * d)
    if (n !== 0 && Math.abs(x - n / d) < 1e-9 * Math.max(1, Math.abs(x))) return frac(n, d)
  }
  return null
}

/** Compare two sampled vectors, naming a clean constant multiple when it is one. */
function verdictFor(want: number[], got: number[], v: Variable): Verdict {
  const scale = Math.max(...want.map(Math.abs), 1e-12)
  const err = Math.max(...want.map((b, i) => Math.abs(got[i] - b) / (Math.abs(b) + 0.05 * scale)))
  if (err < 1e-6) return { ok: true }

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

export interface CheckOptions {
  variable: Variable
  target: (x: number) => number
  poles?: number[]
}

export function checkAnswer(raw: string, opts: CheckOptions): Verdict {
  return checkScoped(raw, {
    symbols: single(opts.variable),
    target: (scope) => opts.target(scope[opts.variable]),
    poles: opts.poles,
  })
}

export interface ScopedOptions {
  symbols: Symbols
  target: (scope: Record<string, number>) => number
  poles?: number[]
  /** Explicit scopes; derived from the symbol set when absent. */
  points?: Record<string, number>[]
  /** Wording for a plainly wrong answer, when the default does not fit. */
  wrongMessage?: string
}

export function checkScoped(raw: string, opts: ScopedOptions): Verdict {
  const { symbols } = opts
  if (!raw.trim()) return { ok: false, code: 'empty', message: 'Enter an answer first.' }

  const parsed = parseExpr(raw, symbols)
  if ('error' in parsed) return { ok: false, code: parsed.code, message: parsed.error }

  const points = opts.points ?? scopePoints(symbols, opts.poles)
  const want: number[] = []
  const got: number[] = []
  for (const scope of points) {
    const b = opts.target(scope)
    const a = parsed.evaluate(scope)
    if (!Number.isFinite(b)) continue
    if (!Number.isFinite(a)) {
      return {
        ok: false,
        code: 'domain',
        message: `That expression could not be evaluated at \`${symbols.primary} = ${scope[symbols.primary]}\` — check the syntax.`,
      }
    }
    want.push(b)
    got.push(a)
  }
  if (want.length < 4) {
    return {
      ok: false,
      code: 'domain',
      message: 'That expression could not be evaluated. Check the syntax.',
    }
  }

  const verdict = verdictFor(want, got, symbols.primary)
  if (!verdict.ok && verdict.code === 'wrong' && opts.wrongMessage) {
    return { ...verdict, message: opts.wrongMessage }
  }
  return verdict
}
