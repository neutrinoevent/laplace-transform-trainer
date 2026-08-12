/**
 * Theorem 7.4.1, checked against the definition of the transform rather than
 * against the differentiation that produced each answer.
 */

import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { splitRich } from '../lib/rich'
import { DTRANSFORM_ITEMS, nextDtProblem, type DtProblem } from './dtransform'

const ALL: DtProblem[] = Array.from({ length: 260 }, (_, i) =>
  nextDtProblem({ seed: i + 1, rung: i % 3 }),
)

const renders = (tex: string): boolean => {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: false })
    return true
  } catch {
    return false
  }
}
const richRenders = (t: string): boolean =>
  splitRich(t).every((p) => p.kind !== 'math' || renders(p.text))

/** L{f}(s) straight off the definition. */
function transform(f: (t: number) => number, s: number, T = 40, N = 160000): number {
  const h = T / N
  let sum = 0
  for (let i = 0; i <= N; i++) {
    const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2
    sum += w * Math.exp(-s * i * h) * f(i * h)
  }
  return (sum * h) / 3
}

describe('problems for Theorem 7.4.1', () => {
  it('renders everything it prints', () => {
    for (const p of ALL) {
      for (const tex of [p.statementTex, p.answerTex, p.prefixTex]) {
        expect(renders(tex), tex).toBe(true)
      }
      for (const c of p.choices) expect(renders(c.tex), c.tex).toBe(true)
      for (const step of p.derivation) {
        if (step.tex) expect(renders(step.tex), step.tex).toBe(true)
        expect(richRenders(step.text ?? ''), step.text).toBe(true)
      }
      expect(richRenders(p.hint), p.hint).toBe(true)
      for (const c of p.choices) if (c.why) expect(richRenders(c.why), c.why).toBe(true)
    }
  })

  it('poses both directions, and both powers of t', () => {
    expect(new Set(ALL.map((p) => p.direction)).size).toBe(2)
    expect(new Set(ALL.map((p) => p.power))).toEqual(new Set([1, 2]))
  })

  it('offers a real question every time', () => {
    for (const p of ALL) {
      expect(p.choices.length).toBeGreaterThan(2)
      expect(p.choices[p.correctIndex].why).toBeNull()
      for (const c of p.choices) {
        if (c.why === null) continue
        expect(c.slip, c.tex).toBeTruthy()
        expect(typeof c.value, c.tex).toBe('function')
      }
    }
  })

  it('offers no distractor that is secretly right', () => {
    for (const p of ALL) {
      const at = p.symbols.primary === 's' ? [8.3, 12.7, 17.1] : [0.4, 1.3, 2.6]
      for (const c of p.choices) {
        if (c.why === null) continue
        const differs = at.some((x) => {
          const want = p.target({ [p.symbols.primary]: x })
          const got = c.value!({ [p.symbols.primary]: x })
          return !Number.isFinite(got) || Math.abs(got - want) > 1e-7 * (1 + Math.abs(want))
        })
        expect(differs, `${p.statementTex} :: ${c.tex}`).toBe(true)
      }
    }
  })

  /**
   * The real check: the two sides of the pair must actually be a transform
   * pair, whichever way round the problem happens to be posed. The t-side is
   * `t^n` times a row and is not in doubt; the s-side is the theorem's output,
   * and this is what would catch a wrong sign or a missed differentiation.
   */
  it('poses a genuine transform pair, by numerical integration', () => {
    for (const p of ALL.slice(0, 60)) {
      for (const s of [7.5, 10.5]) {
        const want = p.transformValue(s)
        const got = transform(p.timeValue, s)
        expect(Math.abs(got - want), `${p.statementTex} at s=${s}`).toBeLessThan(
          3e-6 * (1 + Math.abs(want)),
        )
      }
    }
  })

  it('agrees with Theorem 7.3.1 where the two overlap', () => {
    // The book's NOTE: L{te^{3t}} is 1/(s-3)^2 by either route.
    const p = Array.from({ length: 400 }, (_, i) =>
      nextDtProblem({ seed: i + 1, direction: 'forward', rung: 1 }),
    ).find((q) => /e\^\{/.test(q.statementTex) && q.power === 1)
    expect(p, 'no exponential problem drawn').toBeTruthy()
    for (const s of [6, 9.5]) {
      // 7.3.1 says the transform of t e^{at} is the transform of t read at s-a.
      const a = Number(/e\^\{(-?)(\d*)t\}/.exec(p!.statementTex)!.slice(1).join('') || '1')
      expect(p!.transformValue(s)).toBeCloseTo(1 / (s - a) ** 2, 8)
    }
  })
})

describe('the rungs serve what they describe', () => {
  it('introduces the theorem forwards before asking it backwards', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const p = nextDtProblem({ seed, rung: 0 })
      expect(p.direction, p.statementTex).toBe('forward')
      expect(p.power, p.statementTex).toBe(1)
    }
  })

  it('keeps one factor of t until the rung that adds a second', () => {
    for (let seed = 1; seed <= 150; seed++) {
      for (const rung of [0, 1]) {
        expect(nextDtProblem({ seed, rung }).power, `rung ${rung}`).toBe(1)
      }
    }
    const top = Array.from({ length: 150 }, (_, i) => nextDtProblem({ seed: i + 1, rung: 2 }))
    expect(top.some((p) => p.power === 2)).toBe(true)
    expect(top.some((p) => p.power === 1)).toBe(true)
  })

  it('does not let a coverage debt drag the harder half below its rung', () => {
    // Owed, but at a rung that has not introduced it: the rung wins.
    for (let seed = 1; seed <= 80; seed++) {
      for (const rung of [0, 1]) {
        const p = nextDtProblem({ seed, rung, uncovered: new Set(DTRANSFORM_ITEMS) })
        expect(p.power, `rung ${rung}`).toBe(1)
      }
    }
    // At the top rung it is insisted on.
    for (let seed = 1; seed <= 80; seed++) {
      const p = nextDtProblem({ seed, rung: 2, uncovered: new Set(DTRANSFORM_ITEMS) })
      expect(p.power).toBe(2)
    }
  })

  it('never prints a t to the power nothing', () => {
    for (const p of ALL) {
      for (const c of p.choices) expect(c.tex).not.toContain('t^{0}')
    }
  })
})
