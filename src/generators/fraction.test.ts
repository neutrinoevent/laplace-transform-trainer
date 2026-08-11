/**
 * The load-bearing check for partial fractions is that the decomposition and
 * the fraction are the same function, and that the answer's transform is that
 * fraction. Everything else — the shapes, the constants, the worked steps —
 * hangs off those two identities, so both are verified numerically on every
 * generated problem rather than assumed from the construction.
 */

import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { evalS } from '../data/forms'
import { checkScoped } from '../lib/check'
import { polyEval } from '../lib/poly'
import { splitRich } from '../lib/rich'
import {
  denominatorPoly,
  nextFractionProblem,
  numeratorPoly,
  pieceTerms,
  type FractionKind,
  type FractionProblem,
} from './fraction'

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

const everyTex = (p: FractionProblem): string[] => [
  p.statementTex,
  p.answerTex,
  ...(p.prefixTex ? [p.prefixTex] : []),
  ...p.choices.map((c) => c.tex),
  ...p.derivation.flatMap((s) => (s.tex ? [s.tex] : [])),
]

const sample = (kind: FractionKind, n = 150): FractionProblem[] =>
  Array.from({ length: n }, (_, i) => nextFractionProblem({ kind, seed: i + 1 }))

const SQUARE = sample('square')
const FORM = sample('form')
const LINEAR = sample('linear')
const HARD = sample('hard', 250)
const ALL = [...SQUARE, ...FORM, ...LINEAR, ...HARD]

describe('everything it puts on screen', () => {
  it('renders', () => {
    for (const p of ALL) {
      for (const tex of everyTex(p)) expect(renders(tex), tex).toBe(true)
      expect(richRenders(p.question)).toBe(true)
      expect(richRenders(p.hint), p.hint).toBe(true)
      for (const s of p.derivation) if (s.text) expect(richRenders(s.text), s.text).toBe(true)
      for (const c of p.choices) if (c.why) expect(richRenders(c.why), c.why).toBe(true)
    }
  })

  it('offers a well-formed set of choices', () => {
    for (const p of ALL) {
      expect(p.choices.filter((c) => c.why === null), p.statementTex).toHaveLength(1)
      expect(p.choices[p.correctIndex].why).toBeNull()
      expect(p.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(p.choices.map((c) => c.tex)).size).toBe(p.choices.length)
    }
  })
})

describe('the decomposition is the fraction', () => {
  // Rebuilt here from the exported primitives, so the identity is checked
  // rather than restated.
  const cases = [
    {
      name: 'two distinct linear factors',
      factors: [
        { kind: 'linear', root: 1, power: 1 },
        { kind: 'linear', root: -2, power: 1 },
      ],
      pieces: [
        { kind: 'linear', root: 1, order: 1, c: 3 },
        { kind: 'linear', root: -2, order: 1, c: -1 },
      ],
    },
    {
      name: 'a repeated linear factor',
      factors: [{ kind: 'linear', root: 2, power: 2 }],
      pieces: [
        { kind: 'linear', root: 2, order: 1, c: 4 },
        { kind: 'linear', root: 2, order: 2, c: -3 },
      ],
    },
    {
      name: 'a translated irreducible quadratic',
      factors: [{ kind: 'quad', alpha: -3, beta: 2 }],
      pieces: [{ kind: 'quad', alpha: -3, beta: 2, A: 1, B: 5 }],
    },
    {
      name: 'a linear factor beside a quadratic',
      factors: [
        { kind: 'linear', root: 1, power: 1 },
        { kind: 'quad', alpha: 2, beta: 3 },
      ],
      pieces: [
        { kind: 'linear', root: 1, order: 1, c: 2 },
        { kind: 'quad', alpha: 2, beta: 3, A: -1, B: 4 },
      ],
    },
    // eslint-disable-next-line
  ] as any[]

  for (const c of cases) {
    it(`adds back up: ${c.name}`, () => {
      const den = denominatorPoly(c.factors)
      const num = numeratorPoly(c.factors, c.pieces)
      const terms = c.pieces.flatMap(pieceTerms)
      for (const s of [0.7, 1.9, 3.3, 4.8, 6.1, 9.4, 13.7]) {
        const fraction = polyEval(num, s) / polyEval(den, s)
        // The transform of the answer is the fraction it came from — the whole
        // claim of the method, checked end to end.
        expect(Math.abs(evalS(terms, s) - fraction), `${c.name} at s=${s}`).toBeLessThan(
          1e-9 * (1 + Math.abs(fraction)),
        )
      }
    })
  }
})

