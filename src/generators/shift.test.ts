import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { delayTex } from '../data/forms'
import { splitRich } from '../lib/rich'
import { checkScoped } from '../lib/check'
import { nextShiftProblem, shiftItemId, SHIFT_ITEMS, STEP_FN, type ShiftProblem } from './shift'

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

const everyTex = (p: ShiftProblem): string[] => [
  p.statementTex,
  p.prefixTex,
  p.answerTex,
  ...p.choices.map((c) => c.tex),
  ...p.derivation.flatMap((s) => (s.tex ? [s.tex] : [])),
]

function corpus(n: number): ShiftProblem[] {
  const out: ShiftProblem[] = []
  for (let seed = 1; seed <= n; seed++) {
    for (const theorem of ['first', 'second'] as const) {
      for (const direction of ['forward', 'inverse'] as const) {
        out.push(nextShiftProblem({ theorem, direction, seed }))
      }
    }
  }
  return out
}

const ALL = corpus(120)
const of = (t: 'first' | 'second', d: 'forward' | 'inverse') =>
  ALL.filter((p) => p.theorem === t && p.direction === d)

describe('translation problems', () => {
  it('renders every expression it puts on screen', () => {
    for (const p of ALL) {
      for (const tex of everyTex(p)) expect(renders(tex), tex).toBe(true)
      expect(richRenders(p.question)).toBe(true)
      expect(richRenders(p.hint), p.hint).toBe(true)
      expect(richRenders(p.syntaxNote)).toBe(true)
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

  it('never puts a shift on a row that would absorb it', () => {
    for (const p of ALL) {
      for (const term of p.terms) {
        if (term.shift) expect(['power', 'sin', 'cos', 'sinh', 'cosh']).toContain(term.form)
      }
    }
  })

  it('produces both the plain and the completed-square inverse', () => {
    const inverse = of('first', 'inverse')
    expect(inverse.filter((p) => p.completeSquare).length).toBeGreaterThan(10)
    expect(inverse.filter((p) => !p.completeSquare).length).toBeGreaterThan(10)
  })

  it('samples clear of every pole, including the ones the shift moved', () => {
    for (const p of ALL) {
      for (const point of p.points) {
        const v = p.target(point)
        expect(Number.isFinite(v), `${p.statementTex} at ${JSON.stringify(point)}`).toBe(true)
      }
      expect(p.points.length).toBeGreaterThanOrEqual(6)
    }
  })
})

const accepts = (p: ShiftProblem, raw: string) =>
  checkScoped(raw, { symbols: p.symbols, target: p.target, points: p.points })

describe('typed answers', () => {

  it('accepts the first theorem written out in s', () => {
    for (const p of of('first', 'forward').slice(0, 40)) {
      const term = p.terms[0]
      const a = term.shift!
      const u = `(s-(${a}))`
      const c = term.coef.n / term.coef.d
      const body =
        term.form === 'power'
          ? `${c}*${fact(term.n!)}/${u}^${term.n! + 1}`
          : term.form === 'sin'
            ? `${c}*${term.k}/(${u}^2+${term.k! ** 2})`
            : term.form === 'cos'
              ? `${c}*${u}/(${u}^2+${term.k! ** 2})`
              : term.form === 'sinh'
                ? `${c}*${term.k}/(${u}^2-${term.k! ** 2})`
                : `${c}*${u}/(${u}^2-${term.k! ** 2})`
      expect(accepts(p, body).ok, `${p.answerTex} :: ${body}`).toBe(true)
    }
  })

  it('accepts a delayed answer written with the unit step, however it is spelt', () => {
    for (const p of of('second', 'inverse').slice(0, 30)) {
      const term = p.terms[0]
      const d = term.delay!
      const c = term.coef.n / term.coef.d
      const shifted = `(t-${d})`
      const base =
        term.form === 'one'
          ? '1'
          : term.form === 'power'
            ? `${shifted}^${term.n}`
            : term.form === 'exp'
              ? `exp((${term.a})*${shifted})`
              : `${term.form}(${term.k}*${shifted})`
      for (const step of ['U', 'u', 'H', 'step']) {
        const raw = `(${c})*(${base})*${step}(${shifted})`
        expect(accepts(p, raw).ok, `${p.answerTex} :: ${raw}`).toBe(true)
      }
    }
  })

  it('rejects a delayed answer that forgets the step', () => {
    for (const p of of('second', 'inverse').slice(0, 30)) {
      const term = p.terms[0]
      const d = term.delay!
      const c = term.coef.n / term.coef.d
      const shifted = `(t-${d})`
      const base =
        term.form === 'one'
          ? '1'
          : term.form === 'power'
            ? `${shifted}^${term.n}`
            : term.form === 'exp'
              ? `exp((${term.a})*${shifted})`
              : `${term.form}(${term.k}*${shifted})`
      // Identical after the delay, but on for 0 <= t < d, where it must be off.
      expect(accepts(p, `(${c})*(${base})`).ok).toBe(false)
    }
  })

  it('rejects the other translation theorem\u2019s answer', () => {
    // The sharpest confusion in this section: an exponential in t translates the
    // transform, an exponential in s delays the function, and swapping them
    // must not be accepted by the checker.
    for (const p of of('first', 'forward').slice(0, 40)) {
      const term = p.terms[0]
      const a = term.shift!
      const otherTheorem = `exp(-${Math.abs(a)}*s)*(${plainTransform(term)})`
      expect(accepts(p, otherTheorem).ok, `${p.answerTex} :: ${otherTheorem}`).toBe(false)
    }
    for (const p of of('second', 'forward').slice(0, 40)) {
      const term = p.terms[0]
      const d = term.delay!
      // F(s-d) instead of e^{-ds}F(s).
      const otherTheorem = plainTransform(term, `(s-${d})`)
      expect(accepts(p, otherTheorem).ok, `${p.answerTex} :: ${otherTheorem}`).toBe(false)
    }
  })

  it('rejects the wrong sign on the translation', () => {
    for (const p of of('first', 'forward').slice(0, 40)) {
      const term = p.terms[0]
      const wrong = plainTransform(term, `(s+(${term.shift}))`)
      expect(accepts(p, wrong).ok, `${p.answerTex} :: ${wrong}`).toBe(false)
    }
  })
})

describe('the unit step used for grading', () => {
  it('is off before the delay and on from it', () => {
    expect(STEP_FN.U(-0.001)).toBe(0)
    expect(STEP_FN.U(0)).toBe(1)
    expect(STEP_FN.U(3)).toBe(1)
  })
})

/** A row's own transform, written in calculator syntax at a chosen variable. */
function plainTransform(term: { form: string; coef: { n: number; d: number }; n?: number; k?: number; a?: number }, v = 's'): string {
  const c = `(${term.coef.n}/${term.coef.d})`
  switch (term.form) {
    case 'one':
      return `${c}/${v}`
    case 'power':
      return `${c}*${fact(term.n!)}/(${v})^${term.n! + 1}`
    case 'exp':
      return `${c}/((${v})-(${term.a}))`
    case 'sin':
      return `${c}*${term.k}/((${v})^2+${term.k! ** 2})`
    case 'cos':
      return `${c}*(${v})/((${v})^2+${term.k! ** 2})`
    case 'sinh':
      return `${c}*${term.k}/((${v})^2-${term.k! ** 2})`
    default:
      return `${c}*(${v})/((${v})^2-${term.k! ** 2})`
  }
}

function fact(n: number): number {
  let out = 1
  for (let i = 2; i <= n; i++) out *= i
  return out
}

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

/**
 * Theorem 7.3.1 needs only the seven rows and a substitution; Theorem 7.3.2
 * needs the unit step, a function the table never mentions. Serving them as a
 * coin flip put $\mathcal{U}$ in front of people on their first question.
 */
describe('the s-axis theorem comes before the t-axis one', () => {
  const fresh = new Map<string, number>()
  const ready = new Map([[shiftItemId('first', 'forward'), 0.8]])
  const fluent = new Map(SHIFT_ITEMS.map((id) => [id, 0.9] as const))

  const served = (mastery: Map<string, number>, rung: number) => {
    const seen = { first: 0, second: 0 }
    for (let seed = 1; seed <= 120; seed++) {
      seen[nextShiftProblem({ theorem: 'auto', direction: 'auto', rung, mastery, seed }).theorem]++
    }
    return seen
  }

  it('never serves the unit step to someone with no evidence at all', () => {
    expect(served(fresh, 0).second).toBe(0)
  })

  it('holds it back at every rung, since a rung can be seeded from s-axis work alone', () => {
    for (const rung of [0, 1, 2, 3]) {
      expect(served(fresh, rung).second, `rung ${rung}`).toBe(0)
    }
  })

  it('offers it as soon as the s-axis shift holds, without a lesson to sit through', () => {
    expect(served(ready, 0).second).toBeGreaterThan(0)
  })

  it('does not slow down someone who already has both', () => {
    const seen = served(fluent, 3)
    expect(seen.first).toBeGreaterThan(0)
    expect(seen.second).toBeGreaterThan(0)
  })

  it('leaves the choice alone when the student asked for it themselves', () => {
    // `Choose mine` with the t-axis theorem selected is not a recommendation.
    const p = nextShiftProblem({ theorem: 'second', direction: 'forward', mastery: fresh, seed: 3 })
    expect(p.theorem).toBe('second')
  })

  it('states what the step function is while it is still new', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = nextShiftProblem({ theorem: 'second', direction: 'forward', rung: 0, seed })
      expect(p.stepNote, p.statementTex).toBeTruthy()
      // Concretely, at the delay in play — not in terms of an abstract a.
      const delay = /\\mathcal\{U\}\(t - (\d+)\)/.exec(p.statementTex)?.[1]
      if (delay) expect(p.stepNote!.tex).toContain(`t - ${delay}`)
      expect(renders(p.stepNote!.tex)).toBe(true)
      expect(richRenders(p.stepNote!.text)).toBe(true)
    }
  })

  it('drops the statement once the rung moves past it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(
        nextShiftProblem({ theorem: 'second', direction: 'forward', rung: 2, seed }).stepNote,
      ).toBeUndefined()
    }
  })

  it('carries no such note for the s-axis theorem, which needs none', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(
        nextShiftProblem({ theorem: 'first', direction: 'forward', rung: 0, seed }).stepNote,
      ).toBeUndefined()
    }
  })
})

describe('the delay factor prints its sign once', () => {
  it('renders a backwards-sign distractor as e^{as}, not as a double minus', () => {
    expect(delayTex(2)).toBe('e^{-2s}')
    // The distractor that gets the exponent's sign wrong is a real option a
    // student can pick, so it has to be legible as one.
    expect(delayTex(-2)).toBe('e^{2s}')
    expect(delayTex(-1)).toBe('e^{s}')
    for (const d of [-4, -3, -2, -1, 1, 2, 3, 4]) {
      expect(delayTex(d)).not.toContain('--')
      expect(renders(`\\dfrac{${delayTex(d)}}{s}`), `${d}`).toBe(true)
    }
  })
})
