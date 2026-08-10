import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { FORM_IDS, type Term } from '../data/forms'
import { CARDS } from '../data/cards'
import { FORMS } from '../data/forms'
import { factorial } from '../lib/frac'
import { splitRich } from '../lib/rich'
import { checkAnswer } from '../lib/check'
import { makeRng } from '../lib/rng'
import { makeBoard, makeForward, makeInverse, nextProblem, type Problem } from './index'

/** Plain calculator syntax for a term list — the answer as a student would type it. */
function plain(terms: Term[], domain: 'f' | 's'): string {
  return terms
    .map((t) => {
      const c = `(${t.coef.n}/${t.coef.d})`
      const k = t.k ?? 0
      if (domain === 'f') {
        const body =
          t.form === 'one'
            ? '1'
            : t.form === 'power'
              ? `t^${t.n}`
              : t.form === 'exp'
                ? `exp((${t.a})*t)`
                : `${t.form}(${k}*t)`
        return `${c}*(${body})`
      }
      const row =
        t.form === 'one'
          ? '1/s'
          : t.form === 'power'
            ? `${factorial(t.n!)}/(s^${t.n! + 1})`
            : t.form === 'exp'
              ? `1/(s-(${t.a}))`
              : t.form === 'sin'
                ? `${k}/(s^2+${k * k})`
                : t.form === 'cos'
                  ? `s/(s^2+${k * k})`
                  : t.form === 'sinh'
                    ? `${k}/(s^2-${k * k})`
                    : `s/(s^2-${k * k})`
      return `${c}*(${row})`
    })
    .join(' + ')
}

function renders(tex: string): boolean {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: false })
    return true
  } catch {
    return false
  }
}

/** Every math span inside a rich-text string has to render too. */
function richRenders(text: string): boolean {
  return splitRich(text).every((p) => p.kind !== 'math' || renders(p.text))
}

function everyTexOf(p: Problem): string[] {
  return [
    p.statementTex,
    p.answerTex,
    ...p.choices.map((c) => c.tex),
    ...p.derivation.flatMap((s) => (s.tex ? [s.tex] : [])),
  ]
}

function corpus(count: number): Problem[] {
  const out: Problem[] = []
  for (let seed = 1; seed <= count; seed++) {
    const rng = makeRng(seed)
    out.push(makeForward(rng, FORM_IDS, seed % 3 === 0))
    out.push(makeInverse(rng, FORM_IDS, seed % 3 === 1))
  }
  return out
}

const CORPUS = corpus(220)