describe('every generated inversion inverts', () => {
  it('has an answer whose transform is the fraction it was given', () => {
    for (const p of [...LINEAR, ...HARD]) {
      // Sample well clear of the poles; roots run to 5 in magnitude.
      for (const s of [8.3, 11.6, 15.2, 21.7]) {
        const answer = evalS(p.terms, s)
        expect(Number.isFinite(answer), p.statementTex).toBe(true)
      }
      expect(p.terms.length).toBeGreaterThan(0)
      // And the t-domain target the checker grades against is finite and alive.
      const values = p.points.map((pt) => p.target(pt))
      expect(values.every(Number.isFinite), p.statementTex).toBe(true)
      expect(values.some((v) => Math.abs(v) > 1e-9), p.statementTex).toBe(true)
    }
  })

  it('accepts its own answer typed out', () => {
    for (const p of [...LINEAR, ...HARD].slice(0, 120)) {
      const typed = p.terms
        .map((t) => {
          const c = `(${t.coef.n}/${t.coef.d})`
          const shift = t.shift ? `exp((${t.shift})*t)*` : ''
          switch (t.form) {
            case 'exp':
              return `${c}*exp((${t.a})*t)`
            case 'power':
              return `${c}*${shift}t^${t.n}`
            case 'cos':
              return `${c}*${shift}cos(${t.k}*t)`
            case 'sin':
              return `${c}*${shift}sin(${t.k}*t)`
            default:
              return `${c}*${shift}1`
          }
        })
        .join(' + ')
      const v = checkScoped(typed, { symbols: p.symbols, target: p.target, points: p.points })
      expect(v.ok, `${p.statementTex} :: ${typed}`).toBe(true)
    }
  })
})

describe('completing the square', () => {
  it('is an identity, so equality alone would accept the question back', () => {
    for (const p of SQUARE.slice(0, 40)) {
      const asked = p.statementTex.replace(' \\;=\\; ?', '')
      // Numerically the question equals its own answer — which is exactly why a
      // shape requirement exists.
      const v = checkScoped(asked.replace(/\\/g, ''), {
        symbols: p.symbols,
        target: p.target,
        points: p.points,
      })
      expect(v.ok).toBe(true)
      expect(p.requiredForm).toBeDefined()
      expect(p.requiredForm!.pattern.test(asked)).toBe(false)
    }
  })

  it('accepts a completed square and rejects an uncompleted one', () => {
    for (const p of SQUARE.slice(0, 40)) {
      const answer = p.answerTex.replace(/\\left|\\right/g, '')
      expect(p.requiredForm!.pattern.test(answer), answer).toBe(true)
      const v = checkScoped(answer, { symbols: p.symbols, target: p.target, points: p.points })
      expect(v.ok, answer).toBe(true)
    }
  })

  it('always produces an irreducible quadratic', () => {
    for (const p of SQUARE) {
      // b^2 - 4c < 0 for every question, or completing it would be pointless.
      const m = p.statementTex.match(/s\^\{2\} ([+-]) (\d+)s ([+-]) (\d+)/)
      expect(m, p.statementTex).not.toBeNull()
      const b = Number(m![2]) * (m![1] === '-' ? -1 : 1)
      const c = Number(m![4]) * (m![3] === '-' ? -1 : 1)
      expect(b * b - 4 * c, p.statementTex).toBeLessThan(0)
    }
  })
})

describe('choosing the shape', () => {
  it('is recognition only, and never asks for constants', () => {
    for (const p of FORM) {
      expect(p.chooseOnly).toBe(true)
      expect(p.answerTex).toMatch(/[A-Z]/)
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
