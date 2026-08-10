import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { splitRich } from '../lib/rich'
import { checkScoped } from '../lib/check'
import { nextShiftProblem, STEP_FN, type ShiftProblem } from './shift'

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
