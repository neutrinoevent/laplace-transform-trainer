/**
 * A paper has to be markable and worth marking: every question typed, every
 * question gradeable, and the six sections actually mixed rather than one
 * section drawn six times.
 */

import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { splitRich } from '../lib/rich'
import { checkScoped } from '../lib/check'
import { ALL_TOPICS, makePaper, TOPIC_NAME, type Paper } from './exam'

const PAPERS: Paper[] = Array.from({ length: 40 }, (_, i) => makePaper({ seed: i + 1 }))

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

describe('a paper', () => {
  it('is the length asked for', () => {
    for (const n of [4, 6, 8, 10]) {
      expect(makePaper({ count: n, seed: 7 }).questions).toHaveLength(n)
    }
  })

  it('spreads across the sections rather than repeating one', () => {
    for (const paper of PAPERS) {
      const topics = new Set(paper.questions.map((q) => q.topic))
      // Six questions from six sections: every one of them, once each.
      expect(topics.size, [...topics].join(',')).toBe(6)
    }
  })

  it('draws every section over enough papers', () => {
    const seen = new Set(PAPERS.flatMap((p) => p.questions.map((q) => q.topic)))
    expect([...seen].sort()).toEqual([...ALL_TOPICS].sort())
  })

  it('renders every statement, answer and worked step', () => {
    for (const paper of PAPERS.slice(0, 12)) {
      for (const q of paper.questions) {
        expect(renders(q.statementTex), q.statementTex).toBe(true)
        expect(renders(q.answerTex), q.answerTex).toBe(true)
        expect(renders(q.prefixTex), q.prefixTex).toBe(true)
        if (q.givenTex) expect(renders(q.givenTex), q.givenTex).toBe(true)
        expect(richRenders(q.question), q.question).toBe(true)
        for (const s of q.derivation) {
          if (s.tex) expect(renders(s.tex), s.tex).toBe(true)
          expect(richRenders(s.text ?? ''), s.text).toBe(true)
        }
        expect(TOPIC_NAME[q.topic]).toBeTruthy()
      }
    }
  })

  /**
   * The one that matters for marking: the grader must accept the answer the
   * paper itself produced as correct. Sampling points that hit a pole, or a target
   * that disagrees with the printed answer, would mark a right answer wrong.
   */
  it('marks its own answer right', () => {
    for (const paper of PAPERS.slice(0, 20)) {
      for (const q of paper.questions) {
        expect(q.points.length, `${q.topic}: ${q.statementTex}`).toBeGreaterThan(3)
        for (const point of q.points) {
          expect(Number.isFinite(q.target(point)), `${q.topic} at ${JSON.stringify(point)}`).toBe(
            true,
          )
        }
      }
    }
  })

  it('grades a wrong answer as wrong', () => {
    for (const paper of PAPERS.slice(0, 10)) {
      for (const q of paper.questions) {
        const v = checkScoped('0', { symbols: q.symbols, target: q.target, points: q.points })
        expect(v.ok, `${q.topic}: ${q.statementTex}`).toBe(false)
      }
    }
  })

  it('carries distractors, so a wrong answer can still be named', () => {
    for (const paper of PAPERS.slice(0, 10)) {
      for (const q of paper.questions) {
        expect(q.choices.length, q.topic).toBeGreaterThan(1)
        expect(q.choices.some((c) => c.why === null)).toBe(true)
      }
    }
  })

  it('reports every question into a progress item', () => {
    for (const paper of PAPERS.slice(0, 10)) {
      for (const q of paper.questions) {
        expect(q.itemIds.length, q.topic).toBeGreaterThan(0)
        for (const id of q.itemIds) expect(id).toMatch(/:/)
      }
    }
  })

  it('never asks a question that cannot be typed', () => {
    for (const paper of PAPERS) {
      for (const q of paper.questions) {
        expect(['s', 't']).toContain(q.symbols.primary)
        expect(q.syntaxNote.length).toBeGreaterThan(4)
      }
    }
  })
})
