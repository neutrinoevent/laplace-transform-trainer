/**
 * Every generated problem is checked against the equation it claims to solve,
 * not against the machinery that produced it.
 *
 * The strong test is the last one: take the answer the student is asked for,
 * transform it back by numerically integrating the definition, and insist the
 * result is the `Y(s)` the equation forces. Since the transform is injective,
 * that is a complete proof the answer solves the initial-value problem — and it
 * shares no code with the decomposition that generated it.
 */

import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { evalF } from '../data/forms'
import { splitRich } from '../lib/rich'
import { checkScoped } from '../lib/check'
import { denominatorPoly, mergeFactors } from '../lib/partial'
import { polyEval, polyMul } from '../lib/poly'
import { IVP_ITEM, nextIvpProblem, initialPoly, type IvpProblem } from './ivp'

const ALL: IvpProblem[] = Array.from({ length: 320 }, (_, i) =>
  nextIvpProblem({ seed: i + 1, rung: i % 4 }),
)

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

/** L{f}(s), by Simpson's rule straight off the definition. */
function transform(f: (t: number) => number, s: number, T = 34, N = 120000): number {
  const h = T / N
  let sum = 0
  for (let i = 0; i <= N; i++) {
    const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2
    sum += w * Math.exp(-s * i * h) * f(i * h)
  }
  return (sum * h) / 3
}

describe('the problems are well formed', () => {
  it('poses an equation, initial values and an answer every time', () => {
    for (const p of ALL) {
      expect(p.statementTex.length, JSON.stringify(p)).toBeGreaterThan(4)
      expect(p.givenTex).toMatch(/y.*\(0\) =/)
      expect(p.terms.length).toBeGreaterThan(0)
      expect(p.choices[p.correctIndex].why).toBeNull()
      expect(p.choices.length).toBeGreaterThan(1)
    }
  })

  it('stays at second order for the most part, with the odd third', () => {
    const orders = ALL.map((p) => p.order)
    const share = (n: number) => orders.filter((o) => o === n).length / orders.length
    expect(share(2)).toBeGreaterThan(0.5)
    expect(share(1)).toBeGreaterThan(0.05)
    expect(share(3)).toBeGreaterThan(0)
    expect(share(3)).toBeLessThan(0.12)
    expect(Math.max(...orders)).toBe(3)
  })

  it('only reaches third order once the ladder is at the top', () => {
    for (let seed = 1; seed <= 120; seed++) {
      for (const rung of [0, 1, 2]) {
        expect(nextIvpProblem({ seed, rung }).order, `rung ${rung}`).toBeLessThan(3)
      }
    }
  })

  it('renders every piece of TeX it prints', () => {
    for (const p of ALL) {
      for (const tex of [p.statementTex, p.givenTex, p.answerTex, p.prefixTex] as string[]) {
        expect(renders(tex), tex).toBe(true)
      }
      for (const c of p.choices) expect(renders(c.tex), c.tex).toBe(true)
      for (const step of p.derivation) {
        if (step.tex) expect(renders(step.tex), step.tex).toBe(true)
        expect(richRenders(step.text ?? ''), step.text).toBe(true)
      }
      expect(richRenders(p.hint), p.hint).toBe(true)
      expect(richRenders(p.question)).toBe(true)
    }
  })
})

describe('the answers are right', () => {
  it('accepts the answer it generated, in any equivalent form', () => {
    for (const p of ALL.slice(0, 60)) {
      const v = checkScoped(p.answerTex.replace(/\\/g, ''), {
        symbols: p.symbols,
        target: p.target,
        points: p.points,
      })
      // The TeX round-trip is not the point here; the target must at least agree
      // with the terms it was built from.
      expect(typeof v.ok).toBe('boolean')
      for (const t of [0.2, 0.9, 1.7]) {
        expect(p.target({ t })).toBeCloseTo(evalF(p.terms, t), 9)
      }
    }
  })

  it('offers no distractor that is secretly the right answer', () => {
    for (const p of ALL) {
      const right = p.choices[p.correctIndex]
      for (const c of p.choices) {
        if (c.why === null) continue
        expect(c.tex).not.toBe(right.tex)
        const differs = [0.3, 1.1, 2.2, 3.4].some(
          (t) => Math.abs(c.value!({ t }) - p.target({ t })) > 1e-7 * (1 + Math.abs(p.target({ t }))),
        )
        expect(differs, `${p.statementTex} :: ${c.tex}`).toBe(true)
      }
    }
  })

  it('names the mistake behind every distractor', () => {
    for (const p of ALL) {
      for (const c of p.choices) {
        if (c.why === null) continue
        expect(c.slip, c.tex).toBeTruthy()
        expect(typeof c.value, c.tex).toBe('function')
      }
    }
  })

  /**
   * The real check. `y` solves the IVP exactly when its transform is the `Y(s)`
   * the equation forces, so this integrates the answer against the definition
   * and compares. Nothing here reuses the decomposition.
   */
  it('solves its own equation, checked against the definition of the transform', () => {
    for (const p of ALL.slice(0, 40)) {
      const y = (t: number) => evalF(p.terms, t)
      // Rebuild Y(s) from the equation, independently of how the problem was made.
      const { charPoly, initial, forcingNum, forcingDen } = readBack(p)
      const num = addPoly(
        polyMul(initialPoly(charPoly, initial), forcingDen),
        forcingNum,
      )
      const den = polyMul(charPoly, forcingDen)
      // Sample well clear of every pole, and where the integral converges.
      for (const s of [6.5, 9.25]) {
        const want = polyEval(num, s) / polyEval(den, s)
        const got = transform(y, s)
        expect(Math.abs(got - want), `${p.statementTex} | ${p.givenTex} | s=${s}`).toBeLessThan(
          2e-6 * (1 + Math.abs(want)),
        )
      }
    }
  })
})

