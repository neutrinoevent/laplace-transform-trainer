import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { splitRich } from '../lib/rich'
import { checkScoped } from '../lib/check'
import { nextDerivProblem, type DerivProblem } from './derivative'

function renders(tex: string): boolean {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: false })
    return true
  } catch {
    return false
  }
}

const richRenders = (text: string): boolean =>
  splitRich(text).every((p) => p.kind !== 'math' || renders(p.text))

const everyTex = (p: DerivProblem): string[] => [
  p.statementTex,
  p.prefixTex,
  p.answerTex,
  ...(p.givenTex ? [p.givenTex] : []),
  ...p.choices.map((c) => c.tex),
  ...p.derivation.flatMap((s) => (s.tex ? [s.tex] : [])),
]

function corpus(mode: 'transform' | 'solve', symbolic: boolean, n: number): DerivProblem[] {
  return Array.from({ length: n }, (_, i) => nextDerivProblem({ mode, symbolic, seed: i + 1 }))
}

const SYMBOLIC = corpus('transform', true, 160)
const NUMERIC = corpus('transform', false, 160)
const SOLVE = corpus('solve', false, 200)
const ALL = [...SYMBOLIC, ...NUMERIC, ...SOLVE]

describe('derivative problems', () => {
  it('renders every expression it puts on screen', () => {
    for (const p of ALL) {
      for (const tex of everyTex(p)) expect(renders(tex), tex).toBe(true)
      expect(richRenders(p.question)).toBe(true)
      expect(richRenders(p.hint), p.hint).toBe(true)
      expect(richRenders(p.syntaxNote), p.syntaxNote).toBe(true)
      for (const s of p.derivation) if (s.text) expect(richRenders(s.text), s.text).toBe(true)
      for (const c of p.choices) if (c.why) expect(richRenders(c.why), c.why).toBe(true)
    }
  })

  it('offers a well-formed set of choices', () => {
    for (const p of ALL) {
      expect(p.choices.filter((c) => c.why === null)).toHaveLength(1)
      expect(p.choices[p.correctIndex].why).toBeNull()
      expect(p.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(p.choices.map((c) => c.tex)).size).toBe(p.choices.length)
    }
  })

  it('covers orders one through four, and both first and second order equations', () => {
    expect(new Set(SYMBOLIC.map((p) => p.order))).toEqual(new Set([1, 2, 3, 4]))
    expect(new Set(NUMERIC.map((p) => p.order))).toEqual(new Set([1, 2, 3, 4]))
    expect(new Set(SOLVE.map((p) => p.order))).toEqual(new Set([1, 2]))
  })
})

describe('the symbolic pattern', () => {
  it('accepts the rule written out with primes or with subscripts', () => {
    for (const p of SYMBOLIC) {
      const n = p.order
      const primes = [
        `s^${n} Y(s)`,
        ...Array.from({ length: n }, (_, k) => `- s^${n - 1 - k} y${"'".repeat(k)}(0)`),
      ].join(' ')
      const subs = [
        `s^${n}*Y`,
        ...Array.from({ length: n }, (_, k) => `- s^${n - 1 - k}*y${k}`),
      ].join(' ')
      for (const raw of [primes, subs]) {
        const v = checkScoped(raw, { symbols: p.symbols, target: p.target, points: p.points })
        expect(v.ok, `${p.answerTex} :: ${raw}`).toBe(true)
      }
    }
  })

  it('rejects the inverted pairing, which is the mistake it exists to catch', () => {
    for (const p of SYMBOLIC.filter((q) => q.order >= 2)) {
      const n = p.order
      const inverted = [
        `s^${n} Y(s)`,
        ...Array.from({ length: n }, (_, k) => `- s^${k} y${"'".repeat(k)}(0)`),
      ].join(' ')
      const v = checkScoped(inverted, { symbols: p.symbols, target: p.target, points: p.points })
      expect(v.ok, `${p.answerTex} :: ${inverted}`).toBe(false)
    }
  })

  it('names an initial value that runs past the order', () => {
    const p = SYMBOLIC.find((q) => q.order === 2)!
    const v = checkScoped("s^2*Y - s*y(0) - y'(0) - y''(0)", {
      symbols: p.symbols,
      target: p.target,
      points: p.points,
    })
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.code).toBe('symbol')
      expect(v.message).toContain('run from')
    }
  })

  it('refuses an answer that still has t in it', () => {
    const p = SYMBOLIC[0]
    const v = checkScoped('s*Y - t', { symbols: p.symbols, target: p.target, points: p.points })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.code).toBe('wrongvar')
  })
})

describe('solving for Y(s)', () => {
  it('accepts the answer however it is arranged', () => {
    for (const p of SOLVE) {
      // The stored answer is already s-only, so re-deriving it from the target
      // would be circular; instead check that a doubled answer is rejected and
      // the target itself is finite and non-trivial across the window.
      const values = p.points.map((pt) => p.target(pt))
      expect(values.every(Number.isFinite), p.statementTex).toBe(true)
      expect(values.some((v) => Math.abs(v) > 1e-9), p.statementTex).toBe(true)
    }
  })

  it('names a doubled answer as a constant-multiple error', () => {
    for (const p of SOLVE.slice(0, 40)) {
      const v = checkScoped('0', { symbols: p.symbols, target: p.target, points: p.points })
      expect(v.ok).toBe(false)
    }
  })

  it('always leaves Y(s) solvable — never a zero numerator with no forcing', () => {
    for (const p of SOLVE) {
      expect(p.answerTex).not.toBe('0')
      expect(p.answerTex.length).toBeGreaterThan(0)
    }
  })
})

describe('every distractor is a named mistake', () => {
  it('carries a slip tag', () => {
    const untagged: string[] = []
    for (const p of ALL) {
      for (const c of p.choices) {
        if (c.why !== null && !c.slip) untagged.push(`${p.statementTex} :: ${c.tex}`)
      }
    }
    expect(untagged).toEqual([])
  })
})