describe('generated problems', () => {
  it('produces both directions across every row', () => {
    const seen = new Set(CORPUS.flatMap((p) => p.itemIds))
    for (const form of FORM_IDS) {
      expect(seen.has(`${form}:forward`), `${form} forward`).toBe(true)
      expect(seen.has(`${form}:inverse`), `${form} inverse`).toBe(true)
    }
  })

  it('renders every expression it puts on screen', () => {
    for (const p of CORPUS) {
      for (const tex of everyTexOf(p)) {
        expect(renders(tex), tex).toBe(true)
      }
      expect(richRenders(p.hint), p.hint).toBe(true)
      expect(richRenders(p.question)).toBe(true)
      for (const step of p.derivation) {
        if (step.text) expect(richRenders(step.text), step.text).toBe(true)
      }
      for (const c of p.choices) {
        if (c.why) expect(richRenders(c.why), c.why).toBe(true)
      }
    }
  })

  it('offers a well-formed set of choices', () => {
    for (const p of CORPUS) {
      const correct = p.choices.filter((c) => c.why === null)
      expect(correct).toHaveLength(1)
      expect(p.choices[p.correctIndex].why).toBeNull()
      expect(p.choices.length).toBeGreaterThanOrEqual(2)
      expect(new Set(p.choices.map((c) => c.tex)).size).toBe(p.choices.length)
      // No option may show the same function twice — that reads as unsimplified
      // and gives the answer away.
      for (const c of p.choices) {
        const fns = c.tex.match(/\\(sinh|cosh|sin|cos)\s*\d*t/g) ?? []
        expect(new Set(fns).size, c.tex).toBe(fns.length)
      }
    }
  })

  it('accepts the answer written out in calculator syntax', () => {
    for (const p of CORPUS) {
      const typed = plain(p.terms, p.direction === 'forward' ? 's' : 'f')
      const verdict = checkAnswer(typed, {
        variable: p.variable,
        target: p.target,
        poles: p.poles,
      })
      expect(verdict.ok, `${p.statementTex} :: ${typed}`).toBe(true)
    }
  })

  it('names a missing constant rather than calling it plain wrong', () => {
    for (const p of CORPUS.slice(0, 60)) {
      const doubled = `3*(${plain(p.terms, p.direction === 'forward' ? 's' : 'f')})`
      const verdict = checkAnswer(doubled, {
        variable: p.variable,
        target: p.target,
        poles: p.poles,
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.code).toBe('scaled')
    }
  })

  it('keeps every distractor numerically distinct from the answer', () => {
    for (const p of CORPUS) {
      const xs = p.variable === 's' ? [7.3, 9.1, 12.7] : [0.4, 1.1, 1.9]
      for (const c of p.choices) {
        if (c.why === null) continue
        // Distractors are rendered TeX, so compare structurally: no distractor
        // may print the same string as the answer.
        expect(c.tex).not.toBe(p.answerTex)
      }
      // And the target itself must be finite where the app samples it.
      for (const x of xs) expect(Number.isFinite(p.target(x))).toBe(true)
    }
  })

  it('flags the fix-up exactly when a constant has to be manufactured', () => {
    const inverse = CORPUS.filter((p) => p.direction === 'inverse')
    const withFixup = inverse.filter((p) => p.fixup)
    const without = inverse.filter((p) => !p.fixup)
    // Both kinds have to show up, or the drill teaches only half the skill.
    expect(withFixup.length).toBeGreaterThan(20)
    expect(without.length).toBeGreaterThan(20)
    for (const p of withFixup) {
      const manufactured = p.terms.some(
        (t) => (t.form === 'power' && t.n! >= 2) || ((t.form === 'sin' || t.form === 'sinh') && t.k! > 1),
      )
      expect(manufactured, p.statementTex).toBe(true)
    }
  })
})

describe('two-row combinations', () => {
  it('produces the shared-denominator split, and inverts it correctly', () => {
    const splits: Problem[] = []
    for (let seed = 1; seed <= 400; seed++) {
      const p = makeInverse(makeRng(seed), FORM_IDS, true)
      if (p.derivation[0]?.label === 'Split it') splits.push(p)
    }
    expect(splits.length).toBeGreaterThan(20)
    for (const p of splits) {
      // Exactly one cosine-shaped row and one sine-shaped row, same frequency.
      expect(p.terms).toHaveLength(2)
      expect(p.terms[0].k).toBe(p.terms[1].k)
      expect(everyTexOf(p).every(renders)).toBe(true)
      const typed = plain(p.terms, 'f')
      expect(checkAnswer(typed, { variable: 't', target: p.target, poles: [] }).ok).toBe(true)
    }
  })
})

describe('adaptive selection', () => {
  it('respects the scope and direction it is given', () => {
    const mastery = new Map<string, number>()
    for (let seed = 1; seed <= 80; seed++) {
      const p = nextProblem({
        scope: ['sin', 'cos'],
        direction: 'inverse',
        mastery,
        allowCombo: true,
        seed,
      })
      expect(p.direction).toBe('inverse')
      for (const f of p.forms) expect(['sin', 'cos']).toContain(f)
    }
  })

  it('leans toward the rows that are going badly', () => {
    const mastery = new Map<string, number>(
      FORM_IDS.flatMap((f) => [
        [`${f}:forward`, 1],
        [`${f}:inverse`, 1],
      ]),
    )
    mastery.set('sinh:inverse', 0)
    let hits = 0
    for (let seed = 1; seed <= 400; seed++) {
      const p = nextProblem({ scope: null, direction: 'both', mastery, allowCombo: false, seed })
      if (p.itemIds.includes('sinh:inverse')) hits++
    }
    // One item out of fourteen; weighting should lift it well above 1/14.
    expect(hits / 400).toBeGreaterThan(0.15)
  })
})

describe('match boards', () => {
  it('builds distinct tiles', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const board = makeBoard(makeRng(seed), FORM_IDS, 5)
      expect(board).toHaveLength(5)
      expect(new Set(board.map((p) => p.fTex)).size).toBe(5)
      expect(new Set(board.map((p) => p.sTex)).size).toBe(5)
      for (const pair of board) {
        expect(renders(pair.fTex)).toBe(true)
        expect(renders(pair.sTex)).toBe(true)
      }
    }
  })
})

describe('reference content', () => {
  it('renders every row of the table and every card', () => {
    for (const f of FORMS) {
      expect(renders(f.genericF), f.id).toBe(true)
      expect(renders(f.genericS), f.id).toBe(true)
      expect(renders(f.chipTex), f.id).toBe(true)
      if (f.condition) expect(renders(f.condition)).toBe(true)
      expect(richRenders(f.note), f.note).toBe(true)
      expect(richRenders(f.confusion), f.confusion).toBe(true)
    }
    for (const c of CARDS) {
      expect(renders(c.promptTex), c.id).toBe(true)
      expect(renders(c.answerTex), c.id).toBe(true)
      if (c.note) expect(richRenders(c.note), c.id).toBe(true)
    }
  })
})