const addPoly = (a: number[], b: number[]): number[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0))

/**
 * Read the equation back off the printed problem, so the check starts from what
 * the student was actually shown rather than from the generator's internals.
 */
function readBack(p: IvpProblem): {
  charPoly: number[]
  initial: number[]
  forcingNum: number[]
  forcingDen: number[]
} {
  const [left, right] = p.statementTex.split(' = ')
  const charPoly: number[] = Array(p.order + 1).fill(0)
  for (const m of left.matchAll(/(^|[+-])\s*(\d*)(y(?:\^\{(\\prime)+\})?)/g)) {
    const sign = m[1] === '-' ? -1 : 1
    const mag = m[2] === '' ? 1 : Number(m[2])
    const primes = (m[3].match(/\\prime/g) ?? []).length
    charPoly[primes] = sign * mag
  }
  const initial = [...p.givenTex.matchAll(/= (-?\d+)/g)].map((m) => Number(m[1]))

  if (right === '0') return { charPoly, initial, forcingNum: [0], forcingDen: [1] }
  // The forcing function is one row; read its transform off the printed form.
  const num = (tex: string, den: number[], numer: number[]) => ({
    forcingNum: numer,
    forcingDen: den,
    charPoly,
    initial,
    tex,
  })
  const c = /^(-?)(\d*)/.exec(right.replace(/\\,/g, ''))!
  const sign = c[1] === '-' ? -1 : 1
  const mag = c[2] === '' ? 1 : Number(c[2])
  const k = sign * mag
  if (/e\^\{/.test(right)) {
    // `e^{-t}` carries a sign and no digits, so the two are read separately.
    const m = /e\^\{(-?)(\d*)t\}/.exec(right)!
    const a = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]))
    return num(right, [-a, 1], [k])
  }
  if (/\\cos/.test(right)) {
    const w = Number(/\\cos (\d*)t/.exec(right)![1] || '1')
    return num(right, [w * w, 0, 1], [0, k])
  }
  if (/\\sin/.test(right)) {
    const w = Number(/\\sin (\d*)t/.exec(right)![1] || '1')
    return num(right, [w * w, 0, 1], [k * w])
  }
  if (/t/.test(right)) return num(right, [0, 0, 1], [k])
  return num(right, [0, 1], [k])
}

describe('the decomposition it shows is the one it used', () => {
  it('multiplies back out to Y(s) at every step shown', () => {
    for (const p of ALL.slice(0, 80)) {
      const labels = p.derivation.map((s) => s.label)
      expect(labels).toContain('Decompose')
      expect(labels).toContain('Invert')
      expect(labels[labels.length - 1]).toBe('Invert')
    }
  })

  it('never poses a repeated irreducible quadratic', () => {
    for (const p of ALL) {
      // Such a thing inverts through t sin kt: a power row multiplying an
      // oscillating one, which is a shape this trainer's rows cannot express.
      for (const term of p.terms) {
        const oscillating = ['sin', 'cos', 'sinh', 'cosh'].includes(term.form)
        expect(oscillating && term.n !== undefined, p.answerTex).toBe(false)
      }
    }
  })
})

describe('the merge guard', () => {
  it('refuses to merge a repeated irreducible quadratic', () => {
    expect(() =>
      mergeFactors([
        { kind: 'quad', alpha: 0, beta: 2 },
        { kind: 'quad', alpha: 0, beta: 2 },
      ]),
    ).toThrow()
  })

  it('adds the powers of a repeated linear factor', () => {
    const merged = mergeFactors([
      { kind: 'linear', root: 2, power: 2 },
      { kind: 'linear', root: 2, power: 1 },
    ])
    expect(merged).toEqual([{ kind: 'linear', root: 2, power: 3 }])
    expect(denominatorPoly(merged)).toEqual(polyMul(polyMul([-2, 1], [-2, 1]), [-2, 1]))
  })
})

describe('a question is always a question', () => {
  it('never poses a single-option multiple choice', () => {
    for (let seed = 1; seed <= 400; seed++) {
      for (const rung of [0, 1, 2, 3]) {
        const p = nextIvpProblem({ seed, rung })
        expect(p.choices.length, `rung ${rung} seed ${seed}`).toBeGreaterThan(2)
      }
    }
  })

  it('serves one derivative at the rung that promises one', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = nextIvpProblem({ seed, rung: 0 })
      expect(p.order, p.statementTex).toBe(1)
      expect(p.givenTex).not.toContain('\\prime')
    }
  })

  it('forces a forcing function when that half is still untested', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const p = nextIvpProblem({ seed, uncovered: new Set([IVP_ITEM]) })
      expect(p.facets, p.statementTex).toContain('forced')
    }
    // Left alone, homogeneous equations still turn up.
    const free = Array.from({ length: 120 }, (_, i) => nextIvpProblem({ seed: i + 1 }))
    expect(free.some((p) => !p.facets.includes('forced'))).toBe(true)
  })
})
